import { getModCatalog } from "@/lib/mods";
import { findMedia, MEDIA_MAX_BYTES } from "@/lib/mods/media";

export const dynamic = "force-dynamic";

/**
 * A mod picture, by its index name (`<hash>-<width>.<avif|webp>`), fetched from the index's release
 * and passed on. Only names the index lists are served, at a capped size, with the type taken from
 * the name (never from upstream). Names are content hashes, so browsers and proxies may keep each
 * file for a year (`immutable`); visitors never contact GitHub themselves.
 */
export async function GET(_req: Request, ctx: RouteContext<"/mods/media/[name]">) {
  const { name } = await ctx.params;
  const { catalog } = await getModCatalog();
  const found = findMedia(catalog.mods, name);
  if (!found) return new Response("Not found", { status: 404 });

  let res: Response;
  try {
    res = await fetch(found.url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch {
    return new Response("Picture unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  const length = Number(res.headers.get("content-length") ?? 0);
  if (!res.ok || !res.body || length > MEDIA_MAX_BYTES) return new Response("Picture unavailable", { status: res.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } });

  // Read with a running cap: a missing or false Content-Length cannot make the server hold more.
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MEDIA_MAX_BYTES) {
      await reader.cancel();
      return new Response("Picture too large", { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    parts.push(value);
  }
  return new Response(new Blob(parts as BlobPart[]), {
    headers: {
      "Content-Type": found.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
