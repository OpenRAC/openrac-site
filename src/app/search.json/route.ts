import { FAQ } from "@/components/sections/Faq";
import { buildSearchIndex } from "@/lib/searchIndex";

// Rebuilt with the mod list; the docs and news change only with a deploy.
export const dynamic = "force-static";
export const revalidate = 300;

/** What the site search looks through, fetched when it first opens. */
export async function GET() {
  return Response.json(await buildSearchIndex(FAQ), { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
