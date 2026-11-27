import { isNextSignal } from "./index.ts";
import type { ListedMod } from "./types.ts";

/**
 * A mod's long texts (readme, changelogs) from its `details-<id>.json`, which the index may name instead of
 * carrying them. The signed index gives the file's SHA-256, so a file that does not match is refused and
 * the page shows what the index itself has.
 */

export interface Details {
  id: string;
  readme: string;
  versions: { version: string; changelog: string }[];
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** The details in `bytes` when they hash to `sha256` and are for mod `id`; null otherwise. */
export async function checkDetails(bytes: Uint8Array, sha256: string, id: string): Promise<Details | null> {
  if (hex(await crypto.subtle.digest("SHA-256", bytes as BufferSource)) !== sha256.toLowerCase()) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(bytes)) as Partial<Details>;
    if (d.id !== id) return null;
    return { id, readme: typeof d.readme === "string" ? d.readme : "", versions: Array.isArray(d.versions) ? d.versions : [] };
  } catch {
    return null;
  }
}

export type BytesFetcher = (url: string) => Promise<Uint8Array>;

const fetchBytes: BytesFetcher = async (url) => {
  const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

/** The mod with its readme and changelogs filled from its details file where the index left them out. */
export async function withDetails(mod: ListedMod, get: BytesFetcher = fetchBytes): Promise<ListedMod> {
  const file = mod.details;
  const missing = !mod.readme?.trim() || mod.versions.some((v) => !v.changelog?.trim());
  if (!file || !mod.indexBase || !missing || !/^[\w.-]+$/.test(file.asset)) return mod;
  try {
    const d = await checkDetails(await get(`${mod.indexBase}${file.asset}`), file.sha256, mod.id);
    if (!d) return mod;
    const notes = new Map(d.versions.map((v) => [v.version, v.changelog]));
    return {
      ...mod,
      readme: mod.readme?.trim() ? mod.readme : d.readme,
      versions: mod.versions.map((v) => (v.changelog?.trim() ? v : { ...v, changelog: notes.get(v.version) ?? "" })),
    };
  } catch (e) {
    if (isNextSignal(e)) throw e;
    return mod;
  }
}
