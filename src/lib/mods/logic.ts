import type { Impact, ListedMod, Mod, ModImage, ModType, ModVersion, Port, Revoked } from "./types.ts";

/**
 * Pure helpers over the mod index: versions, what runs on which launcher, dependencies, ordering and
 * the install link. No fetching, so the same code serves the server, the browser and the tests. The
 * launcher decides for real (its own resolver, core/src/index.rs); these only tell the visitor what to expect.
 */

// ---------- versions ----------

type Semver = { nums: [number, number, number]; pre: string };

export function parseSemver(v: string): Semver | null {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(v.trim());
  return m ? { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? "" } : null;
}

/** Negative when a < b. A pre-release comes before its release (2.0.0-beta < 2.0.0). */
export function compareSemver(a: string, b: string): number {
  const x = parseSemver(a);
  const y = parseSemver(b);
  if (!x || !y) return a.localeCompare(b);
  for (let i = 0; i < 3; i++) if (x.nums[i] !== y.nums[i]) return x.nums[i] - y.nums[i];
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre.localeCompare(y.pre, "en", { numeric: true });
}

/** A manifest constraint: `>=X.Y.Z`, `=X.Y.Z`, or none. */
export function meets(version: string, constraint?: string): boolean {
  if (!constraint) return true;
  const c = constraint.trim();
  if (c.startsWith(">=")) return compareSemver(version, c.slice(2).trim()) >= 0;
  if (c.startsWith("=")) return compareSemver(version, c.slice(1).trim()) === 0;
  return false;
}

/** The launcher's rule (plugins.rs): same major, and a minor no newer than the launcher's. */
export function apiFits(modApi: string | null, launcherApi: string | null): boolean {
  if (modApi == null) return true;
  if (!launcherApi) return false;
  const [mM, mm] = modApi.split(".").map(Number);
  const [lM, lm] = launcherApi.split(".").map(Number);
  return mM === lM && mm <= lm;
}

export function isRevoked(revoked: Revoked[], id: string, version: string): boolean {
  return revoked.some((r) => r.id === id && (r.versions.includes("*") || r.versions.includes(version)));
}

/** Taken off the list as a whole (every version revoked): its page stays, but it is no longer offered. */
export const isWithdrawn = (revoked: Revoked[], id: string) => revoked.some((r) => r.id === id && r.versions.includes("*"));

/** The versions a player may be offered, newest first. */
export function offered(mod: Mod, revoked: Revoked[], prerelease = false): ModVersion[] {
  return mod.versions.filter((v) => !isRevoked(revoked, mod.id, v.version) && (prerelease || !v.prerelease));
}

/** The newest version shown by default: not revoked, not a pre-release (falls back to a pre-release if that is all there is). */
export function latest(mod: Mod, revoked: Revoked[]): ModVersion | undefined {
  return offered(mod, revoked)[0] ?? offered(mod, revoked, true)[0];
}

export type Works = "release" | "dev" | "none";

/** Whether a launcher release can run the mod, only a dev build can, or neither (a newer API than either has). */
export function worksWith(mod: Mod, ports: { stable: Port; dev: Port }, revoked: Revoked[]): Works {
  const versions = offered(mod, revoked);
  if (versions.some((v) => apiFits(v.api, ports.stable.api))) return "release";
  if (offered(mod, revoked, true).some((v) => apiFits(v.api, ports.dev.api))) return "dev";
  return "none";
}

/** The newest version a launcher with this API can load. */
export function newestFitting(mod: Mod, revoked: Revoked[], api: string | null, prerelease = false): ModVersion | undefined {
  return offered(mod, revoked, prerelease).find((v) => apiFits(v.api, api));
}

export function runsOn(mod: Mod, game: string, disc?: string): boolean {
  const discs = mod.games[game];
  return !!discs && (!disc || discs.includes(disc));
}

// ---------- relationships ----------

/** Mods whose newest version needs this one ("Used by"). */
export function dependents(mods: Mod[], id: string, revoked: Revoked[] = []): Mod[] {
  return mods.filter((m) => m.id !== id && latest(m, revoked)?.requires.some((r) => r.id === id));
}

