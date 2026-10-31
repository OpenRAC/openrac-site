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
