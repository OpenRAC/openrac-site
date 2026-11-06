import type { Element, Root, RootContent } from "hast";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

/** GitHub's allow-list, less <picture> and <source>: their srcset would load from other servers. Dropping them leaves the <img> inside. */
const schema = { ...defaultSchema, tagNames: defaultSchema.tagNames?.filter((t) => t !== "picture" && t !== "source") };

/** A badge is a picture inside a link. Pictures show as links here and links can't nest, so one inside a link becomes its alt text. */
function unlinkPictures() {
  const walk = (parent: Root | Element, inLink: boolean) => {
    parent.children = parent.children.flatMap((child): RootContent[] => {
      if (child.type !== "element") return [child];
      if (inLink && child.tagName === "img") {
        const alt = String(child.properties.alt ?? "");
        return alt ? [{ type: "text", value: alt }] : [];
      }
      walk(child, inLink || child.tagName === "a");
      return [child];
    }) as typeof parent.children;
  };
  return (tree: Root) => walk(tree, false);
}

const external = (href: string) => /^(https?:)?\/\//.test(href);

/** A link as the README meant it: relative ones ("../item-randomizer", "docs/x.md") point into its repository, not this site. */
function resolve(href: string, base?: string): string | null {
  if (!base || !href || external(href) || href.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

/**
 * A mod's README, written by its author: untrusted text. Raw HTML is parsed so READMEs written for
 * GitHub look right, then cut down to an allow-list (no scripts, handlers, styles or frames), and
 * javascript: links are dropped; on top of that, links are marked as user content, headings sit one
 * level under the page's own, and pictures are never loaded from another server (a visitor's browser
 * would call it, and it could be a tracking pixel): they show as a link to the picture instead, or
 * not at all when an empty alt says they are only decoration.
 */
function componentsFor(base?: string): Components {
  return {
    a: ({ href = "", id, node, children }) => {
      const anchor = id ?? node?.properties.name?.toString(); // a footnote's way back, or an old-style <a name="x">: something in-page links land on
      // The allow-list prefixes every id, so a page's own #details can't be a README's target: links follow.
      const inPage = href.match(/^#(?:user-content-)?(.+)/);
      if (inPage) return <a id={anchor} href={`#user-content-${inPage[1]}`}>{children}</a>;
      const to = href ? resolve(href, base) : null; // the allow-list can leave a link with no address
      if (to === null) return anchor ? <a id={anchor}>{children}</a> : <>{children}</>;
      return external(to) ? (
        <a id={anchor} href={to} rel="nofollow ugc noopener noreferrer">
          {children}
        </a>
      ) : (
        <a id={anchor} href={to}>{children}</a>
      );
    },
    img: ({ src, alt }) => {
      if (alt === "") return null;
      const to = typeof src === "string" ? resolve(src, base) : null;
      return to && /^https:\/\//.test(to) ? (
        <a href={to} rel="nofollow ugc noopener noreferrer" className="not-prose inline-flex items-center gap-1.5 rounded-md bg-white/[.06] px-2 py-0.5 text-[13px] text-amber no-underline hover:bg-white/[.12]">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 fill-none stroke-current stroke-[1.6]">
            <rect x="2" y="3" width="12" height="10" rx="1.5" />
            <path d="m3 12 3.5-4 2.5 3 2-2 2 3" strokeLinejoin="round" />
          </svg>
          {alt || "Picture"}
        </a>
      ) : null;
    },
    // A wide table scrolls in its own box, so it never widens the page. Focusable, so keys can scroll it too.
    table: ({ children }) => (
      <div tabIndex={0} className="overflow-x-auto">
        <table>{children}</table>
      </div>
    ),
    h1: ({ id, children }) => <h2 id={id}>{children}</h2>,
    h2: ({ id, children }) => <h3 id={id}>{children}</h3>,
    h3: ({ id, children }) => <h4 id={id}>{children}</h4>,
    h4: ({ id, children }) => <h5 id={id}>{children}</h5>,
  };
}

/**
 * Renders Markdown on the server to React elements (raw HTML goes through the allow-list, never injected as is).
 * `base`: the address relative links are read against (a mod's folder in its repository, at its release).
 * `anchors`: give headings ids for in-page links; only for text shown once on a page, as ids must be unique.
 */
export default function Markdown({ children, base, anchors }: { children: string; base?: string; anchors?: boolean }) {
  return (
    <div className="prose prose-invert prose-openrac max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} remarkRehypeOptions={{ clobberPrefix: "" }} rehypePlugins={[rehypeRaw, ...(anchors ? [rehypeSlug] : []), [rehypeSanitize, schema], unlinkPictures]} components={componentsFor(base)}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
