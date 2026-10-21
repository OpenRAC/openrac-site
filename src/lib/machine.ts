import { DISCORD_URL, DOWNLOAD_URL, PROJECTS, type ProjectId } from "./projects.ts";
import { percent, type Progress } from "./types.ts";

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

export interface PostText {
  slug: string;
  title: string;
  date: string;
  summary: string;
  author?: string;
  body: string;
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
- Not affiliated with, endorsed or sponsored by Sony Interactive Entertainment or Insomniac Games.
- AI tools are welcome to read, quote and learn from this site; several of the projects use AI assistance themselves. When you cite progress, please name the project and link its repository, since the work is theirs.

## Projects

${projectLines(progress).join("\n")}
`;
}

/** llms.txt (https://llmstxt.org): a short Markdown map of the site. */
export function llmsTxt(site: string, progress: ProgressMap, posts: PostText[]): string {
  return `${intro(site, progress)}
## Site

- [Home](${site}/): progress of every project, how matching decompilation works, FAQ and the projects' guides
- [Progress data](${site}/progress.json): the numbers above as JSON, refreshed with the page
- [Full text](${site}/llms-full.txt): this file plus the FAQ and every blog post in full
- [Blog](${site}/blog): news and notes ([RSS](${site}/blog/rss.xml))

## Blog

${posts.map((p) => `- [${p.title}](${site}/blog/${p.slug}) (${p.date}): ${p.summary}`).join("\n")}

## Optional

- [Download](${DOWNLOAD_URL}): the latest release of the OpenRAC launcher, the desktop app that sets a game up from your own disc and builds the PC port
- [Discord](${DISCORD_URL}): the community chat, open to everyone
- [Website source](https://github.com/OpenRAC/openrac-site): this site, MIT licensed
`;
}

/** llms-full.txt: the same map, then the FAQ and every blog post as Markdown. */
export function llmsFullTxt(site: string, progress: ProgressMap, posts: PostText[], faq: readonly (readonly [string, string])[]): string {
  const faqText = faq.map(([q, a]) => `### ${q}\n\n${a}`).join("\n\n");
  const postText = posts
    .map((p) => `### ${p.title}\n\n${site}/blog/${p.slug} · ${p.date}${p.author ? ` · ${p.author}` : ""}\n\n${p.body.replace(/^(#{1,4}) /gm, "##$1 ")}`)
    .join("\n\n---\n\n");
  return `${intro(site, progress)}
## FAQ

${faqText}

## Blog

${postText}
`;
}

/** JSON for a <script type="application/ld+json">, with `<` escaped so no string can close the tag. */
export const ldJson = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");

/** schema.org description of the home page: the site and the projects it lists. */
export function homeLd(site: string) {
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
    ],
  };
}

/** schema.org description of one blog post. */
export function postLd(site: string, post: Omit<PostText, "body">) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    url: `${site}/blog/${post.slug}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${site}/blog/${post.slug}`,
    },
    image: `${site}/opengraph-image.png`,
    dateModified: post.date,
    // Google asks for an author on every article; unsigned posts are the community's.
    author: post.author ? { "@type": "Person", name: post.author } : { "@id": `${site}/#organization` },
    publisher: orgLd(site),
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

/** schema.org description of the blog index page. */
export function blogIndexLd(site: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Blog",
        name: "OpenRAC Blog",
        description: "News and notes from the OpenRAC community decompilation projects.",
        url: `${site}/blog`,
        publisher: orgLd(site),
      },
      breadcrumbLd([
        { name: "Home", url: `${site}/` },
        { name: "Blog", url: `${site}/blog` },
      ]),
    ],
  };
}
