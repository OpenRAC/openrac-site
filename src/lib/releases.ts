/** The launcher's repository: its releases are what the Download panel offers. */
const LAUNCHER_REPO = "OpenRAC/OpenRAC";

export type PlatformId = "windows" | "macos" | "linux" | "android";

/** One file of a release a player can install. */
export interface Download {
  /** What it is, as a player reads it: "Installer (.exe)", "AppImage · ARM64". */
  label: string;
  url: string;
  size: number;
}

/** One system's column in the Download panel: its main file first, the other formats after. */
export interface Platform {
  id: PlatformId;
  name: string;
  /** The systems and devices it runs on, a short line each. */
  supports: string[];
  main: Download | null;
  others: Download[];
}

export interface LauncherRelease {
  version: string;
  /** When it was published, ISO 8601. */
  date: string;
  url: string;
  platforms: Platform[];
}

/** The part of GitHub's release object that is read here. */
export interface GithubRelease {
  tag_name: string;
  name?: string | null;
  html_url: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string; size: number }[];
}

const PLATFORMS: { id: PlatformId; name: string }[] = [
  { id: "windows", name: "Windows" },
  { id: "linux", name: "Linux" },
  { id: "macos", name: "macOS" },
  { id: "android", name: "Android" },
];

/**
 * What each system needs, from the launcher's build (OpenRAC's .github/workflows/launcher.yml):
 * Windows x64; Linux built on Ubuntu 22.04, so glibc 2.35 or later; the macOS game is Apple
 * silicon's; Android 9 (minSdk 28) is the launcher's floor.
 */
const SUPPORTS: Record<PlatformId, string[]> = {
  windows: ["Windows 10 and 11", "64-bit PCs (x64)"],
  linux: ["Ubuntu 22.04, Debian 12, Fedora 36, SteamOS or newer", "x86-64 and ARM64"],
  macos: ["Macs with Apple silicon (M1 or newer)"],
  android: ["Android 9 or newer", "64-bit ARM phones and handhelds", "Mali or Adreno GPU with OpenGL ES 3.2"],
};

const arch = (name: string) => (/aarch64|arm64/i.test(name) ? "ARM64" : "x86-64");

/**
 * Which system a file is for and how it is named, or null for what a player never installs
 * by hand: signatures, the updater's manifest and its archives.
 * The names are the ones Tauri's bundler gives them: OpenRAC.Launcher_0.9.0_x64-setup.exe,
 * …_amd64.AppImage, …-1.fc44.x86_64.rpm, …_android-arm64-debug.apk.
 */
export function classify(name: string): { platform: PlatformId; label: string; rank: number } | null {
  if (/\.sig$|\.json$|\.tar\.gz$|\.zip$/i.test(name)) return null;
  if (/-setup\.exe$/i.test(name)) return { platform: "windows", label: "Installer (.exe)", rank: 0 };
  if (/\.msi$/i.test(name)) return { platform: "windows", label: "Windows Installer (.msi)", rank: 1 };
  if (/\.dmg$/i.test(name)) return { platform: "macos", label: "Disk image (.dmg)", rank: 0 };
  if (/\.apk$/i.test(name)) return { platform: "android", label: "APK · 64-bit ARM", rank: 0 };
  const arm = arch(name) === "ARM64" ? 10 : 0;
  if (/\.AppImage$/i.test(name)) return { platform: "linux", label: `AppImage · ${arch(name)}`, rank: 0 + arm };
  if (/\.deb$/i.test(name)) return { platform: "linux", label: `.deb (Debian, Ubuntu) · ${arch(name)}`, rank: 1 + arm };
  if (/\.fc\d+\.[^.]+\.rpm$/i.test(name)) return { platform: "linux", label: `.rpm for Fedora · ${arch(name)}`, rank: 2 + arm };
  if (/\.rpm$/i.test(name)) return { platform: "linux", label: `.rpm · ${arch(name)}`, rank: 3 + arm };
  return null;
}

/** The newest published launcher release: not a draft, not a development build, tagged `launcher-v…`. */
export function pickLatest(releases: GithubRelease[]): GithubRelease | null {
  return releases.find((r) => !r.draft && !r.prerelease && r.tag_name.startsWith("launcher-v")) ?? null;
}

/** A release as the Download panel shows it: one entry per system, in a fixed order, even one without files. */
export function toLauncherRelease(release: GithubRelease): LauncherRelease {
  const files = release.assets
    .flatMap((a) => {
      const c = classify(a.name);
      return c ? [{ ...c, download: { label: c.label, url: a.browser_download_url, size: a.size } }] : [];
    })
    .sort((a, b) => a.rank - b.rank);
  return {
    version: release.tag_name.replace(/^launcher-v/, ""),
    date: release.published_at ?? "",
    url: release.html_url,
    platforms: PLATFORMS.map(({ id, name }) => {
      const [main = null, ...others] = files.filter((f) => f.platform === id).map((f) => f.download);
      return { id, name, supports: SUPPORTS[id], main, others };
    }),
  };
}

/** The newest development build: what CI publishes from every merge to master, one main file per system. */
export interface DevBuild {
  version: string;
  /** When it was published, ISO 8601. */
  date: string;
  url: string;
  files: Partial<Record<PlatformId, Download>>;
}

/** The pre-release the launcher workflow replaces on every push to master (its docs/RELEASING.md). */
export const DEV_TAG = "launcher-dev-master";

/** A development pre-release as the panel shows it: each system's main file, and the version from its title ("v0.9.1-dev.86 (master)"). */
export function toDevBuild(release: GithubRelease): DevBuild {
  const stable = toLauncherRelease(release);
  const version = /\d+\.\d+\.\d+-dev\.\d+/.exec(release.name ?? "")?.[0] ?? "";
  const files: DevBuild["files"] = {};
  for (const p of stable.platforms) if (p.main) files[p.id] = p.main;
  return { version, date: stable.date, url: stable.url, files };
}

/** Every system with no file: what the panel shows when GitHub cannot be reached. */
export const noFiles = (): Platform[] =>
  toLauncherRelease({ tag_name: "", html_url: "", published_at: null, draft: false, prerelease: false, assets: [] }).platforms;

/** GitHub's API, read on the server and cached for five minutes (the home page is rebuilt as often), so a new build shows without redeploying the site. Null if unreachable. */
async function github<T>(path: string): Promise<T | null> {
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  // Optional, only raises the rate limit. Never sent to the browser.
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${LAUNCHER_REPO}/${path}`, { headers, next: { revalidate: 300 }, signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** The latest launcher release, or null. */
export async function getLauncherRelease(): Promise<LauncherRelease | null> {
  const release = pickLatest((await github<GithubRelease[]>("releases?per_page=30")) ?? []);
  return release ? toLauncherRelease(release) : null;
}

/** The latest development build from master, or null. */
export async function getDevBuild(): Promise<DevBuild | null> {
  const release = await github<GithubRelease>(`releases/tags/${DEV_TAG}`);
  return release && !release.draft ? toDevBuild(release) : null;
}
