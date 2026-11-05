import { getDocsIndex, getRelease } from "@/lib/modDocs";
import { searchEntries } from "@/lib/modDocs/search";

// Built ahead, one list per SDK release: the docs' search fetches it when it first opens.
export const dynamicParams = false;

export function generateStaticParams() {
  return getDocsIndex().versions.map((v) => ({ version: v.version }));
}

export async function GET(_req: Request, ctx: RouteContext<"/mods/docs/search/[version]">) {
  const { version } = await ctx.params;
  const index = getDocsIndex();
  if (!index.versions.some((v) => v.version === version)) return new Response("Not found", { status: 404 });
  return Response.json(searchEntries(getRelease(version), index.latest), { headers: { "Cache-Control": "public, max-age=3600" } });
}
