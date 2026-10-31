import type { ListedMod, ModCatalog, ModIndex, Port } from "./types.ts";

/**
 * The mod list, read on the server from each index the site is told about (MOD_INDEXES, comma
 * separated). Today that is openrac-mods' signed release file; later games add their own, and a renamed
 * repository keeps working through GitHub's redirect.
 *
 * The index is fetched with a revalidate time like the other feeds, so static pages can use it (a
 * `no-store` fetch would make Next treat each page as dynamic), and it is kept here in memory for
 * CACHE_MS. Past Next's 2 MB fetch cache it is simply not cached there, and the memory copy still
 * holds. If GitHub cannot be reached, the last good copy is served and marked stale; with none, the
 * list is empty and the page says so. Our own failures never throw; Next's internal signals pass through.
 */

export const DEFAULT_INDEX = "https://github.com/OpenRAC/openrac-mods/releases/download/index/index.json";
const CACHE_MS = 300_000;
const TIMEOUT_MS = 10_000;

export const indexUrls = (env = process.env.MOD_INDEXES) =>
  (env ?? DEFAULT_INDEX)
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

export type Fetcher = (url: string) => Promise<unknown>;

export type IndexError = "timeout" | "http" | "parse";

/**
 * Next signals things during a render by throwing (a page turning dynamic, a redirect, notFound):
 * those carry a `digest` and must reach Next, never be taken for an unreachable index.
 */
export const isNextSignal = (e: unknown) => typeof (e as { digest?: unknown } | null)?.digest === "string";

// A plain field, not a constructor parameter property: Node runs the tests with type stripping only.
class FetchError extends Error {
  kind: IndexError;
  constructor(kind: IndexError) {
    super(kind);
    this.kind = kind;
  }
}

/** Reads one URL as JSON: https through fetch (with retries), file: only in tests. */
export const defaultFetcher: Fetcher = async (url) => {
  if (url.startsWith("file:")) {
    if (process.env.NODE_ENV !== "test" && !process.env.MODS_ALLOW_FILE) throw new FetchError("http");
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(new URL(url), "utf8"));
  }
  return withRetry(async () => {
    let res: Response;
    try {
      res = await fetch(url, { next: { revalidate: CACHE_MS / 1000 }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (e) {
      if (isNextSignal(e)) throw e;
      throw new FetchError((e as Error).name === "TimeoutError" ? "timeout" : "http");
    }
    if (!res.ok) throw new FetchError(res.status === 429 || res.status >= 500 ? "timeout" : "http");
    try {
      return await res.json();
    } catch {
      throw new FetchError("parse");
    }
  });
};

/**
 * At most two retries, only for errors that may pass (timeouts, 5xx, 429), each after a random wait
 * up to a growing cap ("full jitter", aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter),
 * so many servers retrying at once do not hit GitHub together.
 */
export async function withRetry<T>(run: () => Promise<T>, retries = 2, base = 250, cap = 2000, sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (e) {
      if (attempt >= retries || !(e instanceof FetchError) || e.kind !== "timeout") throw e;
      await sleep(Math.random() * Math.min(cap, base * 2 ** attempt));
    }
  }
}

/** Throws unless the value has the shape this site can show; unknown extra fields are fine. */
export function checkIndex(value: unknown): ModIndex {
  const v = value as Partial<ModIndex> | null;
  if (!v || typeof v !== "object" || v.format !== 1 || !Array.isArray(v.mods) || typeof v.media !== "string") throw new FetchError("parse");
  for (const m of v.mods)
    if (!m || typeof m.id !== "string" || typeof m.name !== "string" || !Array.isArray(m.versions) || !m.versions.length || !m.media) throw new FetchError("parse");
  return { ...v, revoked: v.revoked ?? [], tags: v.tags ?? [] } as ModIndex;
}

const NO_PORT: Port = { launcher: null, api: null };

/** Several indexes as one list. The first index to name an id keeps it; ids are unique across indexes by rule. */
export function merge(indexes: ModIndex[], now: number, stale = false): ModCatalog {
  const seen = new Set<string>();
  const mods: ListedMod[] = [];
  for (const idx of indexes)
    for (const m of idx.mods)
      if (!seen.has(m.id)) {
        seen.add(m.id);
        mods.push({ ...m, mediaBase: idx.media, indexSource: idx.source });
      }
  const first = indexes[0];
  return {
    mods,
    revoked: indexes.flatMap((i) => i.revoked),
    ports: first?.ports ?? { stable: NO_PORT, dev: NO_PORT },
    tags: [...new Set(indexes.flatMap((i) => i.tags))],
    generated: first?.generated ?? null,
    stale: stale || indexes.some((i) => Date.parse(i.expires) < now),
  };
}

type Entry = { index: ModIndex; at: number };
const lastGood = new Map<string, Entry>();
let inflight: Promise<{ catalog: ModCatalog; error?: IndexError }> | null = null;
let memo: { at: number; value: { catalog: ModCatalog; error?: IndexError } } | null = null;

/** Loads every index once; each that fails falls back to its last good copy. */
export async function loadCatalog(urls: string[], fetcher: Fetcher, now: number, memory = lastGood): Promise<{ catalog: ModCatalog; error?: IndexError }> {
  let error: IndexError | undefined;
  let stale = false;
  const indexes: ModIndex[] = [];
  await Promise.all(
    urls.map(async (url, i) => {
      try {
        const index = checkIndex(await fetcher(url));
        // A server never goes back to an older index than one it has shown (it may be a cached copy).
        const prev = memory.get(url);
        const use = prev && prev.index.serial > index.serial ? prev.index : index;
        memory.set(url, { index: use, at: now });
        indexes[i] = use;
      } catch (e) {
        if (isNextSignal(e)) throw e;
        error = e instanceof FetchError ? e.kind : "parse";
        const prev = memory.get(url);
        if (prev) {
          indexes[i] = prev.index;
          stale = true;
        }
      }
    }),
  );
  const present = indexes.filter(Boolean);
  return { catalog: merge(present, now, stale || (error !== undefined && !present.length)), error };
}

/** The catalog for pages and routes, shared by every request in a CACHE_MS window. */
export async function getModCatalog(): Promise<{ catalog: ModCatalog; error?: IndexError }> {
  const now = Date.now();
  if (memo && now - memo.at < CACHE_MS) return memo.value;
  inflight ??= loadCatalog(indexUrls(), defaultFetcher, now)
    .then((value) => {
      // Keep failures for a shorter time, so a short outage clears quickly.
      memo = { at: value.error ? now - CACHE_MS + 30_000 : now, value };
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The catalog's mods, or none: for places that only list them (sitemap, llms.txt). */
export async function getMods(): Promise<ListedMod[]> {
  return (await getModCatalog()).catalog.mods;
}

export async function getMod(id: string): Promise<{ mod: ListedMod | undefined; catalog: ModCatalog }> {
  const { catalog } = await getModCatalog();
  return { mod: catalog.mods.find((m) => m.id === id), catalog };
}
