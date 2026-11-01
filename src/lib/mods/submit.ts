import type { ListedMod } from "./types.ts";

/**
 * The checks behind /mods/submit: is this GitHub repository ready to be listed? The same rules the
 * index build applies (openrac-mods' tools/build_index.py) and the launcher enforces, asked early so an
 * author sees every problem with its fix before opening the submission. Only GitHub's API is ever
 * called, and only for a repository address that matches a strict pattern (no other host can be
 * reached through here).
 */

const REPO_URL = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const API = /^\d+\.\d+$/;
const PLATFORMS = ["macos-arm64", "macos-x86_64", "linux-x86_64", "linux-aarch64", "windows-x86_64", "windows-arm64", "android-arm64"];

export const SDK = "https://github.com/OpenRAC/OpenRAC/blob/develop/sdk/docs";

export function parseRepo(input: string): { owner: string; repo: string } | null {
  const m = REPO_URL.exec(input.trim());
  if (!m || m[2] === "." || m[2] === "..") return null;
  return { owner: m[1], repo: m[2] };
}

export interface Check {
  ok: boolean;
  label: string;
  /** One line on how to fix it, when it is not ok. */
  fix?: string;
  link?: string;
}

export interface FoundMod {
  id: string;
  name: string;
  version: string;
  type: string;
  path: string;
  requires: string[];
  checks: Check[];
}

export interface SubmitCheck {
  repo: string;
  checks: Check[];
  mods: FoundMod[];
  /** True when every check passed and at least one mod is ready. */
  ready: boolean;
}

/** GitHub API GET: the parsed JSON, `null` for a 404, an Error otherwise. */
export type GitHubGet = (path: string) => Promise<unknown | null>;

type Manifest = Record<string, unknown> & { requires?: { id?: unknown }[] };

function checkManifest(m: Manifest): Check[] {
  const type = m.type === "script" ? "script" : m.format === 1 ? "data" : "native";
  const games = m.games && typeof m.games === "object" && !Array.isArray(m.games) && Object.values(m.games).every((d) => Array.isArray(d) && d.length > 0);
  return [
    { ok: typeof m.id === "string" && ID.test(m.id) && m.id.length <= 64, label: "The id is lower-case letters, digits and single hyphens", fix: 'Set "id" like "big-jump".', link: `${SDK}/manifest.md` },
    { ok: typeof m.name === "string" && m.name.trim().length > 0, label: "It has a name", fix: 'Add "name": what players see.', link: `${SDK}/manifest.md` },
    { ok: typeof m.version === "string" && SEMVER.test(m.version), label: "The version is MAJOR.MINOR.PATCH", fix: 'Set "version" like "1.0.0".', link: `${SDK}/manifest.md` },
    { ok: type === "data" || (typeof m.api === "string" && API.test(m.api)), label: "It names the mod interface it was made for", fix: 'Set "api" like "1.1".', link: `${SDK}/manifest.md` },
    { ok: !!games, label: "It names its games and discs", fix: 'Set "games" like {"rac1": ["pal", "ntsc"]}.', link: `${SDK}/manifest.md` },
    // Not "plugin": packaging adds it, so a repository's own manifest rightly has none. The release's archives show a mod is built.
  ];
}

const decode = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0)));

