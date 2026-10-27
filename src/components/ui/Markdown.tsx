import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const external = (href: string) => /^(https?:)?\/\//.test(href);

const components: Components = {
  a: ({ href = "", children }) =>
    external(href) ? (
      <a href={href} rel="noopener noreferrer">{children}</a>
    ) : (
      <a href={href}>{children}</a>
    ),
  // Only images that ship with the site (public/blog/...). A remote image would
  // make every reader's browser call a third party, and could be a tracking pixel.
  img: ({ src, alt }) =>
    typeof src === "string" && src.startsWith("/") && !src.startsWith("//") ? (
      // eslint-disable-next-line @next/next/no-img-element -- size is unknown for Markdown content
      <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" />
    ) : null,
};

/** Renders Markdown on the server to React elements (raw HTML in posts is ignored, not injected). */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-openrac max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
