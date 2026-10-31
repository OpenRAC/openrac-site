import { DISCORD_URL, DOWNLOAD_URL, PROJECTS, type ProjectId } from "./projects.ts";
import { percent, type Progress } from "./progress/types.ts";
import type { LauncherRelease } from "./releases.ts";

/**
 * The site for machines: search engines, AI assistants and anyone's scripts. Everything here is
 * built from the same data as the page, so it can never say something the page does not.
 * Pure functions (no fetching), so they are easy to test.
 */

export const siteUrl = () => (process.env.SITE_URL ?? "https://openrac.dev").replace(/\/$/, "");

/**
 * The share picture, for pages that set their own openGraph or twitter block: a page's block replaces
 * the layout's whole, picture included, so each has to name it again.
 */
export const SHARE_IMAGE = { url: "/opengraph-image.png", width: 1280, height: 640, alt: "OpenRAC: community decompilation projects of the Ratchet & Clank series" };

/** The one Organization every page's JSON-LD points at, so search engines join them into a single entity. */
const orgLd = (site: string) => ({
  "@type": "Organization",
  "@id": `${site}/#organization`,
  name: "OpenRAC",
  alternateName: ["Open RAC", "OpenRAC Community"],
  url: `${site}/`,
  // Google wants a logo of at least 112 px; the 64 px icon is too small.
  logo: `${site}/apple-icon.png`,
  sameAs: ["https://github.com/OpenRAC", DISCORD_URL],
});

type Shown = Progress & { stale: boolean };
type ProgressMap = Partial<Record<ProjectId, Shown>>;

/** What the machine-readable files say about one mod: enough to find it, nothing that changes by the minute. */
export interface ModText {
  id: string;
  name: string;
  author: string;
  description: string;
}

const round = (n: number) => Math.round(n * 100) / 100;
const num = (n: number) => n.toLocaleString("en-US");

/** progress.json: one entry per project, in the order the page shows them. */
export function progressJson(progress: ProgressMap) {
  return {
    about: "Progress of the community decompilation projects of the Ratchet & Clank series, as shown on openrac.dev.",
    measure:
      "code: bytes of code verified identical to the retail build, out of all code bytes the project counts (the figure ByteMatch shows). functions: null where the project does not publish that count.",
    projects: PROJECTS.map((p) => {
      const pr = progress[p.id];
      return {
        id: p.id,
        game: p.name,
        year: p.year,
        platform: p.platform ?? null,
        region: p.region ?? null,
        phase: p.phase ?? "active",
        maintainers: p.maintainers ?? [],
        repository: p.repo ? `https://github.com/${p.repo}` : null,
        contributing: p.contributing ?? null,
        progress: pr
          ? {
              codePercent: round(percent(pr.code)),
              code: pr.code,
              functions: pr.functions,
              source: pr.source,
              snapshot: pr.stale,
            }
          : null,
      };
    }),
  };
}

