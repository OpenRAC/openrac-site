import type { ListedMod, ModImage } from "./types.ts";

/** Larger than any picture the index build writes (its budgets are a few hundred KB). */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;

const NAME = /^([0-9a-f]{12})-(\d{2,5})\.(avif|webp)$/;

/** The upstream address and type of a media file, if the index lists it; otherwise undefined. */
export function findMedia(mods: ListedMod[], name: string): { url: string; type: string } | undefined {
  const m = NAME.exec(name);
  if (!m) return undefined;
  const [, hash, width, ext] = m;
  for (const mod of mods) {
    const images: (ModImage | null)[] = [mod.media.icon, mod.media.banner, ...mod.media.screenshots];
    if (images.some((i) => i && i.hash === hash && i.widths.includes(Number(width)))) return { url: `${mod.mediaBase}${name}`, type: ext === "avif" ? "image/avif" : "image/webp" };
  }
  return undefined;
}

/**
 * The server's own copy of mod pictures (MEDIA_DIR, a writable folder; none in development unless
 * set). Names are content hashes, so a file never changes once written: fetched from the index's
 * release once, served from disk after that, and still served if GitHub is down. The name is checked
 * against NAME before it gets here, so it can never leave the folder.
 */
export async function readCached(dir: string | undefined, name: string): Promise<Uint8Array | null> {
  if (!dir || !NAME.test(name)) return null;
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  try {
    return new Uint8Array(await readFile(join(/*turbopackIgnore: true*/ dir, name)));
  } catch {
    return null;
  }
}

/** Saves a picture next to the others; written under a temporary name and renamed, so a reader never sees half a file. */
export async function writeCached(dir: string | undefined, name: string, bytes: Uint8Array): Promise<void> {
  if (!dir || !NAME.test(name) || bytes.byteLength > MEDIA_MAX_BYTES) return;
  const { mkdir, rename, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  try {
    await mkdir(dir, { recursive: true });
    const tmp = join(/*turbopackIgnore: true*/ dir, `.${name}.${process.pid}.${Math.random().toString(36).slice(2)}`);
    await writeFile(tmp, bytes);
    await rename(tmp, join(/*turbopackIgnore: true*/ dir, name));
  } catch {
    // A full or read-only disk only means the next visit fetches it again.
  }
}
