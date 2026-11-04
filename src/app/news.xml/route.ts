import { siteUrl } from "@/lib/machine";
import { getLatestReports } from "@/lib/news";
import { rssXml } from "@/lib/news/logic";

// Asked on each request, so a failed read is never kept as the feed: the response below is cached here instead.
export const dynamic = "force-dynamic";

const KEEP_MS = 3_600_000;
const HEADERS = { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" };

let last: { body: string; at: number } | null = null;

/**
 * The written weekly reports as RSS. When the news cannot be read, the last good feed is served; with
 * none, a 503 tells feed readers to come back, rather than an empty feed that would look like no news.
 */
export async function GET() {
  if (last && Date.now() - last.at < KEEP_MS) return new Response(last.body, { headers: HEADERS });
  const reports = await getLatestReports(30);
  if (!reports) {
    if (last) return new Response(last.body, { headers: HEADERS });
    return new Response("The news can't be read right now.", { status: 503, headers: { "Retry-After": "600", "Cache-Control": "no-store" } });
  }
  const ends = new Map(reports.map((r) => [r.report.week, r.facts.end]));
  last = { body: rssXml(siteUrl(), reports.map((r) => r.report), (week) => ends.get(week)!), at: Date.now() };
  return new Response(last.body, { headers: HEADERS });
}