/** Runs every check against GitHub through `get`. `listed` is the current mod list, for "is the id free". */
export async function checkSubmission(input: string, get: GitHubGet, listed: ListedMod[]): Promise<SubmitCheck | { error: string }> {
  const parsed = parseRepo(input);
  if (!parsed) return { error: "That is not a GitHub repository address. It looks like https://github.com/you/your-mod." };
  const { owner, repo } = parsed;
  const base = `/repos/${owner}/${repo}`;
  const url = `https://github.com/${owner}/${repo}`;
  const checks: Check[] = [];

  const info = (await get(base)) as { private?: boolean; default_branch?: string; full_name?: string } | null;
  checks.push({ ok: !!info && info.private === false, label: "The repository is public", fix: info ? "Make it public: the launcher reads it without an account." : "No repository at that address. Check the spelling.", link: url });
  if (!info || info.private) return { repo: url, checks, mods: [], ready: false };

  // The manifests: at the top for one mod, or one folder down for several.
  const tree = (await get(`${base}/git/trees/${encodeURIComponent(info.default_branch ?? "HEAD")}?recursive=1`)) as { tree?: { path: string; type: string }[] } | null;
  const paths = (tree?.tree ?? []).filter((t) => t.type === "blob" && /^(?:[^/]+\/)?openrac-mod\.json$/.test(t.path)).map((t) => t.path).slice(0, 20);
  checks.push({ ok: paths.length > 0, label: "An openrac-mod.json is in the repository", fix: "Put openrac-mod.json at the top, or one in each mod's folder.", link: `${SDK}/install-from-link.md` });

  const release = (await get(`${base}/releases/latest`)) as { tag_name?: string; assets?: { name: string }[] } | null;
  const assets = new Set((release?.assets ?? []).map((a) => a.name));

  const byId = new Map(listed.map((m) => [m.id, m]));
  const mods: FoundMod[] = [];
  for (const path of paths) {
    const file = (await get(`${base}/contents/${path.split("/").map(encodeURIComponent).join("/")}`)) as { content?: string } | null;
    let m: Manifest;
    try {
      m = JSON.parse(decode(file?.content ?? "")) as Manifest;
    } catch {
      mods.push({ id: path, name: path, version: "", type: "", path, requires: [], checks: [{ ok: false, label: "The manifest is valid JSON", fix: "Check it with the SDK's tools/package_mod.py --check.", link: `${SDK}/manifest.md` }] });
      continue;
    }
    if (m.format === 1 && !m.id) continue; // a level-editor data pack without an id is not listable by itself
    const id = String(m.id ?? "");
    const version = String(m.version ?? "");
    const type = m.type === "script" ? "script" : m.format === 1 ? "data" : "native";
    const requires = (m.requires ?? []).map((r) => String(r?.id ?? "")).filter(Boolean);
    const mine = checkManifest(m);
    const taken = byId.get(id);
    const sameRepo = taken && taken.repo.replace(/\/$/, "").toLowerCase() === url.toLowerCase();
    mine.push({
      ok: !taken,
      label: sameRepo ? "Already listed: new releases reach players by themselves" : "The id is free",
      fix: sameRepo ? "Nothing to do. To change its page, use the Update listing form." : "Another mod has this id. Pick another one before your first release.",
    });
    const missing = requires.filter((r) => !byId.has(r));
    mine.push({ ok: missing.length === 0, label: "Everything it requires is listed", fix: `List these first, or drop them from "requires": ${missing.join(", ")}.` });
    if (type === "native") {
      const archives = PLATFORMS.filter((p) => assets.has(`${id}-${version}-${p}.zip`));
      // The usual slip: the tag's "v" in the file's name.
      const withV = PLATFORMS.find((p) => assets.has(`${id}-v${version}-${p}.zip`));
      mine.push({
        ok: !!release && archives.length > 0,
        label: "The latest release has its archives",
        fix: !release
          ? "Make a release: tag a version and the template's workflow builds it."
          : withV
            ? `${id}-v${version}-${withV}.zip must be named ${id}-${version}-${withV}.zip: no "v" before the version.`
            : `Release ${id}-${version}-<system>.zip files: the template's workflow does it on a tag.`,
        link: `${SDK}/packaging-and-releases.md`,
      });
      if (release) {
        mine.push({
          ok: assets.has("SHA256SUMS"),
          label: "The latest release has SHA256SUMS",
          fix: "Upload SHA256SUMS to this release (sha256sum *.zip > SHA256SUMS): the launcher checks each download against it. The template's workflow does it on a tag.",
          link: `${SDK}/packaging-and-releases.md`,
        });
      }
    }
    mods.push({ id, name: String(m.name ?? id), version, type, path: path.replace(/\/?openrac-mod\.json$/, ""), requires, checks: mine });
  }
  const ready = checks.every((c) => c.ok) && mods.some((m) => m.checks.every((c) => c.ok));
  return { repo: url, checks, mods, ready };
}

/** The pre-filled GitHub issue form for a submission (field ids: the contract's "Submission issue form"). */
export function issueUrl(index: string, fields: Record<string, string>): string {
  const q = new URLSearchParams({ template: "submit-mod.yml", ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v)) });
  return `${index.replace(/\/$/, "")}/issues/new?${q}`;
}
