import { siteUrl } from "@/lib/machine";
import { getLatestReports } from "@/lib/news";
import { rssXml } from "@/lib/news/logic";

// Rebuilt in the background like the news pages.
export const dynamic = "force-static";
export const revalidate = 3600;

/** The written reports as RSS. Days with only facts stay out: they have nothing to read. */
export async function GET() {
  return new Response(rssXml(siteUrl(), await getLatestReports(30)), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
