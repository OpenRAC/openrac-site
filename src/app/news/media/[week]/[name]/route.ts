import { getNewsWeek, readNewsMedia } from "@/lib/news";
import { isMediaName, isNewsWeek, mediaMatches, mediaType } from "@/lib/news/logic";

export const dynamic = "force-dynamic";

const HEADERS = (type: string) => ({
  "Content-Type": type,
  // A week's report can be corrected, so a day rather than for good.
  "Cache-Control": "public, max-age=86400",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
});

const refuse = (text: string, status: number) => new Response(text, { status, headers: { "Cache-Control": "no-store" } });

/**
 * A report's picture. Only files its report lists are served, at a capped size, and only when the bytes
 * really are the picture type the name promises, whatever was uploaded. Visitors never contact GitHub.
 */
export async function GET(_req: Request, ctx: RouteContext<"/news/media/[week]/[name]">) {
  const { week, name } = await ctx.params;
  if (!isNewsWeek(week) || !isMediaName(name)) return refuse("Not found", 404);
  const data = await getNewsWeek(week);
  if (data?.report.status !== "ok" || !data.report.report.media.some((m) => m.file === name)) return refuse("Not found", 404);
  const bytes = await readNewsMedia(week, name);
  if (!bytes) return refuse("Picture unavailable", 502);
  if (!mediaMatches(name, bytes)) return refuse("Not a picture", 502);
  return new Response(bytes as BlobPart, { headers: HEADERS(mediaType(name)) });
}
