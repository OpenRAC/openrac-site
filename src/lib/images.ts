import path from "node:path";
import { HERO_FILES, HERO_SHOTS, heroSrc } from "./heroShots.ts";
import { PROJECTS } from "./projects.ts";

/**
 * Card backdrops and the home page's clips are not part of the repository (they are game screenshots). They are read from a
 * folder on the server, so they can be added or replaced without rebuilding or restarting anything.
 *
 *   IMAGE_DIR   folder with the files, default ./public/img
 */
export const IMAGE_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};

/** The only file names that are ever served: exactly the ones the project cards and the home page's clips ask for. */
export const IMAGE_NAMES: ReadonlySet<string> = new Set(
  [...PROJECTS.map((p) => p.image), ...HERO_SHOTS.flatMap((s) => HERO_FILES.map((k) => heroSrc(s, k)))].map((src) => src.replace(/^\/img\//, "")),
);

/** Full path of a backdrop, or null if the name is not one of the known files. Never follows a path. */
export function resolveImage(name: string, dir: string = process.env.IMAGE_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "img")): { file: string; type: string } | null {
  if (!IMAGE_NAMES.has(name)) return null;
  const type = IMAGE_TYPES[path.extname(name)];
  // The folder is chosen at run time (IMAGE_DIR): keep the bundler from tracing it into the build.
  return type ? { file: path.join(/*turbopackIgnore: true*/ dir, name), type } : null;
}

/** "bytes=START-END" (either end may be left out) as a range inside SIZE, or null when it is not one. */
export function byteRange(header: string | null, size: number): { start: number; end: number } | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? "");
  if (!m || (m[1] === "" && m[2] === "")) return null;
  // "bytes=-N" is the last N bytes.
  const start = m[1] === "" ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] === "" || m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  return start <= end && start < size ? { start, end } : null;
}
