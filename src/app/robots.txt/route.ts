import { siteUrl } from "@/lib/machine";

// A route rather than robots.ts: Next's robots type has no field for Content-Signal.
export const dynamic = "force-static";

/**
 * Everyone may crawl everything. Content-Signal (https://contentsignals.org) says so explicitly
 * for search, for AI answers and for AI training: we use AI ourselves, so we do not block it.
 * /llms.txt is the short map for AI tools. The mod list's filtered views (/mods?game=…) are the same
 * page in another order, so they are kept out of the crawl (Google's faceted-navigation guidance).
 */
export function GET() {
  const site = siteUrl();
  const host = new URL(site).host;
  const txt = `# OpenRAC - Unofficial Native PC Ports & Decompilation Hub for Ratchet & Clank
# Machine map for AI tools: ${site}/llms.txt
# Full context & FAQ for AI: ${site}/llms-full.txt

User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /
Disallow: /mods?

# Explicit permissions for AI search engines and assistants
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: PerplexityBot
User-agent: Google-Extended
User-agent: CCBot
Allow: /

Host: ${host}
Sitemap: ${site}/sitemap.xml
`;
  return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
