import path from "node:path";
import { PROJECTS } from "./projects.ts";

/**
 * Card backdrops are not part of the repository (they are game screenshots). They are read from a
 * folder on the server, so they can be added or replaced without rebuilding or restarting anything.
 *
 *   IMAGE_DIR   folder with the files, default ./public/img
 */
export const IMAGE_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

/** The only file names that are ever served: exactly the ones the project cards ask for. */
export const IMAGE_NAMES: ReadonlySet<string> = new Set(PROJECTS.map((p) => p.image.replace(/^\/img\//, "")));

/** Full path of a backdrop, or null if the name is not one of the known files. Never follows a path. */
export function resolveImage(name: string, dir: string = process.env.IMAGE_DIR ?? path.join(process.cwd(), "public", "img")): { file: string; type: string } | null {
  if (!IMAGE_NAMES.has(name)) return null;
  const type = IMAGE_TYPES[path.extname(name)];
  return type ? { file: path.join(dir, name), type } : null;
}
