import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { checkIndex, indexUrls, loadCatalog, merge, withRetry, type Fetcher } from "./index.ts";
import {
  gameOf,
  ago,
  apiFits,
  changeSet,
  compareSemver,
  dependents,
  formatCount,
  installUrl,
  intentUrl,
  isRevoked,
  latest,
  meets,
  newestFitting,
  repoLinks,
  sortMods,
  trendingScore,
  worksWith,
} from "./logic.ts";
import { closest, highlight, prepare, search } from "./search.ts";
import type { ModIndex } from "./types.ts";

const FIXTURE_URL = new URL("./__fixtures__/index.json", import.meta.url);
const raw = readFileSync(FIXTURE_URL, "utf8");
const fixture = JSON.parse(raw) as ModIndex;
const NOW = Date.parse("2026-10-31T12:00:00Z");
const catalog = merge([fixture], NOW);
const mod = (id: string) => catalog.mods.find((m) => m.id === id)!;

test("the fixture is the shared one (same bytes as openrac-mods/tools/fixtures/index/index.json)", () => {
  // Change the fixture in openrac-mods first, then copy it here and update this hash.
  assert.equal(createHash("sha256").update(raw).digest("hex"), "b125b752433481692bc25e873c28808ec1d03ee9bed8b0dee41b6bf9729b582a");
});

test("semver: order, pre-releases first, constraints", () => {
  assert.ok(compareSemver("1.10.0", "1.9.0") > 0);
  assert.ok(compareSemver("2.0.0-beta.1", "2.0.0") < 0);
  assert.ok(compareSemver("2.0.0-beta.2", "2.0.0-beta.10") < 0);
  assert.ok(meets("1.2.0", ">=1.1.0"));
  assert.ok(!meets("1.0.9", ">=1.1.0"));
  assert.ok(meets("1.2.0", "=1.2.0"));
  assert.ok(meets("9.9.9", undefined));
  assert.ok(!meets("1.2.0", "~1.2")); // not a form the manifest allows
});

test("api fit follows the launcher: same major, minor no newer", () => {
  assert.ok(apiFits("1.0", "1.10"));
  assert.ok(apiFits("1.10", "1.10"));
  assert.ok(!apiFits("1.11", "1.10"));
  assert.ok(!apiFits("2.0", "1.10"));
  assert.ok(apiFits(null, "1.10")); // packs and data packs
  assert.ok(!apiFits("1.0", null));
});

test("release or dev build: from the index's ports", () => {
  assert.equal(worksWith(mod("lock-strafe"), catalog.ports, catalog.revoked), "release");
  assert.equal(worksWith(mod("archipelago"), catalog.ports, catalog.revoked), "dev");
  // 1.3.0 still fits a release, so the randomizer works there (an older version)
  assert.equal(worksWith(mod("item-randomizer"), catalog.ports, catalog.revoked), "release");
  assert.equal(newestFitting(mod("item-randomizer"), catalog.revoked, "1.10")?.version, "1.3.0");
  assert.equal(newestFitting(mod("item-randomizer"), catalog.revoked, "1.11")?.version, "1.4.0");
  assert.equal(newestFitting(mod("item-randomizer"), catalog.revoked, "1.11", true)?.version, "2.0.0-beta.1");
});

test("latest skips pre-releases and revoked versions", () => {
  assert.equal(latest(mod("item-randomizer"), catalog.revoked)?.version, "1.4.0");
  assert.ok(isRevoked(catalog.revoked, "ammo-max", "1.0.0"));
  assert.equal(latest(mod("ammo-max"), catalog.revoked)?.version, "1.0.1");
});

test("change set: dependencies first, auto-marked, conflicts and extras", () => {
  const cs = changeSet(catalog.mods, ["lock-strafe"], catalog.revoked);
  assert.deepEqual(
    cs.install.map((x) => [x.mod.id, x.auto]),
    [
      ["camera-base", true],
      ["camera-tweaks", true],
      ["lock-strafe", false],
    ],
  );
  assert.deepEqual(cs.conflicts, []);
  assert.deepEqual(cs.recommends.map((m) => m.id), ["xbox-icons"]); // camera-tweaks recommends it; lock-strafe's own recommend is installed
  assert.deepEqual(cs.suggests.map((m) => m.id), []); // xbox-icons is already recommended

  const both = changeSet(catalog.mods, ["lock-strafe", "classic-controls"], catalog.revoked);
  assert.equal(both.conflicts.length, 1);
  assert.equal(both.conflicts[0].reason, "both take L2 and R2");

  const pack = changeSet(catalog.mods, ["randomizer-pack"], catalog.revoked);
  assert.deepEqual(new Set(pack.install.map((x) => x.mod.id)), new Set(["item-randomizer", "camera-base", "camera-tweaks", "xbox-icons", "randomizer-pack"]));
  assert.ok(pack.install.findIndex((x) => x.mod.id === "camera-base") < pack.install.findIndex((x) => x.mod.id === "camera-tweaks"));

  assert.deepEqual(changeSet(catalog.mods, ["nope"], catalog.revoked).missing, ["nope"]);
});

