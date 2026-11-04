import { siteUrl } from "@/lib/machine";
import { getLatestReports } from "@/lib/news";
import { rssXml } from "@/lib/news/logic";

export const dynamic = "force-static";

/** The written weekly reports as RSS. */
export async function GET() {
  const reports = await getLatestReports(30);
  const ends = new Map(reports.map((r) => [r.report.week, r.facts.end]));
  return new Response(rssXml(siteUrl(), reports.map((r) => r.report), (week) => ends.get(week)!), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
