import { test } from "node:test";
import assert from "node:assert/strict";
import { breadcrumbLd, homeLd, ldJson, llmsFullTxt, llmsTxt, modLd, modsIndexLd, progressJson } from "./machine.ts";
import { PROJECTS } from "./projects.ts";

const SITE = "https://openrac.dev";
const progress = {
  rac1: { functions: { done: 2974, total: 5109 }, code: { done: 838628, total: 3712808 }, data: { done: 3984, total: 699072 }, source: "progress/report.json", stale: false },
  gc: { functions: { done: 5269, total: null }, code: { done: 308608, total: 48788176 }, source: "snapshot 2026-10-05", stale: true },
};
const mod = { id: "lock-strafe", name: "Lock-strafe", author: "OpenRAC contributors", description: "Strafe as in the later games." };

test("progress.json lists every project with the shared measure", () => {
  const j = progressJson(progress);
  assert.equal(j.projects.length, PROJECTS.length);
  const rac1 = j.projects.find((p) => p.id === "rac1")!;
  assert.equal(rac1.repository, "https://github.com/OpenRAC/rac1-decomp");
  assert.equal(rac1.region, "PAL");
  assert.deepEqual(rac1.maintainers, ["Lynder063", "Veradictus"]);
  assert.equal(rac1.progress?.codePercent, 22.59);
  assert.equal(rac1.progress?.dataPercent, 0.57);
  assert.equal(j.projects.find((p) => p.id === "gc")!.progress?.data, null); // no data measure: null, not 0
  assert.equal(j.projects.find((p) => p.id === "gc")!.progress?.functions.total, null);
  assert.equal(j.projects.find((p) => p.id === "gc")!.progress?.snapshot, true);
  assert.equal(j.projects.find((p) => p.id === "deadlocked")!.phase, "active");
  assert.equal(j.projects.find((p) => p.id === "sm")!.phase, "active");
  assert.equal(j.projects.find((p) => p.id === "uya")!.progress, null); // not loaded: no invented numbers
});

test("Up Your Arsenal is listed as the PAL project of Lynder063 and Veradictus", () => {
  const uya = PROJECTS.find((p) => p.id === "uya")!;
  assert.equal(uya.repo, "OpenRAC/rac3-decomp");
  assert.equal(uya.region, "PAL");
  assert.deepEqual(uya.maintainers, ["Lynder063", "Veradictus"]);
  assert.equal(uya.contributing, "https://github.com/OpenRAC/rac3-decomp/blob/master/CONTRIBUTING.md");
});

test("Deadlocked is listed under its new repository name", () => {
  const dl = PROJECTS.find((p) => p.id === "deadlocked")!;
  assert.equal(dl.repo, "OpenRAC/rac4-decomp");
  assert.equal(dl.contributing, "https://github.com/OpenRAC/rac4-decomp/blob/main/CONTRIBUTING.md");
});

test("llms.txt names every project, its numbers and the mods", () => {
  const t = llmsTxt(SITE, progress, [mod]);
  assert.match(t, /^# OpenRAC\n\n> /);
  for (const p of PROJECTS) if (p.repo) assert.ok(t.includes(`https://github.com/${p.repo}`), p.id);
  assert.ok(t.includes("22.59% of code matched (838,628 of 3,712,808 bytes), 0.57% of data matched."));
  assert.ok(t.includes("last known snapshot"));
  assert.ok(!t.includes("research phase")); // no project is in its research phase any more
  assert.ok(t.includes("Maintained by [@Lynder063](https://github.com/Lynder063), [@Veradictus](https://github.com/Veradictus)."));
  assert.ok(t.includes(`- [Lock-strafe](${SITE}/mods/lock-strafe) by OpenRAC contributors: Strafe as in the later games.`));
  assert.ok(t.includes(`[Mods](${SITE}/mods)`));
  assert.ok(!t.includes("/blog"));
  assert.ok(!llmsTxt(SITE, progress, []).includes("## Mods"));
});

test("llms-full.txt carries the FAQ and the mods", () => {
  const t = llmsFullTxt(SITE, progress, [["Is this a port?", "No."]], [mod]);
  assert.ok(t.includes("### Is this a port?\n\nNo."));
  assert.ok(t.includes("## Mods"));
  assert.ok(!t.includes("/blog"));
});

test("JSON-LD describes the projects and cannot close its script tag", () => {
  const home = homeLd(SITE);
  const list = home["@graph"][1] as { itemListElement: unknown[] };
  assert.equal(list.itemListElement.length, PROJECTS.filter((p) => p.repo).length);
  assert.equal(home["@graph"].length, 3);

  const withLauncher = homeLd(SITE, {
    version: "0.9.0",
    date: "2026-10-25T14:55:38Z",
    url: "https://github.com/OpenRAC/OpenRAC/releases/tag/launcher-v0.9.0",
    platforms: [
      { id: "windows", name: "Windows", supports: [], main: { label: "Installer (.exe)", url: "https://x/a.exe", size: 1 }, others: [] },
      { id: "macos", name: "macOS", supports: [], main: null, others: [] },
      { id: "linux", name: "Linux", supports: [], main: { label: "AppImage", url: "https://x/a.AppImage", size: 1 }, others: [] },
    ],
  });
  const app = withLauncher["@graph"][3] as Record<string, unknown>;
  assert.equal(app["@type"], "SoftwareApplication");
  assert.equal(app.softwareVersion, "0.9.0");
  assert.equal(app.operatingSystem, "Windows, Linux");
  const m = modLd(SITE, {
    ...mod,
    repo: "https://github.com/OpenRAC/rac1-mods",
    created: "2026-09-15T12:00:00Z",
    updated: "2026-10-20T12:00:00Z",
    version: "1.2.0",
    platforms: ["linux-x86_64", "windows-x86_64", "macos-arm64"],
    screenshots: ["https://openrac.dev/mods/media/a-960.webp"],
    videos: [{ youtube: "dQw4w9WgXcQ", caption: "Trailer" }],
    game: "Ratchet & Clank",
  });
  const modApp = m["@graph"][0] as Record<string, unknown>;
  assert.equal(modApp["@type"], "SoftwareApplication");
  assert.equal(modApp.operatingSystem, "Linux, Windows, macOS");
  assert.ok(!("aggregateRating" in modApp)); // no invented ratings
  const video = m["@graph"][1] as Record<string, unknown>;
  assert.equal(video["@type"], "VideoObject");
  assert.equal(video.embedUrl, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(m["@graph"][2]["@type"], "BreadcrumbList");

  const modList = modsIndexLd(SITE, [mod]);
  assert.equal(modList["@graph"][0]["@type"], "CollectionPage");

  const crumbs = breadcrumbLd([{ name: "A", url: "https://a" }, { name: "B", url: "https://b" }]);
  assert.equal(crumbs.itemListElement.length, 2);
  assert.equal(crumbs.itemListElement[0].position, 1);
  assert.equal(crumbs.itemListElement[1].name, "B");

  assert.ok(!ldJson({ x: "</script><script>alert(1)</script>" }).includes("<"));
});
