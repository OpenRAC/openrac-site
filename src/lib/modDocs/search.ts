/**
 * The docs' search: one entry per page, heading and API name of a release, and a scorer the
 * browser runs over them. Built on the server (/mods/docs/search/<version>), fetched when the
 * search first opens.
 */
import { docsHref, guideTitle, pagesOf, slugger, withoutSince } from "./logic.ts";
import type { Release } from "./types.ts";

/** t: what is shown; k: what kind of thing it is; h: where it is; d: a line about it. */
export type Entry = { t: string; k: string; h: string; d?: string };

const short = (text: string, most = 110) => {
  const flat = withoutSince(text.replace(/[`*_[\]]/g, "").replace(/\(([^)]*\.md[^)]*)\)/g, "")).replace(/\s+/g, " ").trim();
  return flat.length > most ? `${flat.slice(0, most - 1)}…` : flat;
};

export function searchEntries(r: Release, latest: string): Entry[] {
  const at = (path: string, hash = "") => docsHref(r.version, path, latest) + (hash ? `#${hash}` : "");
  const out: Entry[] = [];
  for (const p of pagesOf(r)) out.push({ t: p.title, k: p.group === "Guides" || p.group === "Start" ? "Guide" : p.group, h: at(p.path), d: p.blurb });
  for (const g of r.guides) {
    const slug = slugger();
    for (const m of g.markdown.matchAll(/^(#{2,3})\s+(.+)$/gm)) {
      const text = m[2].replace(/`/g, "").trim();
      out.push({ t: text, k: guideTitle(g.title), h: at(g.slug, slug(m[2].trim())) });
    }
  }
  for (const s of r.c.sections) {
    for (const item of s.items) {
      if (item.kind === "constants") for (const c of item.items) out.push({ t: c.name, k: "C constant", h: at("reference/c-api", c.name), d: short(c.about || item.about) });
      else if (item.kind === "struct") {
        out.push({ t: item.name, k: "C struct", h: at("reference/c-api", item.name), d: short(item.about) });
        for (const g of item.groups) for (const m of g.members) out.push({ t: item.name === "openrac_api" ? `api->${m.name}` : `${item.name}.${m.name}`, k: m.kind === "function" ? "C function" : "C field", h: at("reference/c-api", `${item.name}.${m.name}`), d: short(g.about) });
      } else out.push({ t: item.name, k: item.kind === "macro" ? "C macro" : "C type", h: at("reference/c-api", item.name), d: short(item.about) });
    }
  }
  for (const c of r.cpp?.classes ?? []) {
    out.push({ t: `openrac::${c.name}`, k: "C++ class", h: at("reference/cpp-api", `openrac::${c.name}`), d: short(c.about) });
    const seen = new Set<string>();
    for (const m of c.members) {
      if (seen.has(m.name)) continue;
      seen.add(m.name);
      out.push({ t: `${c.name}::${m.name}`, k: "C++", h: at("reference/cpp-api", `openrac::${c.name}::${m.name}`), d: short(m.about) });
    }
  }
  for (const m of r.cpp?.macros ?? []) out.push({ t: m.name.split("(")[0], k: "C++ macro", h: at("reference/cpp-api", m.name.split("(")[0]), d: short(m.about) });
  for (const m of r.luau?.members ?? []) {
    const name = m.global ? m.name : `openrac.${m.name}`;
    out.push({ t: name, k: "Luau", h: at("reference/luau-api", name), d: short(m.about) });
  }
  for (const g of r.hooks) {
    for (const h of g.hooks) out.push({ t: h.id || h.name, k: h.experimental ? "Hook (experimental)" : "Hook point", h: at(`reference/hooks-${g.game}`, h.id || h.name), d: short([h.id ? h.name : "", h.signature, h.about].filter(Boolean).join(" · ")) });
    for (const f of g.fields) out.push({ t: `openrac.fields.${f.name}`, k: "Field", h: at(`reference/hooks-${g.game}`, `field-${f.name}`), d: short(`${f.type}${f.readonly ? ", read-only" : ""}. ${f.about}`) });
  }
  return out;
}

/** How well an entry answers a query: every word must be found; a name that starts with the query ranks first. */
export function score(e: Entry, words: string[]): number {
  const t = e.t.toLowerCase();
  const all = `${t} ${e.k.toLowerCase()} ${(e.d ?? "").toLowerCase()}`;
  let s = 0;
  for (const w of words) {
    if (!all.includes(w)) return 0;
    if (t === w) s += 100;
    else if (t.startsWith(w) || t.includes(`.${w}`) || t.includes(`>${w}`) || t.includes(`:${w}`)) s += 40;
    else if (t.includes(w)) s += 20;
    else s += 2;
  }
  // Pages and guides before the long lists of API names and hook points.
  if (e.k === "Guide" || e.k === "Reference" || e.k === "Try it" || e.k === "Releases") s += 15;
  if (e.k.startsWith("Hook (experimental)")) s -= 5;
  return s - Math.min(e.t.length, 60) / 30;
}

export function find(entries: Entry[], query: string, most = 40): Entry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return entries
    .map((e) => [e, score(e, words)] as const)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, most)
    .map(([e]) => e);
}
