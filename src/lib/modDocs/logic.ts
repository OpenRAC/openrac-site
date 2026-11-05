/**
 * The mod docs' pure parts: which pages a release has and where they live, links in the SDK's guides
 * turned into this site's, and the code the pages write from a hook point's signature. No I/O, so
 * the tests (logic.test.ts) and the browser share it.
 */
import type { CParam, Hook, Release, ReleaseIndex } from "./types.ts";

export const DOCS = "/mods/docs";
export const REPO = "https://github.com/OpenRAC/OpenRAC";

const VERSION = /^\d+\.\d+\.\d+$/;

/** Compares "1.10.0" and "1.9.2" as versions, not as text. */
export function compareVersions(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** "Since 1.2" against the interface of the release shown: whether the item is new in it. */
export function isNewIn(since: string | null | undefined, iface: string): boolean {
  return !!since && since === iface;
}

// ---- Pages ----

export type PageKind = "overview" | "guide" | "c" | "cpp" | "luau" | "hooks" | "changelog" | "manifest";
export type Page = { path: string; title: string; kind: PageKind; group: "Start" | "Guides" | "Reference" | "Try it" | "Releases"; game?: string; blurb?: string; parent?: string };

/** Every page a release has, in the sidebar's order. A page exists only when the release ships its source. */
export function pagesOf(r: Pick<Release, "guides" | "cpp" | "luau" | "hooks">): Page[] {
  const out: Page[] = [{ path: "", title: "Overview", kind: "overview", group: "Start" }];
  const start = r.guides.find((g) => g.slug === "getting-started");
  if (start) out.push({ path: start.slug, title: "Getting started", kind: "guide", group: "Start" });
  for (const g of r.guides) if (g !== start) out.push({ path: g.slug, title: guideTitle(g.title), kind: "guide", group: "Guides" });
  out.push({ path: "reference/c-api", title: "C interface", kind: "c", group: "Reference", blurb: "openrac_mod.h: the table every native mod gets" });
  if (r.cpp) out.push({ path: "reference/cpp-api", title: "C++ layer", kind: "cpp", group: "Reference", blurb: "mod.hpp: hooks as lambdas, typed settings" });
  if (r.luau) out.push({ path: "reference/luau-api", title: "Luau API", kind: "luau", group: "Reference", blurb: "the openrac table a script mod sees" });
  // "Hook points" folds open in the menu on one page per game.
  for (const g of r.hooks) out.push({ path: `reference/hooks-${g.game}`, title: gameName(g.game), parent: "Hook points", kind: "hooks", group: "Reference", game: g.game, blurb: "every hook point, with code to start from" });
  out.push({ path: "tools/manifest", title: "Manifest builder", kind: "manifest", group: "Try it" });
  out.push({ path: "changelog", title: "Changelog", kind: "changelog", group: "Releases" });
  return out;
}

/** A guide's heading, made short for a menu: "The manifest: `openrac-mod.json`" is "The manifest". */
export function guideTitle(title: string): string {
  return title.replace(/`/g, "").split(":")[0].trim();
}

export function gameName(game: string): string {
  return ({ rac1: "Ratchet & Clank", rac2: "Going Commando", rac3: "Up Your Arsenal", rac4: "Deadlocked" } as Record<string, string>)[game] ?? game;
}

/** The address of a page: the newest release's pages have no version in it, older ones do. */
export function docsHref(version: string, path: string, latest: string): string {
  const parts = [DOCS, version === latest ? "" : version, path].filter(Boolean);
  return parts.join("/");
}

/** Which release and page an address names: [] is the newest release's overview, ["1.10.0", "hooks"] an older guide. */
export function parseSlug(slug: string[] | undefined, index: Pick<ReleaseIndex, "latest" | "versions">): { version: string; path: string } | null {
  const parts = slug ?? [];
  if (parts[0] && VERSION.test(parts[0])) {
    if (!index.versions.some((v) => v.version === parts[0])) return null;
    return { version: parts[0], path: parts.slice(1).join("/") };
  }
  return { version: index.latest, path: parts.join("/") };
}

// ---- Links in the guides ----

/** github-slugger's ids for headings, as rehype-slug gives them (ASCII text: what the SDK's guides use). */
export function slugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-");
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
}

/**
 * A link in one of the release's guides (written for sdk/docs/ on GitHub), as an address on this site:
 * another guide or reference page becomes its page here, any other file of the repository its page on
 * GitHub at the release's tag. Outside links and in-page anchors stay as they are.
 */
export function guideLink(href: string, opts: { from: string; tag: string; version: string; latest: string; guides: string[] }): string {
  if (!href || href.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return href;
  const [pathPart, hash = ""] = href.split("#", 2);
  const anchor = hash ? `#${hash}` : "";
  const base = opts.from.split("/").slice(0, -1);
  const parts = [...base];
  for (const seg of pathPart.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg && seg !== ".") parts.push(seg);
  }
  const path = parts.join("/");
  const page = (p: string) => docsHref(opts.version, p, opts.latest) + anchor;
  if (path === "sdk/docs/README.md" || path === "sdk/docs") return page("");
  const guide = path.match(/^sdk\/docs\/([\w-]+)\.md$/);
  if (guide && opts.guides.includes(guide[1])) return page(guide[1]);
  const ref = path.match(/^sdk\/docs\/reference\/((?:c|cpp|luau)-api|hooks-\w+)\.md$/);
  if (ref) return page(`reference/${ref[1]}`);
  const kind = /\.\w+$/.test(path) ? "blob" : "tree";
  return `${REPO}/${kind}/${opts.tag}/${path}${anchor}`;
}

// ---- Code from a signature ----

/** The C type of each kind in a hook point's signature ("void(u32,f32)"). */
const C_TYPES: Record<string, string> = {
  void: "void", i32: "int32_t", u32: "uint32_t", i64: "int64_t", u64: "uint64_t", f32: "float",
  i16: "int16_t", u16: "uint16_t", i8: "int8_t", u8: "uint8_t",
};

export function parseSignature(sig: string): { ret: string; kinds: string[] } {
  const m = sig.match(/^\s*(\w+)\s*\((.*)\)\s*$/);
  if (!m) return { ret: "void", kinds: [] };
  return { ret: m[1], kinds: m[2].split(",").map((s) => s.trim()).filter(Boolean) };
}

const LUAU_RESERVED = new Set(["and", "break", "do", "else", "elseif", "end", "false", "for", "function", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then", "true", "until", "while", "continue", "type", "export"]);
const C_RESERVED = new Set(["auto", "break", "case", "char", "const", "continue", "default", "do", "double", "else", "enum", "extern", "float", "for", "goto", "if", "int", "long", "register", "return", "short", "signed", "sizeof", "static", "struct", "switch", "typedef", "union", "unsigned", "void", "volatile", "while", "class", "new", "delete", "this", "template"]);

/** The hook point's parameters as names and C types: its own C type's when the game header has one, else from the signature. */
export function hookParams(h: Pick<Hook, "signature" | "params" | "c">): CParam[] {
  if (h.c && h.c.params.length) return h.c.params;
  const { kinds } = parseSignature(h.signature);
  const used = new Set<string>();
  return kinds.map((k, i) => {
    let name = (h.params[i] || `arg${i}`).replace(/\W/g, "_");
    if (C_RESERVED.has(name) || LUAU_RESERVED.has(name) || /^\d/.test(name)) name = `${name}_`;
    while (used.has(name)) name = `${name}_`;
    used.add(name);
    return { type: C_TYPES[k] ?? "uint32_t", name };
  });
}

export type HookMode = "wrap" | "before" | "after" | "replace";

export const HOOK_MODES: { mode: HookMode; label: string; what: string }[] = [
  { mode: "wrap", label: "Wrap", what: "Do something, call the original, maybe do more after." },
  { mode: "before", label: "Before", what: "Run first. The game's code always runs after yours." },
  { mode: "after", label: "After", what: "Run after the game's code. Read the result or nudge a value." },
  { mode: "replace", label: "Replace", what: "Never call the original: your code is the behaviour now." },
];

function fnName(h: Pick<Hook, "id" | "name">): string {
  const last = (h.id || h.name).split(".").filter((p) => p !== "update").pop() ?? "hook";
  return `my_${last.replace(/\W/g, "_").replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase()}`;
}

/** A whole native mod in C that takes the hook point, for `mode`. */
export function hookStubC(h: Hook, game: string, modId: string, mode: HookMode): string {
  const { ret } = parseSignature(h.signature);
  const cret = C_TYPES[ret] ?? "void";
  const params = hookParams(h);
  const args = params.map((p) => p.name).join(", ");
  const decl = params.length ? params.map((p) => `${p.type} ${p.name}`).join(", ") : "void";
  const fn = fnName(h);
  const G = game.toUpperCase();
  const typeName = h.c ? h.c.type : "hook_fn";
  const call = cret === "void" ? `s_original(${args});` : `${cret} result = s_original(${args});`;
  const tail = cret === "void" ? [] : ["    return result;"];
  let body: string[];
  const unused = params.length ? [`    ${params.map((p) => `(void)${p.name};`).join(" ")} /* until you use them */`] : [];
  if (mode === "replace") body = ["    /* your code: the game's own does not run */", ...unused, ...(cret === "void" ? [] : [`    return 0;`])];
  else if (mode === "before") body = ["    /* your code, before the game's */", `    ${call}`, ...tail];
  else if (mode === "after") body = [`    ${call}`, "    /* your code, after the game's */", ...tail];
  else body = ["    /* before: change an argument, count a call, ... */", `    ${call}`, "    /* after */", ...tail];
  const lines = [
    `#include "openrac/openrac_mod.h"`,
    `#include "openrac/games/${game}.h"`,
    "",
    `OPENRAC_MOD_DEFINE("${modId}", "0.1.0")`,
    "",
  ];
  if (!h.c) lines.push(`typedef ${cret} (*hook_fn)(${decl});`);
  lines.push(
    `static ${typeName} s_original; /* ${mode === "replace" ? "kept: a replace may still call it" : "what your hook goes on to"} */`,
    "",
    `static ${cret} ${fn}(${decl}) {`,
    ...body,
    "}",
    "",
    "OPENRAC_MOD_EXPORT int openrac_mod_load(const openrac_api* api, openrac_mod* mod) {",
  );
  const take = h.c
    ? `OPENRAC_${G}_HOOK(api, mod, ${h.name}, ${fn}, &s_original)`
    : `api->hook(mod, "${h.id || h.name}", "${h.signature}", (void*)${fn}, (void**)&s_original)`;
  lines.push(
    `    if (${take} != OPENRAC_HOOK_OK) {`,
    `        api->fail(mod, "no ${h.id || h.name} hook point here");`,
    "        return 1; /* not loaded; the launcher shows why */",
    "    }",
    "    return 0;",
    "}",
  );
  return lines.join("\n");
}

/** The same mod with the C++ layer; null when the game's C++ header has no type for the hook point. */
export function hookStubCpp(h: Hook, game: string, modId: string, mode: HookMode): string | null {
  if (!h.cpp) return null;
  const { ret } = parseSignature(h.signature);
  const cret = C_TYPES[ret] ?? "void";
  const params = hookParams(h);
  const args = params.map((p) => p.name).join(", ");
  const lambdaParams = ["auto original", ...params.map((p) => `${p.type === "openrac_gaddr" ? "uint32_t" : p.type} ${p.name}`)].join(", ");
  const call = cret === "void" ? `original(${args});` : `auto result = original(${args});`;
  const tail = cret === "void" ? [] : ["            return result;"];
  let body: string[];
  const unused = params.length ? [`            ${params.map((p) => `(void)${p.name};`).join(" ")} // until you use them`] : [];
  if (mode === "replace") body = ["            // your code: the game's own does not run", ...unused, ...(cret === "void" ? [] : [`            return ${cret}{};`])];
  else if (mode === "before") body = ["            // your code, before the game's", `            ${call}`, ...tail];
  else if (mode === "after") body = [`            ${call}`, "            // your code, after the game's", ...tail];
  else body = ["            // before: change an argument, count a call, ...", `            ${call}`, "            // after", ...tail];
  return [
    `#include "openrac/mod.hpp"`,
    `#include "openrac/games/${game}.hpp"`,
    "",
    "static void load(openrac::Mod& mod) {",
    `    mod.hook<openrac::${game}::${h.name}>(`,
    `        [](${mode === "replace" ? lambdaParams.replace("auto original", "auto /*original*/") : lambdaParams}) {`,
    ...body,
    "        });",
    "}",
    "",
    `OPENRAC_MOD_CPP("${modId}", "0.1.0", load)`,
  ].join("\n");
}

/** A script mod's main.luau that takes the hook point; null for a hook point with no id (before script mods). */
export function hookStubLuau(h: Hook, mode: HookMode): string | null {
  if (!h.id) return null;
  const params = hookParams(h).map((p) => p.name);
  const list = params.join(", ");
  const { ret } = parseSignature(h.signature);
  const id = JSON.stringify(h.id);
  if (mode === "before" || mode === "after") {
    return [
      `openrac.${mode}(${id}, function(${list})`,
      `    -- runs ${mode} the rest of the chain, which runs whatever this does`,
      `    openrac.log("${h.id}")`,
      "end)",
    ].join("\n");
  }
  if (mode === "replace") {
    return [
      `openrac.hook(${id}, function(${["original", ...params].join(", ")})`,
      "    -- original is never called: the game's own code does not run",
      ...(ret === "void" ? [] : ["    return 0"]),
      "end)",
    ].join("\n");
  }
  return [
    `openrac.hook(${id}, function(${["original", ...params].join(", ")})`,
    "    -- before: change an argument, count a call, ...",
    ret === "void" ? `    original(${list})` : `    local result = original(${list})`,
    "    -- after",
    ...(ret === "void" ? [] : ["    return result"]),
    "end)",
  ].join("\n");
}

/** How a call of the table looks: `int64_t result = api->setting_int(mod, key);`, from the member's own declaration. */
export function callShape(m: { name: string; returns: string; params: CParam[] }): string {
  const call = `api->${m.name}(${m.params.map((p) => p.name || "_").join(", ")});`;
  return m.returns === "void" ? call : `${m.returns} result = ${call}`;
}

/** The sentences of a comment that say what a call returns, and the rest. */
export function splitReturns(about: string): { text: string; returns: string } {
  const sentences = about.split(/(?<=\.)\s+(?=[A-Z(])/);
  const ret = sentences.filter((s) => /^(Returns?|Gives)\b/.test(s));
  return { text: sentences.filter((s) => !ret.includes(s)).join(" "), returns: ret.join(" ") };
}

/** The OPENRAC_* constants a comment names: the results and flags a call can give or take. */
export function namedConstants(text: string): string[] {
  return [...new Set(text.match(/\bOPENRAC_[A-Z0-9_]+\b/g) ?? [])];
}

/** The comment without its "Since X.Y." (shown as a badge instead). */
export function withoutSince(text: string): string {
  return text.replace(/\s*Since\s+\d+\.\d+\.(?=\s|$)/g, "").trim();
}

// ---- What the manifest guide says ----

/** The manifest guide's table of fields: each field's line, by field ("author" and the others it names together). */
export function manifestHelp(md: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of md.split("\n")) {
    const m = line.match(/^\|\s*(`[^|]+)\|\s*([^|]*)\|\s*(.+?)\s*\|\s*$/);
    if (!m) continue;
    for (const f of m[1].matchAll(/`(\w+)`/g)) out[f[1]] = m[3].replace(/\\\|/g, "|");
  }
  return out;
}

/** The manifest guide's whole examples, with the heading above each ("A script mod"). */
export function manifestExamples(md: string): { title: string; json: string }[] {
  const out: { title: string; json: string }[] = [];
  let heading = "";
  const re = /^##\s+(.+)$|^```json\n([\s\S]*?)^```/gm;
  for (const m of md.matchAll(re)) {
    if (m[1]) heading = m[1].trim();
    else if (m[2] && /"format"/.test(m[2])) out.push({ title: heading.replace(/^An? /, "").replace(/^./, (c) => c.toLowerCase()) || "example", json: m[2].trimEnd() });
  }
  return out;
}

// ---- Finding a hook point without knowing the API ----

/** What part of the game a hook point is about, by the second part of its id (rac1.<part>.*). */
export const HOOK_TOPICS: { topic: string; label: string; what: string; parts: string[] }[] = [
  { topic: "hero", label: "Ratchet", what: "how he moves, turns, runs and takes damage", parts: ["player"] },
  { topic: "controls", label: "Controls", what: "the pad, before the game reads it", parts: ["pad"] },
  { topic: "camera", label: "Camera", what: "where the follow camera looks", parts: ["camera"] },
  { topic: "items", label: "Items and ammo", what: "gadgets, weapons, ammo and bolts", parts: ["item", "weapon", "ammo", "gold_bolt"] },
  { topic: "world", label: "Enemies and objects", what: "hits, deaths and pickups", parts: ["moby", "combat"] },
  { topic: "travel", label: "Levels and travel", what: "level loads, planets, the ship", parts: ["level", "planet", "ship"] },
  { topic: "vendor", label: "Vendor", what: "what the shop sells", parts: ["vendor"] },
  { topic: "hud", label: "HUD", what: "the quick select in play", parts: ["hud"] },
  { topic: "menu", label: "Pause menu", what: "the item grid, previews, quick select", parts: ["menu"] },
  { topic: "saves", label: "Saves", what: "new games, saving and loading", parts: ["save"] },
];

/** The topic of a hook point; experimental ones (the behaviour catalogue) are a topic of their own. */
export function hookTopic(h: Pick<Hook, "id" | "name" | "experimental">): string {
  if (h.experimental) return "experimental";
  const part = (h.id || "").split(".")[1] ?? "";
  return HOOK_TOPICS.find((t) => t.parts.includes(part))?.topic ?? "other";
}

/** Things people often want to change first, and the hook point that does it, by its id after the game (shown where the game has it). */
export const HOOK_IDEAS: { idea: string; id: string }[] = [
  { idea: "Take less damage, or none", id: "player.take_damage" },
  { idea: "Never run out of ammo", id: "weapon.take_ammo" },
  { idea: "Run faster or slower", id: "player.approach_speed" },
  { idea: "Change what crates and enemies drop", id: "ammo.choose_drop" },
  { idea: "React when Ratchet gets an item", id: "item.give" },
  { idea: "Remap or read the buttons", id: "pad.process_report" },
];

/** A hook point's description without the game's own function name in brackets: "(Hero_TakeDamage)". */
export function plainAbout(h: Pick<Hook, "about" | "name" | "aliases">): string {
  const names = new Set([h.name, ...h.aliases]);
  return h.about.replace(/\s*\(([A-Za-z_][\w]*)\)/g, (m, n: string) => (names.has(n) || /_|[a-z][A-Z]/.test(n) ? "" : m)).replace(/\s+([:;,.])/g, "$1");
}
