import assert from "node:assert/strict";
import { test } from "node:test";
import { callShape, compareVersions, docsHref, guideLink, hookStubC, hookStubCpp, hookStubLuau, hookTopic, manifestExamples, manifestHelp, pagesOf, parseSlug, plainAbout, splitReturns, withoutSince } from "./logic.ts";
import type { Hook } from "./types.ts";

const index = { latest: "1.11.0", versions: [{ version: "1.11.0" }, { version: "1.10.1" }, { version: "1.2.0" }] } as Parameters<typeof parseSlug>[1];

test("versions compare as numbers", () => {
  assert.ok(compareVersions("1.10.0", "1.9.9") > 0);
  assert.equal(compareVersions("1.2.0", "1.2.0"), 0);
});

test("the latest release's pages have no version in their address, older ones do", () => {
  assert.equal(docsHref("1.11.0", "", "1.11.0"), "/mods/docs");
  assert.equal(docsHref("1.11.0", "reference/c-api", "1.11.0"), "/mods/docs/reference/c-api");
  assert.equal(docsHref("1.2.0", "hooks", "1.11.0"), "/mods/docs/1.2.0/hooks");
  assert.deepEqual(parseSlug(undefined, index), { version: "1.11.0", path: "" });
  assert.deepEqual(parseSlug(["1.2.0", "reference", "c-api"], index), { version: "1.2.0", path: "reference/c-api" });
  assert.equal(parseSlug(["9.9.9"], index), null);
});

test("links in a guide become this site's pages, or GitHub at the release's tag", () => {
  const ctx = { from: "sdk/docs/getting-started.md", tag: "sdk-v1.2.0", version: "1.2.0", latest: "1.11.0", guides: ["manifest", "hooks"] };
  assert.equal(guideLink("manifest.md", ctx), "/mods/docs/1.2.0/manifest");
  assert.equal(guideLink("hooks.md#stable-ids", ctx), "/mods/docs/1.2.0/hooks#stable-ids");
  assert.equal(guideLink("reference/hooks-rac1.md#fields", ctx), "/mods/docs/1.2.0/reference/hooks-rac1#fields");
  assert.equal(guideLink("README.md", ctx), "/mods/docs/1.2.0");
  assert.equal(guideLink("../template", ctx), "https://github.com/OpenRAC/OpenRAC/tree/sdk-v1.2.0/sdk/template");
  assert.equal(guideLink("../../docs/port/MODS.md#3-the-manifest", ctx), "https://github.com/OpenRAC/OpenRAC/blob/sdk-v1.2.0/docs/port/MODS.md#3-the-manifest");
  assert.equal(guideLink("https://luau.org", ctx), "https://luau.org");
  assert.equal(guideLink("#the-sandbox", ctx), "#the-sandbox");
});

const turn: Hook = {
  id: "rac1.player.turn_to_heading", name: "Hero_TurnToHeading", aliases: [], symbols: { pal: "func_x" }, signature: "void(i32,f32,f32,f32)",
  params: ["mode", "accel", "damping", "limit"], about: "", experimental: false, classes: [],
  c: { type: "openrac_rac1_Hero_TurnToHeading", macro: "OPENRAC_RAC1_HOOK", params: [{ type: "int32_t", name: "mode" }, { type: "float", name: "accel" }, { type: "float", name: "damping" }, { type: "float", name: "limit" }] },
  cpp: true,
};
const moby: Hook = { ...turn, id: "rac1.moby.bolt.update", name: "Moby_Bolt_Update", signature: "u32(u32)", params: ["moby"], c: null, cpp: false, experimental: true };

