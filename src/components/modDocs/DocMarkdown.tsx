import type { Element, ElementContent } from "hast";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { guideLink } from "@/lib/modDocs/logic";
import Code from "./Code";
import HeadingAnchor from "./HeadingAnchor";

/**
 * One of the SDK's guides (Markdown written for GitHub, from OpenRAC's own repository), rendered on
 * the server. Its links are turned into this site's pages (guideLink), its code blocks highlighted
 * with a Copy button, and its headings carry plain ids, so a link from another guide
 * (hooks.md#stable-ids) lands on them. Raw HTML is not read; the allow-list still applies.
 */

// The SDK's own text: plain heading ids (no "user-content-" prefix) so links between the guides keep working.
const schema = { ...defaultSchema, clobberPrefix: "" };

const text = (nodes: ElementContent[]): string => nodes.map((n) => (n.type === "text" ? n.value : n.type === "element" ? text(n.children) : "")).join("");

export type LinkContext = { from: string; tag: string; version: string; latest: string; guides: string[] };

function components(ctx: LinkContext): Components {
  return {
    a: ({ href = "", children }) => {
      const to = guideLink(href, ctx);
      return /^https?:/.test(to) ? (
        <a href={to} rel="noopener">
          {children}
        </a>
      ) : (
        <a href={to}>{children}</a>
      );
    },
    pre: ({ node }) => {
      const codeEl = node?.children.find((c): c is Element => c.type === "element" && c.tagName === "code");
      const cls = codeEl?.properties.className;
      const lang = (Array.isArray(cls) ? cls : [cls]).map(String).find((c) => c.startsWith("language-"))?.slice(9) ?? "";
      return <Code code={text(codeEl?.children ?? []).replace(/\n$/, "")} lang={lang} />;
    },
    table: ({ children }) => (
      <div tabIndex={0} className="overflow-x-auto">
        <table>{children}</table>
      </div>
    ),
    // A table written with an empty header row (`| | |`) is a plain list of pairs: no header.
    thead: ({ node, children }) => (node && !text(node.children).trim() ? null : <thead>{children}</thead>),
    // The empty corner of a table that compares columns heads nothing: a plain cell.
    th: ({ node, children, style }) => (node && !text(node.children).trim() ? <td /> : <th style={style}>{children}</th>),
    // The page has its own title: the guide's first heading is not shown again.
    h1: () => null,
    h2: ({ id, children }) => (
      <h2 id={id} className="group scroll-mt-20">
        {children}
        {id && <HeadingAnchor id={id} />}
      </h2>
    ),
    h3: ({ id, children }) => (
      <h3 id={id} className="group scroll-mt-20">
        {children}
        {id && <HeadingAnchor id={id} />}
      </h3>
    ),
  };
}

export default function DocMarkdown({ children, ctx, className = "" }: { children: string; ctx: LinkContext; className?: string }) {
  return (
    <div className={`prose prose-invert prose-openrac d-prose max-w-none prose-pre:p-0 prose-h2:mt-10 prose-h2:text-[20px] prose-h3:text-[16.5px] ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug, [rehypeSanitize, schema]]} components={components(ctx)}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

/** A line of the SDK's prose (a comment, a table cell): inline Markdown, links turned into this site's. */
export function InlineMarkdown({ children, ctx }: { children: string; ctx: LinkContext }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, schema]]}
      components={{ ...components(ctx), p: ({ children: c }) => <>{c}</>, code: ({ children: c }) => <code className="rounded bg-white/5 px-1 py-px text-[0.92em] text-gold">{c}</code> }}
    >
      {children}
    </ReactMarkdown>
  );
}
