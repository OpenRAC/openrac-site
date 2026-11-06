/**
 * Everything the site search can find, built on the server for /search.json: the site's pages and
 * sections, each project, the systems the launcher runs on, the FAQ, every mod, the mod SDK docs
 * (pages, headings, API names, hook points) and the news (weekly reports, each project's week, the
 * changes and releases in them, and each day).
 */
import { getDocsIndex, getRelease } from "./modDocs/index.ts";
import { searchEntries } from "./modDocs/search.ts";
import { getMods } from "./mods/index.ts";
import { getNewsIndex, getNewsWeek } from "./news/index.ts";
import { formatShortDay, formatWeekName, plainTitle } from "./news/logic.ts";
import { listName, PROJECTS, type ProjectId } from "./projects.ts";
import type { Entry } from "./search.ts";
import { PLACES } from "./searchIndex.places.ts";

/** Other names people use for each game. */
const NICKNAMES: Record<ProjectId, string> = {
  rac1: "rac rac1 r&c1 ratchet clank 1 first original 2002 europe",
  rac1us: "rac rac1 r&c1 ratchet clank 1 first original 2002 usa us america lombyte",
  gc: "rac2 r&c2 going commando locked and loaded ratchet clank 2",
  uya: "rac3 r&c3 up your arsenal ratchet clank 3",
  deadlocked: "rac4 r&c4 deadlocked gladiator ratchet gladiator",
  gm: "going mobile java phone j2me",
  sm: "rac5 size matters psp ps2 port",
  sac: "secret agent clank psp ps2 port",
};

const SYSTEMS: Entry[] = [
  { t: "Windows", k: "System", h: "/install", d: "The launcher for Windows 10 and 11.", a: "pc win exe installer" },
  { t: "Linux", k: "System", h: "/install", d: "The launcher for Linux.", a: "appimage flatpak deb" },
  { t: "macOS", k: "System", h: "/install", d: "The launcher for Mac.", a: "mac apple osx" },
  { t: "Android", k: "System", h: "/install", d: "The launcher for Android phones and handhelds.", a: "apk phone handheld odin" },
  { t: "Steam Deck", k: "System", h: "/install", d: "The Linux launcher on Steam Deck.", a: "steamos deck valve" },
];

const short = (text: string, most = 140) => {
  const flat = text.replace(/[`*_[\]#>]/g, "").replace(/\s+/g, " ").trim();
  return flat.length > most ? `${flat.slice(0, most - 1)}…` : flat;
};

function projects(): Entry[] {
  return PROJECTS.map((p) => ({
    t: listName(p),
    k: "Project",
    h: "/#progress",
    d: [p.platform, p.year, p.repo].filter(Boolean).join(" · "),
    a: [p.id, p.tag, p.region, p.repo?.replace("/", " "), ...(p.maintainers ?? []), NICKNAMES[p.id], "decompilation decomp"].filter(Boolean).join(" "),
  }));
}

async function mods(): Promise<Entry[]> {
  const list = await getMods();
  return list.map((m) => ({
    t: m.name,
    k: "Mod",
    h: `/mods/${m.id}`,
    d: m.description,
    a: [m.id, m.author, m.type, ...m.tags, ...(m.aliases ?? []), ...Object.keys(m.games)].join(" "),
  }));
}

function docs(): Entry[] {
  const index = getDocsIndex();
  if (!index.latest) return [];
  return searchEntries(getRelease(index.latest), index.latest).map((e) => ({ t: e.t, k: e.k, h: e.h, d: e.d, a: [e.a, e.s, "sdk docs mod mods modding"].filter(Boolean).join(" ") }));
}

async function news(): Promise<Entry[]> {
  const index = await getNewsIndex();
  if (!index) return [];
  const out: Entry[] = [];
  const weeks = await Promise.all(index.weeks.map((w) => getNewsWeek(w.week)));
  for (const w of weeks) {
    if (!w) continue;
    const { facts, report } = w;
    const name = formatWeekName(facts.week);
    const r = report.status === "ok" ? report.report : null;
    out.push({ t: r?.title ?? name, k: "News", h: `/news/${facts.week}`, d: r ? short(r.description) : `${facts.start} to ${facts.end}`, a: `${name} ${facts.week} report` });
    for (const p of facts.projects) {
      const section = r?.projects[p.repo];
      out.push({ t: `${p.title}: ${name}`, k: "News", h: `/news/${facts.week}/${p.repo}`, d: section ? short(section.headline) : undefined, a: `${p.repo} ${section ? short(section.summary, 400) : ""}` });
      for (const item of [...p.merged, ...p.issuesClosed]) out.push({ t: plainTitle(item.title), k: `Change · ${p.title}`, h: `/news/${facts.week}/${p.repo}`, d: `${name}, #${item.number} by ${item.author}`, a: `${p.repo} ${item.author}` });
      for (const rel of p.releases) out.push({ t: rel.name || rel.tag, k: `Release · ${p.title}`, h: `/news/${facts.week}/${p.repo}`, d: name, a: `${rel.tag} ${p.repo} release version` });
    }
  }
  for (const d of index.days) out.push({ t: formatShortDay(d), k: "News day", h: `/news/days/${d}`, a: d });
  return out;
}

/** The FAQ's questions, with the first sentence of each plain-text answer. */
export function faqEntries(faq: readonly (readonly [string, unknown])[]): Entry[] {
  return faq.map(([q, a]) => ({ t: q, k: "FAQ", h: "/#faq", d: typeof a === "string" ? short(a.match(/^(.{20,}?[.!?])(\s|$)/)?.[1] ?? a) : undefined, a: typeof a === "string" ? short(a, 400) : undefined }));
}

export async function buildSearchIndex(faq: readonly (readonly [string, unknown])[]): Promise<Entry[]> {
  const [modEntries, newsEntries] = await Promise.all([mods().catch(() => []), news().catch(() => [])]);
  // Duplicate places (a change listed in a week twice) are dropped.
  const seen = new Set<string>();
  return [...PLACES, ...projects(), ...SYSTEMS, ...faqEntries(faq), ...modEntries, ...docs(), ...newsEntries].filter((e) => {
    const key = `${e.t}\n${e.h}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
