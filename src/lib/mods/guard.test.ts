import { test } from "node:test";
import assert from "node:assert/strict";
import { Breaker, githubApi, resetGithubToken } from "./guard.ts";

test("breaker: opens after repeated failures, lets one probe through later", () => {
  const b = new Breaker(3, 60_000, 30_000);
  for (let i = 0; i < 3; i++) b.failure(i);
  assert.equal(b.allow(10), false);
  assert.equal(b.allow(30_010), true); // the probe
  assert.equal(b.allow(30_011), false); // only one at a time
  b.success();
  assert.equal(b.allow(30_012), true);
});

test("a token GitHub refuses is dropped: the request is made again without it", async () => {
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
    const res = await githubApi("https://api.github.com/repos/OpenRAC/openrac-mods", {}, 1000);
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