test("a hook point's code comes from its own signature", () => {
  const c = hookStubC(turn, "rac1", "my-mod", "wrap");
  assert.match(c, /static void my_turn_to_heading\(int32_t mode, float accel, float damping, float limit\) \{/);
  assert.match(c, /OPENRAC_RAC1_HOOK\(api, mod, Hero_TurnToHeading, my_turn_to_heading, &s_original\)/);
  assert.match(c, /OPENRAC_MOD_DEFINE\("my-mod", "0\.1\.0"\)/);
  // No C type of its own: the generic call, by id and signature, and the result passed on.
  const m = hookStubC(moby, "rac1", "my-mod", "after");
  assert.match(m, /typedef uint32_t \(\*hook_fn\)\(uint32_t moby\);/);
  assert.match(m, /api->hook\(mod, "rac1\.moby\.bolt\.update", "u32\(u32\)", \(void\*\)my_bolt, \(void\*\*\)&s_original\)/);
  assert.match(m, /uint32_t result = s_original\(moby\);[\s\S]*return result;/);
  assert.match(hookStubCpp(turn, "rac1", "x", "wrap")!, /mod\.hook<openrac::rac1::Hero_TurnToHeading>\(/);
  assert.equal(hookStubCpp(moby, "rac1", "x", "wrap"), null);
  assert.match(hookStubLuau(turn, "before")!, /^openrac\.before\("rac1\.player\.turn_to_heading", function\(mode, accel, damping, limit\)/);
  assert.match(hookStubLuau(moby, "wrap")!, /local result = original\(moby\)[\s\S]*return result/);
  assert.equal(hookStubLuau({ ...turn, id: "" }, "wrap"), null);
  // A replace uses none of its arguments yet: they are marked, so -Wall -Wextra stays quiet.
  assert.match(hookStubC(turn, "rac1", "x", "replace"), /\(void\)mode; \(void\)accel; \(void\)damping; \(void\)limit;/);
  assert.match(hookStubCpp(turn, "rac1", "x", "replace")!, /\(void\)mode;/);
});

test("hook points are found by what they touch, described without the game's names", () => {
  assert.equal(hookTopic({ id: "rac1.player.take_damage", name: "Hero_TakeDamage", experimental: false }), "hero");
  assert.equal(hookTopic({ id: "rac1.gold_bolt.count_collected", name: "x", experimental: false }), "items");
  assert.equal(hookTopic({ id: "rac1.moby.bolt.update", name: "x", experimental: true }), "experimental");
  assert.equal(hookTopic({ id: "rac1.new_part.x", name: "x", experimental: false }), "other");
  assert.equal(plainAbout({ about: "Takes hit points off the hero (Hero_TakeDamage): at most one.", name: "Hero_TakeDamage", aliases: [] }), "Takes hit points off the hero: at most one.");
  assert.equal(plainAbout({ about: "One report (PadState, at pad), each poll.", name: "Pad_ProcessReport", aliases: [] }), "One report (PadState, at pad), each poll.");
});

test("a call of the table and its comment", () => {
  assert.equal(callShape({ name: "setting_int", returns: "int64_t", params: [{ type: "openrac_mod*", name: "mod" }, { type: "const char*", name: "key" }] }), "int64_t result = api->setting_int(mod, key);");
  assert.equal(callShape({ name: "log", returns: "void", params: [] }), "api->log();");
  assert.deepEqual(splitReturns("Takes it. Returns 0, or non-zero. Only during load."), { text: "Takes it. Only during load.", returns: "Returns 0, or non-zero." });
  assert.equal(withoutSince("The pointer. Since 1.3."), "The pointer.");
  assert.equal(withoutSince("Since 1.3 (check `size` first): where it is."), "Since 1.3 (check `size` first): where it is.");
});

test("the pages of a release follow what it ships", () => {
  const old = pagesOf({ guides: [], cpp: null, luau: null, hooks: [{ game: "rac1", discs: [], hooks: [], fields: [] }] }).map((p) => p.path);
  assert.deepEqual(old, ["", "reference/c-api", "reference/hooks-rac1", "tools/manifest", "changelog"]);
});

test("the manifest guide's fields and examples", () => {
  const md = "## A script mod\n\n```json\n{\"format\": 2}\n```\n\n| Field | Required | What it is |\n|---|---|---|\n| `id` | yes | Lower-case. |\n| `author`, `license` | no | Shown. |\n";
  assert.deepEqual(manifestHelp(md), { id: "Lower-case.", author: "Shown.", license: "Shown." });
  assert.deepEqual(manifestExamples(md), [{ title: "script mod", json: '{"format": 2}' }]);
});
