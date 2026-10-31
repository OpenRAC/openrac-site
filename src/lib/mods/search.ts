/**
 * Search over the mod list, small enough to need no library: the index stays at a few hundred mods.
 * Words of the query must all match (AND). A match in the name counts most, then tags, the author, then
 * the description. One typo is forgiven in words of four letters or more, against names and tags only.
 */

export interface Searchable {
  id: string;
  name: string;
  author: string;
  description: string;
  tags: string[];
  aliases?: string[];
}

/** Lower case, no accents, "&" read as "and", punctuation as spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const words = (text: string) => normalize(text).split(" ").filter(Boolean);

/** Damerau–Levenshtein distance, stopping early once it passes `max`. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      best = Math.min(best, d[i][j]);
    }
    if (best > max) return false;
  }
  return d[a.length][b.length] <= max;
}

/** Fields made once per mod, so typing never re-normalizes the whole list. */
export interface Prepared<T> {
  item: T;
  name: string;
  nameWords: string[];
  tagWords: string[];
  author: string;
  description: string;
}

export function prepare<T extends Searchable>(item: T): Prepared<T> {
  const nameWords = [...words(item.name), ...words(item.id), ...(item.aliases ?? []).flatMap(words)];
  return {
    item,
    name: normalize(item.name),
    nameWords,
    tagWords: item.tags.flatMap(words),
    author: normalize(item.author),
    description: normalize(item.description),
  };
}

/** How well one query word matches; 0 for not at all. */
function scoreWord(p: Prepared<unknown>, w: string): number {
  if (p.nameWords.some((x) => x === w)) return 12;
  if (p.nameWords.some((x) => x.startsWith(w))) return 9;
  if (p.name.includes(w)) return 7;
  if (p.tagWords.some((x) => x === w || x.startsWith(w))) return 6;
  if (p.author.includes(w)) return 4;
  if (p.description.includes(w)) return 2;
  const typo = (x: string) => within(w, x, 1) || within(w, x.slice(0, w.length), 1);
  if (w.length >= 4 && p.nameWords.some(typo)) return 4;
  if (w.length >= 4 && p.tagWords.some(typo)) return 3;
  return 0;
}

/** The mods that match every word, best first; the whole list in its own order for an empty query. */
export function search<T>(prepared: Prepared<T>[], query: string): T[] {
  const q = words(query);
  if (!q.length) return prepared.map((p) => p.item);
  const scored: { item: T; score: number; i: number }[] = [];
  prepared.forEach((p, i) => {
    let score = 0;
    for (const w of q) {
      const s = scoreWord(p, w);
      if (!s) return;
      score += s;
    }
    if (p.name === q.join(" ")) score += 20;
    else if (p.name.startsWith(q.join(" "))) score += 8;
    scored.push({ item: p.item, score, i });
  });
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map((s) => s.item);
}

/** The closest name to a query that found nothing, for "Did you mean". */
export function closest<T extends Searchable>(items: T[], query: string): T | undefined {
  const q = normalize(query);
  if (q.length < 3) return undefined;
  let best: { item: T; d: number } | undefined;
  for (const item of items) {
    const n = normalize(item.name);
    for (let max = 1; max <= 3; max++)
      if (within(q, n.slice(0, q.length), max) || within(q, n, max)) {
        if (!best || max < best.d) best = { item, d: max };
        break;
      }
  }
  return best?.item;
}

/** Splits text into plain and matched parts, for <mark>. */
export function highlight(text: string, query: string): { text: string; hit: boolean }[] {
  const q = words(query).filter((w) => w.length >= 2);
  if (!q.length) return [{ text, hit: false }];
  const re = new RegExp(`(${q.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return text
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, hit: q.includes(part.toLowerCase()) }));
}
