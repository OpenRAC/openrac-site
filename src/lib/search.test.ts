import { test } from "node:test";
import assert from "node:assert/strict";
import { find, normalize, prepare, type Entry } from "./search.ts";

const ENTRIES: Entry[] = [
  { t: "Going Commando", k: "Project", h: "/#progress", a: "gc rac2" },
  { t: "Up Your Arsenal", k: "Project", h: "/#progress", a: "uya rac3" },
  { t: "Rework it like rac3-decomp", k: "Change · Going Commando", h: "/news/2026-W44/rac2-gc-decomp" },
  { t: "Install from a link", k: "Guide", h: "/mods/docs/install-from-link", a: "sdk docs mod mods" },
  { t: "Pokémon & Co", k: "Mod", h: "/mods/x" },
];
const list = prepare(ENTRIES);
const titles = (q: string) => find(list, q).map((e) => e.t);

test("normalize drops case, accents and the ampersand", () => {
  assert.equal(normalize("Pokémon & Co"), "pokemon and co");
});

test("a curated other name puts the project first", () => {
  assert.deepEqual(titles("rac3").slice(0, 2), ["Up Your Arsenal", "Rework it like rac3-decomp"]);
});

test("a small typo still finds a name, a short word must be exact", () => {
  assert.equal(titles("comando")[0], "Going Commando");
  assert.equal(titles("arsenl")[0], "Up Your Arsenal");
  assert.deepEqual(titles("gx"), []);
});

test("question words are left out", () => {
  assert.equal(titles("how do I install a mod")[0], "Install from a link");
});

test("accents and ampersands match either way", () => {
  assert.deepEqual(titles("pokemon and"), ["Pokémon & Co"]);
});
