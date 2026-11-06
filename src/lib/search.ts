/**
 * The site search's scorer, run in the browser over the list from /search.json. Forgiving on purpose:
 * case, accents and "&" do not matter, a word may be the start of a longer one ("decomp"), and a
 * small typo still finds a name ("comando", "arsenl").
 */

/** t: what is shown; k: what kind of thing it is; h: where it goes; d: a line about it; a: other words it answers to. */
export type Entry = { t: string; k: string; h: string; d?: string; a?: string };

/** Lower case, no accents, "&" as "and", punctuation as spaces (dots and colons kept for API names). */
export const normalize = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.:>_+#]+/g, " ")
    .trim();

/** Edit distance, stopping early once it is past `most`. */
function distance(a: string, b: string, most: number): number {
  if (Math.abs(a.length - b.length) > most) return most + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > most) return most + 1;
    prev = row;
  }
  return prev[b.length];
}

/** How many typos a word may have: none for short ones, where a typo is another word. */
const slack = (w: string) => (w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0);

type Prepared = { e: Entry; title: string; words: string[]; alias: string[]; rest: string; restWords: string[] };

export function prepare(entries: Entry[]): Prepared[] {
  return entries.map((e) => {
    const title = normalize(e.t);
    const rest = normalize(`${e.a ?? ""} ${e.k} ${e.d ?? ""}`);
    return { e, title, words: title.split(" "), alias: normalize(e.a ?? "").split(" "), rest, restWords: rest.split(" ") };
  });
}

/** One query word against an entry: the title counts most, its start more than its middle, a typo least (and only when asked). */
function hit(p: Prepared, w: string, typos: boolean): number {
  if (p.title === w) return 100;
  if (p.words.includes(w)) return 50;
  if (p.words.some((x) => x.startsWith(w))) return 35;
  if (p.alias.includes(w)) return 26;
  if (p.title.includes(w)) return 20;
  if (p.restWords.includes(w)) return 12;
  if (p.restWords.some((x) => x.startsWith(w))) return 8;
  if (w.length >= 3 && p.rest.includes(w)) return 4;
  if (!typos) return 0;
  const s = slack(w);
  if (s && p.words.some((x) => distance(w, x, s) <= s)) return 10;
  if (s && p.restWords.some((x) => distance(w, x, s) <= s)) return 3;
  return 0;
}

/** Pages people look for first, ahead of the long lists of API names and news items. */
const BOOST: Record<string, number> = { Page: 14, Section: 12, Project: 25, Mod: 10, System: 8, FAQ: 6, Guide: 5, "Hook (experimental)": -6 };

/** Words a question is made of ("how do I install a mod"): left out, unless nothing else is typed. */
const FILLER = new Set(["a", "an", "the", "how", "do", "does", "i", "can", "to", "is", "are", "what", "why", "where", "of", "for", "in", "on", "my", "it", "with"]);

function rank(list: Prepared[], q: string, words: string[], typos: boolean, need: number): [Entry, number][] {
  const scored: [Entry, number][] = [];
  for (const p of list) {
    let s = 0, found = 0;
    for (const w of words) {
      const h = hit(p, w, typos);
      if (h) { s += h; found++; }
      else if (words.length - found > words.length - need) break;
    }
    if (found < need) continue;
    if (words.length > 1 && p.title.includes(q)) s += 40;
    s += found * 30 + (BOOST[p.e.k] ?? 0);
    scored.push([p.e, s - Math.min(p.e.t.length, 60) / 30]);
  }
  return scored;
}

/**
 * Every word must be found; the whole query as one phrase in the title ranks first. Typos are only
 * tried when the exact words find little, and when nothing has every word, most of them will do.
 */
export function find(list: Prepared[], query: string, most = 30): Entry[] {
  const q = normalize(query);
  const all = q.split(" ").filter(Boolean);
  const words = all.filter((w) => !FILLER.has(w)).length ? all.filter((w) => !FILLER.has(w)) : all;
  if (!words.length) return [];
  const phrase = words.join(" ");
  let scored = rank(list, phrase, words, false, words.length);
  if (scored.length < 5) scored = rank(list, phrase, words, true, words.length);
  if (!scored.length && words.length > 2) scored = rank(list, phrase, words, true, Math.ceil(words.length * 0.6));
  return scored.sort((a, b) => b[1] - a[1]).slice(0, most).map(([e]) => e);
}
