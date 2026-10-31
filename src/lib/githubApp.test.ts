import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appConfig, appJwt, appToken, resetAppToken } from "./githubApp.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

test("the app's JWT is RS256, signed by its key, issued in the past, valid under ten minutes", () => {
  const now = Date.parse("2026-10-31T12:00:00Z");
  const jwt = appJwt("123456", pem, now);
  const [head, body, sig] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(head, "base64url").toString()), { alg: "RS256", typ: "JWT" });
  const claims = JSON.parse(Buffer.from(body, "base64url").toString());
  assert.equal(claims.iss, "123456");
  assert.equal(claims.iat, now / 1000 - 60);
  assert.ok(claims.exp - claims.iat <= 600);
  assert.ok(createVerify("RSA-SHA256").update(`${head}.${body}`).verify(publicKey, Buffer.from(sig, "base64url")));
});

test("settings: from a key file or the key text; none means no app", () => {
  const dir = mkdtempSync(join(tmpdir(), "app-key-"));
  writeFileSync(join(dir, "key.pem"), pem);
  assert.equal(appConfig({ GITHUB_APP_ID: " 1 ", GITHUB_APP_PRIVATE_KEY_FILE: join(dir, "key.pem") })?.key, pem.trim());
  assert.equal(appConfig({ GITHUB_APP_ID: "1", GITHUB_APP_PRIVATE_KEY: pem.replace(/\n/g, "\\n") })?.key, pem.trim()); // one-line form
  assert.equal(appConfig({ GITHUB_APP_ID: "1" }), null);
  assert.equal(appConfig({}), null);
  const errors: string[] = [];
  const realError = console.error;
  console.error = (m: string) => void errors.push(m);
  assert.equal(appConfig({ GITHUB_APP_ID: "1", GITHUB_APP_PRIVATE_KEY_FILE: "/nope.pem" }), null);
  console.error = realError;
  assert.match(errors[0], /github_app_key_unreadable/);
});

test("installation token: found, kept until five minutes before it ends, then renewed", async () => {
  resetAppToken();
  const calls: string[] = [];
  const now = Date.parse("2026-10-31T12:00:00Z");
  const fake = (async (url: string, init: RequestInit) => {
    calls.push(`${init.method ?? "GET"} ${url}`);
    assert.match((init.headers as Record<string, string>).Authorization, /^Bearer ey/);
    if (url.endsWith("/orgs/OpenRAC/installation")) return Response.json({ id: 42 });
    return Response.json({ token: `ghs_${calls.length}`, expires_at: new Date(now + 3_600_000).toISOString() });
  }) as typeof fetch;
  const config = { appId: "1", org: "OpenRAC", key: pem };
  assert.equal(await appToken(config, fake, now), "ghs_2");
  assert.deepEqual(calls, ["GET https://api.github.com/orgs/OpenRAC/installation", "POST https://api.github.com/app/installations/42/access_tokens"]);
  assert.equal(await appToken(config, fake, now + 50 * 60_000), "ghs_2"); // still good
  assert.equal(await appToken(config, fake, now + 56 * 60_000), "ghs_4"); // renewed before the hour ends
  resetAppToken();
});

test("a refused app falls back (undefined), logs why, and retries only after a minute", async () => {
  resetAppToken();
  const errors: string[] = [];
  const realError = console.error;
  console.error = (m: string) => void errors.push(m);
  let calls = 0;
  const refused = (async () => (calls++, new Response("{}", { status: 401 }))) as typeof fetch;
  const config = { appId: "1", installationId: "42", org: "OpenRAC", key: pem };
  try {
    assert.equal(await appToken(config, refused, 0), undefined);
    assert.equal(await appToken(config, refused, 30_000), undefined);
    assert.equal(calls, 1); // not asked again within the minute
    assert.match(errors[0], /github_app_token_failed.*"status":401/);
    assert.ok(!errors[0].includes("BEGIN"));
    assert.equal(await appToken(null, refused, 0), undefined); // no app set up: no call at all
  } finally {
    console.error = realError;
    resetAppToken();
  }
});