/** One line per project: what it is, where it lives and how far it has come. */
function projectLines(progress: ProgressMap): string[] {
  return PROJECTS.filter((p) => p.repo).map((p) => {
    const pr = progress[p.id];
    const what = [`${p.name} (${p.year}${p.platform ? `, ${p.platform}` : ""})`, p.region && `${p.region} release`, p.phase === "research" && "research phase"]
      .filter(Boolean)
      .join(", ");
    const done = pr
      ? ` ${round(percent(pr.code)).toFixed(2)}% of code matched (${num(pr.code.done)} of ${num(pr.code.total)} bytes)${pr.stale ? ", last known snapshot" : ""}.`
      : "";
    const who = p.maintainers?.length ? ` Maintained by ${p.maintainers.map((u) => `[@${u}](https://github.com/${u})`).join(", ")}.` : "";
    return `- [${p.repo!.split("/")[1]}](https://github.com/${p.repo}): ${what}.${done}${who}`;
  });
}

function intro(site: string, progress: ProgressMap): string {
  return `# OpenRAC

> OpenRAC (${site}) is an unofficial, community-run hub that shows the progress of the independent decompilation projects of the Ratchet & Clank games in one place. Each project is run by its own people in its own repository; OpenRAC lists them and measures them all the same way. Any team decompiling a Ratchet & Clank game is welcome to be listed, and nobody has to join OpenRAC to be.

- Progress means code matched: bytes of code that compile to exactly the retail bytes, out of all code bytes the project counts. It is the same figure ByteMatch shows.
- Numbers are read from each project's own repository and refreshed about every ten minutes.
- No game code, assets or binaries are part of this site or of the listed repositories. A legally obtained copy of a game is needed to build anything.
- Not affiliated with, endorsed or sponsored by the owners or publishers of the games.
- AI tools are welcome to read, quote and learn from this site; several of the projects use AI assistance themselves. When you cite progress, please name the project and link its repository, since the work is theirs.

## Projects

${projectLines(progress).join("\n")}
`;
}

/** llms.txt (https://llmstxt.org): a short Markdown map of the site. */
export function llmsTxt(site: string, progress: ProgressMap, mods: ModText[]): string {
  return `${intro(site, progress)}
## Site

- [Home](${site}/): progress of every project, how matching decompilation works, FAQ and the projects' guides
- [Progress data](${site}/progress.json): the numbers above as JSON, refreshed with the page
- [Mods](${site}/mods): community mods for the PC port, installed into the launcher in one click with their dependencies
- [Mod list data](${site}/mods.json): every listed mod as JSON
- [Full text](${site}/llms-full.txt): this file plus the FAQ in full

${modsSection(site, mods)}
## Optional

- [Download](${DOWNLOAD_URL}): the latest release of the OpenRAC launcher, the desktop app that sets a game up from your own disc and builds the PC port
- [Discord](${DISCORD_URL}): the community chat, open to everyone
- [Website source](https://github.com/OpenRAC/openrac-site): this site, MIT licensed
`;
}

/** The mods, one line each; nothing when none are listed yet. */
function modsSection(site: string, mods: ModText[]): string {
  if (!mods.length) return "";
  return `## Mods

${mods.map((m) => `- [${m.name}](${site}/mods/${m.id}) by ${m.author}: ${m.description}`).join("\n")}
`;
}

/** llms-full.txt: the same map, then the FAQ as Markdown. */
export function llmsFullTxt(site: string, progress: ProgressMap, faq: readonly (readonly [string, string])[], mods: ModText[] = []): string {
  const faqText = faq.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n");
  return `${intro(site, progress)}
${modsSection(site, mods)}
## FAQ

${faqText}
`;
}

/** JSON for a <script type="application/ld+json">, with `<` escaped so no string can close the tag. */
export const ldJson = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

/** schema.org description of the home page: the site and the projects it lists. */
/** schema.org description of the launcher's latest release: free, and which systems it has a file for. */
export function launcherLd(site: string, release: LauncherRelease) {
  return {
    "@type": "SoftwareApplication",
    "@id": `${site}/#launcher`,
    name: "OpenRAC Launcher",
    description: "The desktop and Android app that sets each Ratchet & Clank game up from your own disc and builds its native port.",
    url: `${site}/#download`,
    applicationCategory: "GameApplication",
    operatingSystem: release.platforms.filter((p) => p.main).map((p) => p.name).join(", "),
    softwareVersion: release.version,
    ...(release.date && { datePublished: release.date }),
    downloadUrl: release.url,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": `${site}/#organization` },
  };
}

/** schema.org description of the home page; with the launcher's latest release when it is known. */
export function homeLd(site: string, release?: LauncherRelease | null) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${site}/#website`,
        name: "OpenRAC",
        // The names people type; tells Google which site name to show and that "Open RAC" means us.
        alternateName: ["Open RAC", "openrac.dev"],
        url: `${site}/`,
        description: "An unofficial hub for the independent community decompilation projects of the Ratchet & Clank series.",
        inLanguage: "en",
        publisher: { "@id": `${site}/#organization` },
      },
      {
        "@type": "ItemList",
        name: "Ratchet & Clank decompilation projects",
        itemListElement: PROJECTS.filter((p) => p.repo).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "SoftwareSourceCode",
            name: p.repo!.split("/")[1],
            codeRepository: `https://github.com/${p.repo}`,
            description: `Decompilation of ${p.name} (${p.year})${p.region ? `, ${p.region} release` : ""}${p.phase === "research" ? ", in its research phase" : ""}.`,
            about: { "@type": "VideoGame", name: p.name, ...(p.platform && { gamePlatform: p.platform }) },
          },
        })),
      },
      orgLd(site),
      ...(release ? [launcherLd(site, release)] : []),
    ],
  };
}

