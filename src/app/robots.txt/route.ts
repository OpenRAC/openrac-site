import { siteUrl } from "@/lib/machine";

// A route rather than robots.ts: Next's robots type has no field for Content-Signal.
export const dynamic = "force-static";

/**
 * Everyone may crawl everything. Content-Signal (https://contentsignals.org) says so explicitly
 * for search, for AI answers and for AI training: we use AI ourselves, so we do not block it.
 * /llms.txt is the short map for AI tools.
 */
export function GET() {
  const site = siteUrl();
  const txt = `# OpenRAC welcomes search engines and AI tools. A summary for AI: ${site}/llms.txt
User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /

Sitemap: ${site}/sitemap.xml
`;
  return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