export interface ChangeSet {
  /** In install order: dependencies before the mods that need them. */
  install: { mod: ListedMod; version: ModVersion; auto: boolean }[];
  missing: string[];
  conflicts: { a: string; b: string; reason?: string }[];
  recommends: ListedMod[];
  suggests: ListedMod[];
}

/**
 * What installing `ids` brings along, as the launcher will see it: each mod's newest release version,
 * its requirements first. Recommends and suggests are offered, never added on their own.
 */
export function changeSet(mods: ListedMod[], ids: string[], revoked: Revoked[], api: string | null = null): ChangeSet {
  const byId = new Map(mods.map((m) => [m.id, m]));
  const out: ChangeSet["install"] = [];
  const placed = new Set<string>();
  const visiting = new Set<string>();
  const missing = new Set<string>();
  const wanted = new Set(ids);

  const pick = (m: ListedMod) => (api ? newestFitting(m, revoked, api) : undefined) ?? latest(m, revoked);
  const visit = (id: string) => {
    if (placed.has(id) || visiting.has(id)) return; // a cycle is refused by the index build; never loop here
    const m = byId.get(id);
    const v = m && pick(m);
    if (!m || !v) return void missing.add(id);
    visiting.add(id);
    for (const r of v.requires) visit(r.id);
    visiting.delete(id);
    placed.add(id);
    out.push({ mod: m, version: v, auto: !wanted.has(id) });
  };
  ids.forEach(visit);

  const conflicts: ChangeSet["conflicts"] = [];
  for (const { mod, version } of out)
    for (const c of version.conflicts)
      if (placed.has(c.id) && !conflicts.some((x) => (x.a === c.id && x.b === mod.id) || (x.a === mod.id && x.b === c.id)))
        conflicts.push({ a: mod.id, b: c.id, reason: c.reason });

  const extra = (key: "recommends" | "suggests") =>
    [...new Set(out.flatMap(({ mod }) => mod[key]))].filter((id) => !placed.has(id)).flatMap((id) => byId.get(id) ?? []);
  return { install: out, missing: [...missing], conflicts, recommends: extra("recommends"), suggests: extra("suggests").filter((m) => !extra("recommends").includes(m)) };
}

// ---------- ordering ----------

const DAY = 86_400_000;

/**
 * Hacker News-style decay (righto.com/2013/11): recent downloads over the age of the newest
 * release. A new mod that people pick up can pass an old one with a big total.
 */
export function trendingScore(mod: Pick<Mod, "downloads7d" | "updated">, now: number): number {
  const days = Math.max(0, (now - Date.parse(mod.updated)) / DAY);
  return (mod.downloads7d + 1) / Math.pow(days + 2, 1.5);
}

export type Sort = "trending" | "downloads" | "updated" | "new" | "name";
export const SORTS: { id: Sort; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "downloads", label: "Most downloaded" },
  { id: "updated", label: "Recently updated" },
  { id: "new", label: "Newest" },
  { id: "name", label: "A–Z" },
];

export function sortMods<T extends Pick<Mod, "name" | "downloads" | "downloads7d" | "updated" | "created">>(mods: T[], sort: Sort, now: number): T[] {
  const key: Record<Sort, (m: T) => number | string> = {
    trending: (m) => -trendingScore(m, now),
    downloads: (m) => -m.downloads,
    updated: (m) => -Date.parse(m.updated),
    new: (m) => -Date.parse(m.created),
    name: (m) => m.name.toLowerCase(),
  };
  const k = key[sort];
  return [...mods].sort((a, b) => {
    const x = k(a);
    const y = k(b);
    return x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name);
  });
}

/** Mods new or updated in the last two weeks, for the "New & updated" row. */
export const isFresh = (mod: Pick<Mod, "created" | "updated">, now: number) => now - Date.parse(mod.updated) < 14 * DAY || now - Date.parse(mod.created) < 14 * DAY;

/**
 * The time a page is rendered at. Pages are static and rebuilt every few minutes, so "3d ago" is
 * reckoned from the build, not from each visit; a named helper keeps that one choice in one place.
 */
export const renderedAt = () => Date.now();

// ---------- links ----------

export interface Wanted {
  id: string;
  version?: string;
}

const list = (mods: Wanted[]) => mods.map((m) => (m.version ? `${m.id}@${m.version}` : m.id)).join(",");

