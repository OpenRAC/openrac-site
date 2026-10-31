import { getModCatalog } from "@/lib/mods";
import type { ListedMod } from "@/lib/mods/types";

// Rebuilt with the mod list.
export const dynamic = "force-static";
export const revalidate = 300;

/**
 * The merged mod list as JSON, for scripts and AI tools; the launcher reads the signed index itself.
 * Kept by caches for a day after an error (RFC 5861), so a GitHub outage does not take it down.
 */
/** A mod without the server-only parts: where its pictures come from, and its README (on its page). */
function publicMod(m: ListedMod) {
  const copy: Partial<ListedMod> = { ...m };
  delete copy.mediaBase;
  delete copy.indexSource;
  delete copy.readme;
  return copy;
}

export async function GET() {
  const { catalog } = await getModCatalog();
  return Response.json(
    { about: "Community mods for the OpenRAC ports, as listed on openrac.dev/mods.", ...catalog, mods: catalog.mods.map(publicMod) },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400" } },
  );
}
