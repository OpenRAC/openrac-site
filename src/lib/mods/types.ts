/**
 * The mod index, format 1: what openrac-mods' tools/build_index.py publishes and both this site and the
 * launcher read. Fields not listed here are ignored, so a newer index still loads.
 */

export type ModType = "script" | "native" | "data" | "pack";
/** How much OpenRAC checked a mod: its own repository, looked at when added, a trusted author, or none. */
export type Trust = "openrac" | "verified" | "trusted" | "unchecked";
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
  /** What the scan of a native version's files found it can reach; `new` is what the version before could not. */
  scan?: { labels: string[]; new: string[] };
  /** The newest native version only: `ci` when the mod's own CI built it from its tag, else `hand`. */
  built?: "ci" | "hand";
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
  /**
   * The file `readme` was read from, a path from the mod's folder (`README.md`, or another Markdown file the
   * listing names). Absent in older indexes and for modpacks, whose readme is the listing's own text.
   */
  readmeFile?: string;
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
  /** How much OpenRAC checked it; absent in older indexes. */
  trust?: Trust;
  /** The GitHub account an outside mod's repository belongs to. */
  owner?: { login: string; id: number | null };
  /** Its newest version is held for a person to look at (the scan found something): the mod is not shown. */
  held?: { version: string; reasons: string[] };
  /** The file with its readme and changelogs, named with its SHA-256 (the index may leave those texts out). */
  details?: { asset: string; sha256: string };
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
  /** The weekly picks: up to three mod ids per game. */
  picks?: { week: string; games: Record<string, string[]> };
}

/** A mod as the site keeps it after merging indexes: which index it came from travels with it. */
export interface ListedMod extends Mod {
  /** The media base of its index, for the media route. */
  mediaBase: string;
  /** The repository of its index (where its Discussion lives). */
  indexSource: string;
  /** The folder URL of its index file, ending in `/` (its details file is there). */
  indexBase?: string;
}

/** Every index merged, plus how fresh the data is. */
export interface ModCatalog {
  mods: ListedMod[];
  revoked: Revoked[];
  ports: { stable: Port; dev: Port };
  tags: string[];
  picks?: { week: string; games: Record<string, string[]> };
  generated: string | null;
  /** True when the data is older than its index allows, or comes from the last good copy after a failure. */
  stale: boolean;
}
