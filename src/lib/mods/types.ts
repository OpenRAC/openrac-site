/**
 * The mod index, format 1: what openrac-mods' tools/build_index.py publishes and both this site and the
 * launcher read. Fields not listed here are ignored, so a newer index still loads.
 */

export type ModType = "script" | "native" | "data" | "pack";
export type Impact = "cosmetic" | "gameplay" | "speedrun-safe" | "touches-saves" | "online";

/** A picture, already resized by the index build: each width exists as AVIF and WebP. */
export interface ModImage {
  hash: string;
  widths: number[];
  width: number;
  height: number;
  thumbhash?: string;
  alt?: string;
  caption?: string;
}

export interface ModVideo {
  youtube: string;
  title?: string;
  caption?: string;
  uploaded?: string;
}

export interface Requirement {
  id: string;
  /** `>=X.Y.Z`, `=X.Y.Z`, or absent for any version. */
  version?: string;
}

export interface ModConflict {
  id: string;
  reason?: string;
}

export interface PlatformFile {
  asset: string;
  sha256: string;
  size: number;
}

export interface ModVersion {
  version: string;
  /** The mod interface it was written for, `MAJOR.MINOR`; null for data packs and modpacks. */
  api: string | null;
  games: Record<string, string[]>;
  requires: Requirement[];
  conflicts: ModConflict[];
  hooks?: string[];
  tag: string;
  released: string;
  prerelease: boolean;
  changelog: string;
  size: number;
  files: string[];
  platforms: Record<string, PlatformFile>;
}

export interface Mod {
  id: string;
  name: string;
  author: string;
  description: string;
  license?: string;
  homepage?: string;
  repo: string;
  path?: string;
  type: ModType;
  games: Record<string, string[]>;
  tags: string[];
  impact: Impact[];
  aliases?: string[];
  links?: { bugs?: string; discord?: string; docs?: string };
  downloads: number;
  downloads7d: number;
  created: string;
  updated: string;
  featured: boolean;
  /** What the author stated about AI tools helping to make the mod; absent when they have not said. */
  aiAssisted?: boolean;
  recommends: string[];
  suggests: string[];
  readme?: string;
  media: {
    icon: ModImage | null;
    banner: ModImage | null;
    screenshots: ModImage[];
    videos: ModVideo[];
  };
  /** Newest first. */
  versions: ModVersion[];
  /** Number of its GitHub Discussion in the index repository, once the bot has made one. */
  discussion?: number;
}

export interface Revoked {
  id: string;
  /** `["*"]` for every version. */
  versions: string[];
  reason: string;
}

export interface Port {
  launcher: string | null;
  api: string | null;
}

export interface ModIndex {
  format: number;
  serial: number;
  generated: string;
  expires: string;
  source: string;
  /** Base URL of the media files, ending in `/`. */
  media: string;
  ports: { stable: Port; dev: Port };
  tags: string[];
  mods: Mod[];
  revoked: Revoked[];
}

/** A mod as the site keeps it after merging indexes: which index it came from travels with it. */
export interface ListedMod extends Mod {
  /** The media base of its index, for the media route. */
  mediaBase: string;
  /** The repository of its index (where its Discussion lives). */
  indexSource: string;
}

/** Every index merged, plus how fresh the data is. */
export interface ModCatalog {
  mods: ListedMod[];
  revoked: Revoked[];
  ports: { stable: Port; dev: Port };
  tags: string[];
  generated: string | null;
  /** True when the data is older than its index allows, or comes from the last good copy after a failure. */
  stale: boolean;
}
