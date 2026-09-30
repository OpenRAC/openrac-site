import { getPosts } from "@/lib/blog";
import { xmlEscape } from "@/lib/blog-parse";

export const dynamic = "force-static";

export async function GET() {
  const site = (process.env.SITE_URL ?? "https://openrac.dev").replace(/\/$/, "");
  const posts = await getPosts();
  const items = posts
    .map(
      (p) => `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${site}/blog/${p.slug}</link>
      <guid isPermaLink="true">${site}/blog/${p.slug}</guid>
      <pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${xmlEscape(p.summary)}</description>
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenRAC blog</title>
    <link>${site}/blog</link>
    <description>News and notes from the OpenRAC community decompilation projects.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