/** The launcher's URL scheme (the contract's "Deep link"). One mod gets the short form. */
export function installUrl(mods: Wanted[], hints: { game?: string; disc?: string } = {}): string {
  const extra = [hints.game && `game=${hints.game}`, hints.disc && `disc=${hints.disc}`].filter(Boolean).join("&");
  if (mods.length === 1 && !extra) return `openrac://install/${list(mods)}`;
  return `openrac://install?mods=${list(mods)}${extra ? `&${extra}` : ""}`;
}

/**
 * The same link for Chrome on Android: with no launcher installed, Chrome goes to the fallback by itself
 * instead of doing nothing (developer.chrome.com/docs/android/intents).
 */
export function intentUrl(mods: Wanted[], fallback: string): string {
  return `intent://install?mods=${list(mods)}#Intent;scheme=openrac;package=dev.openrac.launcher;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

// ---------- media ----------

/** Pictures are served by this site (src/app/mods/media), never hot-linked: visitors only ever talk to openrac.dev. */
export const mediaSrc = (img: Pick<ModImage, "hash">, width: number, ext: "avif" | "webp") => `/mods/media/${img.hash}-${width}.${ext}`;

export const srcSet = (img: ModImage, ext: "avif" | "webp") => img.widths.map((w) => `${mediaSrc(img, w, ext)} ${w}w`).join(", ");

/** The largest width no bigger than `max`, or the smallest there is. */
export const widthFor = (img: ModImage, max: number) => [...img.widths].sort((a, b) => b - a).find((w) => w <= max) ?? Math.min(...img.widths);

/** YouTube's own thumbnail, fetched and resized by this server (next.config.ts allows i.ytimg.com/vi/**). */
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// ---------- words ----------

export const TYPE_LABEL: Record<ModType, string> = { script: "Script", native: "Native", data: "Data pack", pack: "Modpack" };
export const IMPACT_LABEL: Record<Impact, string> = {
  cosmetic: "Cosmetic only",
  gameplay: "Changes gameplay",
  "speedrun-safe": "Speedrun-safe",
  "touches-saves": "Touches saves",
  online: "Online",
};
export const GAME_LABEL: Record<string, string> = {
  rac1: "Ratchet & Clank",
  rac2: "Going Commando",
  rac3: "Up Your Arsenal",
  rac4: "Deadlocked",
  rac5: "Size Matters",
  rac6: "Secret Agent Clank",
};
export const DISC_LABEL: Record<string, string> = { pal: "PAL", ntsc: "NTSC-U", "ntsc-j": "NTSC-J" };
export const PLATFORM_LABEL: Record<string, string> = {
  any: "Any system",
  "linux-x86_64": "Linux",
  "linux-aarch64": "Linux ARM",
  "windows-x86_64": "Windows",
  "windows-arm64": "Windows ARM",
  "macos-arm64": "macOS",
  "macos-x86_64": "macOS Intel",
  "android-arm64": "Android",
};

/** 3412 → "3.4k"; the exact number goes in a title. */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/** "today", "3d ago", "5w ago", "4mo ago", "2y ago". */
export function ago(iso: string, now: number): string {
  const d = Math.floor((now - Date.parse(iso)) / DAY);
  if (d < 1) return "today";
  if (d < 14) return `${d}d ago`;
  if (d < 60) return `${Math.floor(d / 7)}w ago`;
  if (d < 730) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

export const discs = (games: Record<string, string[]>) => Object.entries(games).flatMap(([g, ds]) => ds.map((d) => ({ game: g, disc: d })));

// ---------- shared setups ----------

export interface SetupEntry {
  id: string;
  version: string;
}

/**
 * A "Share my setup" link's list (`?m=a@1.2.0,b@2.0.1`): exact versions only, valid ids, no
 * duplicates, at most 32 (the launcher's link limit). Anything else in it is dropped, not guessed.
 */
export function parseSetup(m: string | null | undefined): SetupEntry[] {
  const out: SetupEntry[] = [];
  for (const part of (m ?? "").split(",")) {
    const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(part.trim());
    if (match && match[1].length <= 64 && !out.some((e) => e.id === match[1])) out.push({ id: match[1], version: match[2] });
    if (out.length === 32) break;
  }
  return out;
}