test("used by", () => {
  assert.deepEqual(dependents(catalog.mods, "camera-base").map((m) => m.id), ["camera-tweaks"]);
  assert.deepEqual(new Set(dependents(catalog.mods, "item-randomizer").map((m) => m.id)), new Set(["archipelago", "randomizer-pack"]));
});

test("trending lets a new mod with uptake pass an old one with a big total", () => {
  const old = { downloads7d: 10, updated: "2025-01-01T00:00:00Z" };
  const fresh = { downloads7d: 10, updated: "2026-10-30T00:00:00Z" };
  assert.ok(trendingScore(fresh, NOW) > trendingScore(old, NOW));
  const order = sortMods(catalog.mods, "trending", NOW).map((m) => m.id);
  assert.equal(order[0], "item-randomizer"); // 640 in a week, a beta two days ago
  assert.ok(order.indexOf("archipelago") < order.indexOf("lock-strafe")); // 400 this week beats a bigger total
  assert.deepEqual(sortMods(catalog.mods, "name", NOW)[0].id, "ammo-max");
  assert.equal(sortMods(catalog.mods, "downloads", NOW)[0].id, "item-randomizer");
});

test("install links: short form, list form, Android intent", () => {
  assert.equal(installUrl([{ id: "lock-strafe" }]), "openrac://install/lock-strafe");
  assert.equal(installUrl([{ id: "a", version: "1.2.0" }, { id: "b" }]), "openrac://install?mods=a@1.2.0,b");
  assert.equal(installUrl([{ id: "a" }], { game: "rac1", disc: "pal" }), "openrac://install?mods=a&game=rac1&disc=pal");
  const intent = intentUrl([{ id: "a" }], "https://openrac.dev/#download");
  assert.match(intent, /^intent:\/\/install\?mods=a#Intent;scheme=openrac;package=dev\.openrac\.launcher;S\.browser_fallback_url=https%3A%2F%2Fopenrac\.dev%2F%23download;end$/);
});

test("repository links: the page text's links read next to its file, changelogs' in the mod's folder", () => {
  const repo = "https://github.com/a/b";
  const at = "https://github.com/a/b/blob/m-v1.0.0/mods/m/";
  // No readmeFile (an older index, a modpack) or README.md: as before, everything in the mod's folder, no extra link.
  assert.deepEqual(repoLinks({ repo, path: "mods/m" }, "m-v1.0.0"), { folder: at, page: at });
  assert.deepEqual(repoLinks({ repo, path: "/mods/m/", readmeFile: "README.md" }, "m-v1.0.0"), { folder: at, page: at });
  assert.deepEqual(repoLinks({ repo: `${repo}/`, path: "" }), { folder: "https://github.com/a/b/blob/HEAD/", page: "https://github.com/a/b/blob/HEAD/" });
  // Another file: its own folder for the text, and the README.md linked.
  assert.deepEqual(repoLinks({ repo, path: "mods/m", readmeFile: "HUB.md" }, "m-v1.0.0"), { folder: at, page: at, readme: `${at}README.md` });
  assert.deepEqual(repoLinks({ repo, path: "mods/m", readmeFile: "docs/players/HUB.md" }, "m-v1.0.0"), { folder: at, page: `${at}docs/players/`, readme: `${at}README.md` });
  assert.deepEqual(repoLinks({ repo, path: "", readmeFile: "docs/HUB.md" }, ""), { folder: "https://github.com/a/b/blob/HEAD/", page: "https://github.com/a/b/blob/HEAD/docs/", readme: "https://github.com/a/b/blob/HEAD/README.md" });
  // A name the index build would refuse (another index can send anything) counts as README.md.
  for (const readmeFile of ["../x.md", "docs/../../x.md", "/HUB.md", "HUB.txt", "https://x/HUB.md", "a\\b.md", ""]) {
    assert.deepEqual(repoLinks({ repo, path: "mods/m", readmeFile }, "m-v1.0.0"), { folder: at, page: at }, readmeFile);
  }
  // The shared fixture records README.md for every mod but the pack.
  for (const m of fixture.mods) assert.equal(m.readmeFile, m.type === "pack" ? undefined : "README.md", m.id);
});

test("words", () => {
  assert.equal(formatCount(999), "999");
  assert.equal(formatCount(3412), "3.4k");
  assert.equal(formatCount(12_400), "12k");
  assert.equal(formatCount(1_500_000), "1.5M");
  assert.equal(ago("2026-10-31T00:00:00Z", NOW), "today");
  assert.equal(ago("2026-10-28T00:00:00Z", NOW), "3d ago");
  assert.equal(ago("2026-09-20T00:00:00Z", NOW), "5w ago");
  assert.equal(ago("2026-07-01T00:00:00Z", NOW), "4mo ago");
});

test("search: name first, tags, typo forgiven, AND across words", () => {
  const p = catalog.mods.map(prepare);
  assert.equal(search(p, "lock")[0].id, "lock-strafe");
  assert.equal(search(p, "camera")[0].name, "Camera base"); // both camera mods, name prefix ties keep index order
  assert.ok(search(p, "randomizer").some((m) => m.id === "archipelago")); // by tag
  assert.equal(search(p, "radnomizer")[0]?.id, "item-randomizer"); // one swap forgiven
  assert.deepEqual(search(p, "camera xbox").map((m) => m.id), ["randomizer-pack"]); // only the pack names both
  assert.deepEqual(search(p, "camera zzzz"), []);
  assert.equal(search(p, "").length, catalog.mods.length);
  assert.equal(search(p, "Ratchet & Clank")[0]?.id, "archipelago"); // description, & read as "and"
  assert.equal(closest(catalog.mods, "lok strafe")?.id, "lock-strafe");
  assert.deepEqual(highlight("Lock-strafe", "lock"), [
    { text: "Lock", hit: true },
    { text: "-strafe", hit: false },
  ]);
});

test("index loading: last good copy on failure, never an older serial, never throws", async () => {
  const memory = new Map();
  const ok: Fetcher = async () => structuredClone(fixture);
  const first = await loadCatalog(["u"], ok, NOW, memory);
  assert.equal(first.error, undefined);
  assert.equal(first.catalog.mods.length, fixture.mods.length);
  assert.equal(first.catalog.stale, false);

  const down: Fetcher = async () => {
    throw new Error("boom");
  };
  const second = await loadCatalog(["u"], down, NOW, memory);
  assert.equal(second.catalog.mods.length, fixture.mods.length);
  assert.equal(second.catalog.stale, true);
  assert.equal(second.error, "parse");

  const older: Fetcher = async () => ({ ...structuredClone(fixture), serial: 1, mods: [] });
  const third = await loadCatalog(["u"], older, NOW, memory);
  assert.equal(third.catalog.mods.length, fixture.mods.length); // the older one is ignored

  const empty = await loadCatalog(["u"], down, NOW, new Map());
  assert.equal(empty.catalog.mods.length, 0);
  assert.equal(empty.catalog.stale, true);

  const expired = await loadCatalog(["u"], ok, Date.parse("2026-12-01T00:00:00Z"), new Map());
  assert.equal(expired.catalog.stale, true);
});

test("community.json is optional: its failure is no error, its mods join the list", async () => {
  const main = "https://x.test/index/index.json";
  const side = "https://x.test/index/community.json";
  const extra = { ...structuredClone(fixture.mods[0]), id: "new-hud", trust: "unchecked" as const };
  const both: Fetcher = async (url) => (url === side ? { ...structuredClone(fixture), mods: [extra] } : structuredClone(fixture));
  const got = await loadCatalog([main, side], both, NOW, new Map());
  assert.equal(got.catalog.mods.length, fixture.mods.length + 1);
  assert.equal(got.catalog.mods.find((m) => m.id === "new-hud")?.indexBase, "https://x.test/index/");
  const onlyMain: Fetcher = async (url) => {
    if (url === side) throw new Error("404");
    return structuredClone(fixture);
  };
  const quiet = await loadCatalog([main, side], onlyMain, NOW, new Map());
  assert.equal(quiet.error, undefined);
  assert.equal(quiet.catalog.stale, false);
});

test("labels: held mods are not shown; the label reaches the card", async () => {
  const { isShown } = await import("./logic.ts");
  const { slim } = await import("./slim.ts");
  const m = { ...mod("lock-strafe"), trust: "verified" as const, held: { version: "9.9.9", reasons: ["mentions cmd.exe"] } };
  assert.equal(isShown(m, []), false);
  assert.equal(isShown(mod("lock-strafe"), []), true);
  const v = { ...m.versions[0], scan: { labels: ["Network"], new: [] } };
  const s = slim({ ...m, versions: [v, ...m.versions.slice(1)] }, catalog);
  assert.equal(s.trust, "verified");
  assert.deepEqual(s.reach, ["Network"]);
  assert.equal("trust" in slim(mod("xbox-icons"), catalog), false); // an older index says nothing
});

test("details: filled from the file only when its SHA-256 matches", async () => {
  const { withDetails } = await import("./details.ts");
  const body = new TextEncoder().encode(JSON.stringify({ id: "ammo-max", readme: "Long text", versions: [{ version: "1.0.1", changelog: "Fixed" }] }));
  const sha = createHash("sha256").update(body).digest("hex");
  const bare = { ...mod("ammo-max"), readme: "", versions: mod("ammo-max").versions.map((v) => ({ ...v, changelog: "" })), indexBase: "https://x.test/", details: { asset: "details-ammo-max.json", sha256: sha } };
  const filled = await withDetails(bare, async () => body);
  assert.equal(filled.readme, "Long text");
  assert.equal(filled.versions.find((v) => v.version === "1.0.1")?.changelog, "Fixed");
  const swapped = await withDetails(bare, async () => new TextEncoder().encode('{"id":"ammo-max","readme":"evil"}'));
  assert.equal(swapped.readme, "");
  // A name that is not a plain file name is never fetched.
  let asked = false;
  await withDetails({ ...bare, details: { asset: "../x.json", sha256: sha } }, async () => ((asked = true), body));
  assert.equal(asked, false);
});

test("index shape is checked; extra fields are fine", () => {
  assert.throws(() => checkIndex({ format: 2, mods: [] }));
  assert.throws(() => checkIndex({ format: 1, media: "x", mods: [{ id: "a" }] }));
  assert.equal(checkIndex({ ...fixture, extra: true }).mods.length, fixture.mods.length);
});

test("merge: first index keeps an id; media base travels with the mod", () => {
  const other = { ...structuredClone(fixture), media: "https://other/", mods: [{ ...fixture.mods[0], name: "Dup" }] };
  const m = merge([fixture, other], NOW);
  assert.equal(m.mods.length, fixture.mods.length);
  assert.equal(m.mods[0].mediaBase, fixture.media);
});

test("MOD_INDEXES is a comma list with a default", () => {
  assert.deepEqual(indexUrls(undefined), [
    "https://github.com/OpenRAC/openrac-mods/releases/download/index/index.json",
    "https://github.com/OpenRAC/openrac-mods/releases/download/index/community.json",
  ]);
  assert.deepEqual(indexUrls(" a , ,b"), ["a", "b"]);
});

test("retries only what may pass, with a capped random wait", async () => {
  const waits: number[] = [];
  let n = 0;
  const flaky = async () => {
    if (n++ < 2) throw Object.assign(new (class extends Error {})(), {});
    return 1;
  };
  // A plain Error is not retried
  await assert.rejects(withRetry(flaky, 2, 250, 2000, async (ms) => void waits.push(ms)));
  assert.equal(waits.length, 0);
});

test("media: only names the index lists, never a path", async () => {
  const { findMedia } = await import("./media.ts");
  const shot = mod("lock-strafe").media.screenshots[0];
  const ok = findMedia(catalog.mods, `${shot.hash}-${shot.widths[0]}.avif`);
  assert.equal(ok?.url, `${fixture.media}${shot.hash}-${shot.widths[0]}.avif`);
  assert.equal(ok?.type, "image/avif");
  assert.equal(findMedia(catalog.mods, `${shot.hash}-123.avif`), undefined); // a width it does not have
  assert.equal(findMedia(catalog.mods, "000000000000-480.webp"), undefined);
  assert.equal(findMedia(catalog.mods, `..%2f${shot.hash}-480.webp`), undefined);
  assert.equal(findMedia(catalog.mods, `${shot.hash}-480.svg`), undefined);
});

test("slim: only a stated yes reaches the card as AI-assisted", async () => {
  const { slim } = await import("./slim.ts");
  const byId = new Map(catalog.mods.map((m) => [m.id, slim(m, catalog)]));
  assert.equal(byId.get("lock-strafe")?.aiAssisted, true);
  assert.equal("aiAssisted" in byId.get("xbox-icons")!, false); // stated no
  assert.equal("aiAssisted" in byId.get("ammo-max")!, false); // not stated
});

test("slim: small per mod, no versions, files or README", async () => {
  const { slim, slimChangeSet, averageColor } = await import("./slim.ts");
  const s = catalog.mods.map((m) => slim(m, catalog));
  for (const m of s) {
    assert.ok(!("versions" in m) && !("readme" in m) && !("files" in m));
    assert.ok(JSON.stringify(m).length < 1600, `${m.id} is ${JSON.stringify(m).length} bytes`);
  }
  assert.match(averageColor("3OcRJYB4d3h/iIeHeEh3eIhw+j3A"), /^rgb\(\d+ \d+ \d+\)$/);
  assert.equal(averageColor("!!"), "#1e1e1e");
  const cs = slimChangeSet(s, ["lock-strafe", "classic-controls"]);
  assert.equal(cs.conflicts.length, 1);
  assert.deepEqual(cs.native.map((m) => m.id), ["lock-strafe"]);
  assert.equal(s.find((m) => m.id === "archipelago")!.works, "dev");
});

test("shared setup links: exact versions only, nothing guessed", async () => {
  const { parseSetup } = await import("./logic.ts");
  assert.deepEqual(parseSetup("a@1.2.0,b@2.0.0-beta.1"), [
    { id: "a", version: "1.2.0" },
    { id: "b", version: "2.0.0-beta.1" },
  ]);
  assert.deepEqual(parseSetup("a,b@>=1.0.0,C@1.0.0,../x@1.0.0,a@1.0.0,a@2.0.0"), [{ id: "a", version: "1.0.0" }]);
  assert.equal(parseSetup(Array.from({ length: 40 }, (_, i) => `m${i}@1.0.0`).join(",")).length, 32);
  assert.deepEqual(parseSetup(undefined), []);
});

test("discussion: latest comments shaped, hidden ones left out, failures quiet", async () => {
  const { getDiscussion, toDiscussion } = await import("./discussion.ts");
  const raw = {
    data: {
      repository: {
        discussion: {
          url: "https://github.com/OpenRAC/openrac-mods/discussions/12",
          comments: {
            totalCount: 3,
            nodes: [
              { url: "u1", createdAt: "2026-10-01T00:00:00Z", body: "first", isMinimized: false, author: { login: "a", avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4" } },
              { url: "u2", createdAt: "2026-10-02T00:00:00Z", body: "spam", isMinimized: true, author: { login: "b", avatarUrl: "x" } },
              { url: "u3", createdAt: "2026-10-03T00:00:00Z", body: "latest", isMinimized: false, author: { login: "c", avatarUrl: "https://evil.example/a.png" } },
            ],
          },
        },
      },
    },
  };
  const d = toDiscussion(raw)!;
  assert.deepEqual(d.comments.map((c) => c.body), ["latest", "first"]); // newest first, hidden one gone
  assert.equal(d.comments[0].avatar, undefined); // only GitHub's avatar host
  assert.equal(await getDiscussion("https://github.com/OpenRAC/openrac-mods", 12, async () => raw), (await getDiscussion("https://github.com/OpenRAC/openrac-mods", 12, async () => raw)));
  assert.equal(await getDiscussion("https://github.com/OpenRAC/openrac-mods", 99, async () => { throw new Error("down"); }), null);
  assert.equal(await getDiscussion("https://github.com/OpenRAC/openrac-mods", undefined, async () => raw), null);
});

test("media folder: written once, read back, names outside the pattern never touch disk", async () => {
  const { readCached, writeCached } = await import("./media.ts");
  const { mkdtemp, readdir } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "mods-media-"));
  const name = "a1b2c3d4e5f6-960.webp";
  assert.equal(await readCached(dir, name), null);
  await writeCached(dir, name, new Uint8Array([1, 2, 3]));
  assert.deepEqual([...(await readCached(dir, name))!], [1, 2, 3]);
  assert.deepEqual(await readdir(dir), [name]); // no temporary file left behind
  await writeCached(dir, "../escape-960.webp", new Uint8Array([9]));
  assert.equal(await readCached(dir, "../escape-960.webp"), null);
  assert.equal(await readCached(undefined, name), null); // no folder set: never cached
});

test("Next's own render signals pass through; only real failures fall back", async () => {
  const signal = Object.assign(new Error("Dynamic server usage"), { digest: "DYNAMIC_SERVER_USAGE" });
  await assert.rejects(loadCatalog(["u"], async () => { throw signal; }, NOW, new Map()), (e) => e === signal);
});

test("gameOf names the game only when every mod shares one", () => {
  assert.equal(gameOf({ rac1: ["pal"] }), "rac1");
  assert.equal(gameOf({ rac1: ["pal"] }, { rac1: ["ntsc"] }), "rac1");
  assert.equal(gameOf({ rac1: ["pal"], rac2: ["pal"] }), undefined);
  assert.equal(gameOf({ rac1: [] }, { rac2: [] }), undefined);
  assert.equal(gameOf(), undefined);
});
