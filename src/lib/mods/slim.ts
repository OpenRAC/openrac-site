import { thumbHashToAverageRGBA } from "thumbhash";
import { latest, worksWith, type Works } from "./logic.ts";
import type { Impact, ListedMod, ModCatalog, ModImage, ModType, Requirement } from "./types.ts";

/**
 * What the mod list sends to the browser: one card's worth per mod (a few hundred bytes), never the
 * versions, files, changelogs or README. Those stay on the server and are rendered into each mod's page.
 */

export interface SlimImage {
  hash: string;
  widths: number[];
  w: number;
  h: number;
  /** The picture's average colour, shown until it loads. */
  color: string;
}

export interface SlimMod {
  id: string;
  name: string;
  author: string;
  description: string;
  type: ModType;
  games: Record<string, string[]>;
  tags: string[];
  impact: Impact[];
  aliases?: string[];
  downloads: number;
  downloads7d: number;
  created: string;
  updated: string;
  featured: boolean;
  aiAssisted?: boolean;
  works: Works;
  version: string;
  size: number;
  native: boolean;
  requires: Requirement[];
  conflicts: string[];
  recommends: string[];
  suggests: string[];
  card: SlimImage | null;
  shots: SlimImage[];
  hasVideo: boolean;
}

/** A ThumbHash's average colour as CSS; the panel colour when there is none or it cannot be read. */
export function averageColor(thumbhash?: string): string {
  if (!thumbhash) return "#1d1d27";
  try {
    const bin = Uint8Array.from(atob(thumbhash), (c) => c.charCodeAt(0));
    const { r, g, b } = thumbHashToAverageRGBA(bin);
    const c = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255);
    return `rgb(${c(r)} ${c(g)} ${c(b)})`;
  } catch {
    return "#1d1d27";
  }
}

const slimImage = (i: ModImage | null | undefined): SlimImage | null => (i ? { hash: i.hash, widths: i.widths, w: i.width, h: i.height, color: averageColor(i.thumbhash) } : null);

export function slim(m: ListedMod, catalog: Pick<ModCatalog, "ports" | "revoked">): SlimMod {
  const v = latest(m, catalog.revoked);
  return {
    id: m.id,
    name: m.name,
    author: m.author,
    description: m.description,
    type: m.type,
    games: m.games,
    tags: m.tags,
    impact: m.impact,
    ...(m.aliases?.length && { aliases: m.aliases }),
    downloads: m.downloads,
    downloads7d: m.downloads7d,
    created: m.created,
    updated: m.updated,
    featured: m.featured,
    ...(m.aiAssisted === true && { aiAssisted: true }),
    works: worksWith(m, catalog.ports, catalog.revoked),
    version: v?.version ?? m.versions[0].version,
    size: v?.size ?? 0,
    native: m.type === "native",
    requires: v?.requires ?? [],
    conflicts: v?.conflicts.map((c) => c.id) ?? [],
    recommends: m.recommends,
    suggests: m.suggests,
    card: slimImage(m.media.banner ?? m.media.screenshots[0]),
    shots: m.media.screenshots.slice(0, 3).flatMap((s) => slimImage(s) ?? []),
    hasVideo: m.media.videos.length > 0,
  };
}

export interface SlimChangeSet {
  install: { mod: SlimMod; auto: boolean }[];
  missing: string[];
  conflicts: { a: SlimMod; b: SlimMod }[];
  recommends: SlimMod[];
  suggests: SlimMod[];
  native: SlimMod[];
}

/** The browser's view of what a set of picks installs: same order as the launcher (requirements first). */
export function slimChangeSet(mods: SlimMod[], ids: string[]): SlimChangeSet {
  const byId = new Map(mods.map((m) => [m.id, m]));
  const wanted = new Set(ids);
  const placed = new Set<string>();
  const visiting = new Set<string>();
  const missing = new Set<string>();
  const install: SlimChangeSet["install"] = [];
  const visit = (id: string) => {
    if (placed.has(id) || visiting.has(id)) return;
    const m = byId.get(id);
    if (!m) return void missing.add(id);
    visiting.add(id);
    m.requires.forEach((r) => visit(r.id));
    visiting.delete(id);
    placed.add(id);
    install.push({ mod: m, auto: !wanted.has(id) });
  };
  ids.forEach(visit);
  const conflicts: SlimChangeSet["conflicts"] = [];
  for (const { mod } of install)
    for (const c of mod.conflicts) {
      const other = byId.get(c);
      if (other && placed.has(c) && !conflicts.some((x) => x.a.id === c && x.b.id === mod.id)) conflicts.push({ a: mod, b: other });
    }
  const extra = (key: "recommends" | "suggests", skip: Set<string>) =>
    [...new Set(install.flatMap(({ mod }) => mod[key]))].filter((id) => !placed.has(id) && !skip.has(id)).flatMap((id) => byId.get(id) ?? []);
  const recommends = extra("recommends", new Set());
  return {
    install,
    missing: [...missing],
    conflicts,
    recommends,
    suggests: extra("suggests", new Set(recommends.map((m) => m.id))),
    native: install.filter(({ mod }) => mod.native).map(({ mod }) => mod),
  };
}

/** A ThumbHash as a tiny blurred PNG, for the page hero to show at once (made on the server only). */
export async function thumbDataUrl(thumbhash?: string): Promise<string | undefined> {
  if (!thumbhash) return undefined;
  try {
    const { thumbHashToDataURL } = await import("thumbhash");
    return thumbHashToDataURL(Uint8Array.from(atob(thumbhash), (c) => c.charCodeAt(0)));
  } catch {
    return undefined;
  }
}

export const slimImageOf = slimImage;