/** schema.org BreadcrumbList representation. */
export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

const MOD_OS: Record<string, string> = { "linux-x86_64": "Linux", "linux-aarch64": "Linux", "windows-x86_64": "Windows", "windows-arm64": "Windows", "macos-arm64": "macOS", "macos-x86_64": "macOS", "android-arm64": "Android" };

/** The parts of a mod its schema.org description needs. */
export interface ModLdInput {
  id: string;
  name: string;
  author: string;
  description: string;
  license?: string;
  repo: string;
  created: string;
  updated: string;
  version?: string;
  platforms: string[];
  image?: string;
  screenshots: string[];
  videos: { youtube: string; title?: string; caption?: string; uploaded?: string }[];
  game: string;
}

/**
 * schema.org description of one mod page: the mod as a free SoftwareApplication, its videos and the
 * breadcrumb. No rating: there is none to give, and Google's rich result would need a real one.
 */
export function modLd(site: string, m: ModLdInput) {
  const url = `${site}/mods/${m.id}`;
  const os = [...new Set(m.platforms.map((p) => MOD_OS[p] ?? (p === "any" ? "Windows, macOS, Linux" : p)))];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#mod`,
        name: m.name,
        description: m.description,
        url,
        applicationCategory: "GameApplication",
        applicationSubCategory: "Game mod",
        ...(os.length && { operatingSystem: os.join(", ") }),
        ...(m.version && { softwareVersion: m.version }),
        datePublished: m.created,
        dateModified: m.updated,
        author: { "@type": "Person", name: m.author },
        ...(m.license && { license: m.license }),
        ...(m.image && { image: m.image }),
        ...(m.screenshots.length && { screenshot: m.screenshots }),
        sameAs: [m.repo],
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        about: { "@type": "VideoGame", name: m.game },
        publisher: { "@id": `${site}/#organization` },
      },
      ...m.videos.map((v) => ({
        "@type": "VideoObject",
        name: v.title ?? `${m.name}: ${v.caption ?? "video"}`,
        description: v.caption ?? m.description,
        thumbnailUrl: `https://i.ytimg.com/vi/${v.youtube}/hqdefault.jpg`,
        uploadDate: v.uploaded ?? m.created,
        embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtube}`,
      })),
      breadcrumbLd([
        { name: "Home", url: `${site}/` },
        { name: "Mods", url: `${site}/mods` },
        { name: m.name, url },
      ]),
      orgLd(site),
    ],
  };
}

/** schema.org description of the mod list: a collection page with each mod in order. */
export function modsIndexLd(site: string, mods: { id: string; name: string }[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${site}/mods#page`,
        name: "Mods for Ratchet & Clank",
        url: `${site}/mods`,
        isPartOf: { "@id": `${site}/#website` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: mods.map((m, i) => ({ "@type": "ListItem", position: i + 1, url: `${site}/mods/${m.id}`, name: m.name })),
        },
      },
      breadcrumbLd([
        { name: "Home", url: `${site}/` },
        { name: "Mods", url: `${site}/mods` },
      ]),
    ],
  };
}
