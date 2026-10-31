import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Breaker, RateLimiter, clientKey } from "./guard.ts";
import { merge } from "./index.ts";
import { checkSubmission, issueUrl, parseRepo, type GitHubGet } from "./submit.ts";
import type { ModIndex } from "./types.ts";

const fixture = JSON.parse(readFileSync(new URL("./__fixtures__/index.json", import.meta.url), "utf8")) as ModIndex;
const listed = merge([fixture], Date.parse("2026-10-31T12:00:00Z")).mods;

test("repository addresses: github.com only, nothing else reachable", () => {
  assert.deepEqual(parseRepo("https://github.com/you/big-jump"), { owner: "you", repo: "big-jump" });
  assert.deepEqual(parseRepo("https://github.com/you/big-jump.git/"), { owner: "you", repo: "big-jump" });
  for (const bad of [
    "http://169.254.169.254/latest",
    "http://github.com/you/x",
    "https://github.com.evil.com/you/x",
    "https://user@github.com/you/x",
    "https://github.com:8443/you/x",
    "https://github.com/you/x/tree/main",
    "https://github.com/you/..",
    "https://github.com/-you/x",
    "github.com/you/x",
  ])
    assert.equal(parseRepo(bad), null, bad);
});

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64");

/** A fake GitHub: one public repo with one native mod and a release for Linux. */
function fakeGitHub(manifest: object, assets: string[], repo: object = { private: false, default_branch: "main" }): { get: GitHubGet; calls: string[] } {
  const calls: string[] = [];
  const get: GitHubGet = async (path) => {
    calls.push(path);
    if (path === "/repos/you/big-jump") return repo;
    if (path.startsWith("/repos/you/big-jump/git/trees/")) return { tree: [{ path: "openrac-mod.json", type: "blob" }, { path: "src/main.c", type: "blob" }] };
    if (path === "/repos/you/big-jump/releases/latest") return { tag_name: "v1.0.0", assets: assets.map((name) => ({ name })) };
    if (path === "/repos/you/big-jump/contents/openrac-mod.json") return { content: b64(manifest) };
    return null;
  };
  return { get, calls };
}

const good = { id: "big-jump", name: "Big jump", version: "1.0.0", api: "1.0", games: { rac1: ["pal"] }, plugin: { "linux-x86_64": "lib/x.so" }, requires: [{ id: "camera-base" }] };

test("a ready repository passes every check", async () => {
  const { get, calls } = fakeGitHub(good, ["big-jump-1.0.0-linux-x86_64.zip", "SHA256SUMS"]);
  const r = await checkSubmission("https://github.com/you/big-jump", get, listed);
  assert.ok(!("error" in r));
  assert.equal(r.ready, true, JSON.stringify(r, null, 1));
  assert.equal(r.mods[0].id, "big-jump");
  assert.ok(calls.every((c) => c.startsWith("/repos/you/big-jump")));
});

test("each problem comes with its fix", async () => {
  const { get } = fakeGitHub({ ...good, id: "lock-strafe", version: "1.0", requires: [{ id: "nope" }] }, []);
  const r = await checkSubmission("https://github.com/you/big-jump", get, listed);
  assert.ok(!("error" in r));
  assert.equal(r.ready, false);
  const failed = r.mods[0].checks.filter((c) => !c.ok);
  assert.ok(failed.some((c) => c.label.includes("version")));
  assert.ok(failed.some((c) => c.label === "The id is free"));
  assert.ok(failed.some((c) => c.fix?.includes("nope")));
  assert.ok(failed.some((c) => c.label.includes("archives")));
  assert.ok(failed.every((c) => c.fix));
});

test("a private or missing repository stops early", async () => {
  const priv = await checkSubmission("https://github.com/you/big-jump", fakeGitHub(good, [], { private: true }).get, listed);
  assert.ok(!("error" in priv) && !priv.ready && priv.mods.length === 0);
  const gone = await checkSubmission("https://github.com/you/other", async () => null, listed);
  assert.ok(!("error" in gone) && gone.checks[0].fix?.includes("No repository"));
  const bad = await checkSubmission("https://evil.example/x/y", async () => assert.fail("must not call"), listed);
  assert.ok("error" in bad);
});

test("the submission form opens filled in, empty fields left out", () => {
  const u = new URL(issueUrl("https://github.com/OpenRAC/rac1-mods", { kind: "Mod", repo: "https://github.com/you/big-jump", mods: "big-jump", tags: "", title: "Submit mod: big-jump" }));
  assert.equal(u.pathname, "/OpenRAC/rac1-mods/issues/new");
  assert.equal(u.searchParams.get("template"), "submit-mod.yml");
  assert.equal(u.searchParams.get("repo"), "https://github.com/you/big-jump");
  assert.equal(u.searchParams.has("tags"), false);
});

test("rate limiter: a burst, then one per interval", () => {
  const rl = new RateLimiter(3, 1000);
  assert.deepEqual([0, 0, 0, 0].map(() => rl.take("a", 0)), [true, true, true, false]);
  assert.equal(rl.take("b", 0), true); // per visitor
  assert.equal(rl.take("a", 1000), true);
  assert.equal(rl.take("a", 1000), false);
});

test("breaker: opens after repeated failures, lets one probe through later", () => {
  const b = new Breaker(3, 60_000, 30_000);
  for (let i = 0; i < 3; i++) b.failure(i);
  assert.equal(b.allow(10), false);
  assert.equal(b.allow(30_010), true); // the probe
  assert.equal(b.allow(30_011), false); // only one at a time
  b.success();
  assert.equal(b.allow(30_012), true);
});

test("the client key is the proxy's entry, not one a client chose", () => {
  assert.equal(clientKey(new Headers({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" })), "1.2.3.4");
  assert.equal(clientKey(new Headers()), "local");
});

test("a token GitHub refuses is dropped: the request is made again without it", async () => {
  const { githubApi, resetGithubToken } = await import("./guard.ts");
  const real = globalThis.fetch;
  const seen: (string | undefined)[] = [];
  const errors: string[] = [];
  const realError = console.error;
  console.error = (m: string) => void errors.push(m);
  process.env.GITHUB_TOKEN = "github_pat_test \r";
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    const auth = (init.headers as Record<string, string>).Authorization;
    seen.push(auth);
    if (auth) return new Response(JSON.stringify({ message: "The 'OpenRAC' organization forbids access via a fine-grained personal access tokens" }), { status: 403, headers: { "x-ratelimit-remaining": "4800" } });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    resetGithubToken();
    const res = await githubApi("https://api.github.com/repos/OpenRAC/rac1-mods", {}, 1000);
    assert.equal(res.status, 200);
    assert.deepEqual(seen, ["Bearer github_pat_test", undefined]); // trimmed, then without
    assert.match(errors[0], /github_token_refused.*forbids access/);
    assert.ok(!errors[0].includes("github_pat_test"));
    await githubApi("https://api.github.com/x", {}, 2000); // within ten minutes: no token at all
    assert.equal(seen[2], undefined);
    // A real rate limit (nothing left) is not a refused token: no retry.
    resetGithubToken();
    globalThis.fetch = (async () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } })) as typeof fetch;
    assert.equal((await githubApi("https://api.github.com/y", {}, 3000)).status, 403);
  } finally {
    globalThis.fetch = real;
    console.error = realError;
    delete process.env.GITHUB_TOKEN;
    resetGithubToken();
  }
});
