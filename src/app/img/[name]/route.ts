import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { byteRange, resolveImage } from "@/lib/images";

// Read from disk on every request, so a file dropped into the folder shows up without a restart.
export const dynamic = "force-dynamic";

/**
 * Serves a card backdrop or a home page clip from IMAGE_DIR; only the names the site uses (see
 * lib/images). Answers byte ranges too, which browsers (Safari above all) need to play a video,
 * streamed from disk, and an unchanged file with 304 (its tag is its size and time).
 */
export async function GET(req: Request, { params }: RouteContext<"/img/[name]">) {
  const image = resolveImage((await params).name);
  if (!image) return new Response("Not found", { status: 404 });
  const info = await stat(image.file).catch(() => null);
  // Not uploaded yet: the card shows its gradient, the clip drops out.
  if (!info?.isFile()) return new Response("Not found", { status: 404 });
  const size = info.size;
  const etag = `"${size.toString(36)}-${Math.floor(info.mtimeMs).toString(36)}"`;
  const headers = { "Content-Type": image.type, "Cache-Control": "public, max-age=300", "Accept-Ranges": "bytes", ETag: etag };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  const asked = req.headers.get("range");
  const range = asked ? byteRange(asked, size) : null;
  if (asked && !range) return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  const { start, end } = range ?? { start: 0, end: size - 1 };
  const body = size ? (Readable.toWeb(createReadStream(image.file, { start, end })) as ReadableStream<Uint8Array>) : null;
  return new Response(body, {
    status: range ? 206 : 200,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      ...(range && { "Content-Range": `bytes ${start}-${end}/${size}` }),
    },
  });
}
