import { getModCatalog } from "@/lib/mods";
import { findMedia, MEDIA_MAX_BYTES, readCached, writeCached } from "@/lib/mods/media";

export const dynamic = "force-dynamic";

/** The same headers whether the file came from disk or from GitHub. */
const HEADERS = (type: string) => ({
  "Content-Type": type,
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy": "default-src 'none'; sandbox",
});

/**
 * A mod picture, by its index name (`<hash>-<width>.<avif|webp>`), fetched from the index's release
 * and passed on. Only names the index lists are served, at a capped size, with the type taken from
 * the name (never from upstream). Names are content hashes, so browsers and proxies may keep each
 * file for a year (`immutable`); visitors never contact GitHub themselves. With MEDIA_DIR set (the
 * container's /data/mods-media), each picture is fetched once and served from that folder after.
 */
export async function GET(_req: Request, ctx: RouteContext<"/mods/media/[name]">) {
  const { name } = await ctx.params;
  const { catalog } = await getModCatalog();
  const found = findMedia(catalog.mods, name);
  if (!found) return new Response("Not found", { status: 404 });
  const dir = process.env.MEDIA_DIR;
  const cached = await readCached(dir, name);
  if (cached) return new Response(cached as BlobPart, { headers: HEADERS(found.type) });

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
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    bytes.set(p, at);
    at += p.byteLength;
  }
  await writeCached(dir, name, bytes);
  return new Response(bytes as BlobPart, { headers: HEADERS(found.type) });
}
