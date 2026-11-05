import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkManifest, parseManifestJson, pyRepr } from "./manifest.ts";

// The SDK's own test vectors and tables, from the newest release (mod-docs/tools/build.py copies them).
const root = new URL("../../../mod-docs/data/", import.meta.url);
const index = JSON.parse(readFileSync(new URL("index.json", root), "utf8"));
const latest = JSON.parse(readFileSync(new URL(`${index.latest}.json`, root), "utf8"));
const cases = parseManifestJson(readFileSync(new URL("manifest-cases.json", root), "utf8")) as {
  ids: { id: string; valid: boolean | Record<string, boolean> }[];
  manifests: { name: string; valid: boolean | Record<string, boolean>; manifest: unknown }[];
};
const tables = { keys: latest.keys, hookNames: latest.hookNames };
const sdk = (v: boolean | Record<string, boolean>) => (typeof v === "boolean" ? v : v.sdk);

test("every manifest gets the SDK's verdict", () => {
  const wrong = cases.manifests.filter((c) => (checkManifest(c.manifest, tables).length === 0) !== sdk(c.valid)).map((c) => `${c.name} (expected ${sdk(c.valid) ? "valid" : "refused"}): ${checkManifest(c.manifest, tables).join("; ")}`);
  assert.deepEqual(wrong, []);
});

test("every id gets the SDK's verdict", () => {
  const good = cases.manifests.find((c) => c.valid === true)!.manifest as Record<string, unknown>;
  const wrong = cases.ids.filter((c) => checkManifest({ ...good, id: c.id }, tables).some((e) => e.startsWith("id:")) === sdk(c.valid)).map((c) => JSON.stringify(c.id));
  assert.deepEqual(wrong, []);
});

test("a whole number written with a point stays a float", () => {
  const m = parseManifestJson('{"a": 1.0, "b": 1, "c": 0.5}') as Record<string, unknown>;
  assert.equal(typeof m.b, "number");
  assert.equal(m.c, 0.5);
  assert.notEqual(typeof m.a, "number");
});

test("messages quote values as package_mod.py does", () => {
  assert.equal(pyRepr("main.lua"), "'main.lua'");
  assert.equal(pyRepr("it's"), '"it\'s"');
  assert.equal(pyRepr(null), "None");
  assert.equal(pyRepr([true, 1, parseManifestJson("2.0")]), "[True, 1, 2.0]");
  // Python's True == 1: "format": true is read as a data pack there too.
  assert.match(checkManifest({ format: true }, tables)[0], /^format 1 is a data pack/);
});

test("the overview's first mod passes the newest SDK's check", async () => {
  const { firstMod } = await import("./logic.ts");
  const m = firstMod(latest);
  assert.ok(m);
  assert.deepEqual(checkManifest(parseManifestJson(m.manifest), tables), []);
  assert.match(m.script, /openrac\.hook\("rac1\.player\.take_damage", function\(original, amount: number\)/);
});
