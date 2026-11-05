import fs from "node:fs/promises";
import { byteRange, resolveImage } from "@/lib/images";

// Read from disk on every request, so a file dropped into the folder shows up without a restart.
export const dynamic = "force-dynamic";

/**
 * Serves a card backdrop or a home page clip from IMAGE_DIR; only the names the site uses (see
 * lib/images). Answers byte ranges too, which browsers (Safari above all) need to play a video.
 */
export async function GET(req: Request, { params }: RouteContext<"/img/[name]">) {
  const image = resolveImage((await params).name);
  if (!image) return new Response("Not found", { status: 404 });
  let file: fs.FileHandle | undefined;
  try {
    file = await fs.open(image.file);
    const { size } = await file.stat();
    const headers = { "Content-Type": image.type, "Cache-Control": "public, max-age=300", "Accept-Ranges": "bytes" };
    const asked = req.headers.get("range");
    const range = asked ? byteRange(asked, size) : null;
    if (asked && !range) return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    const { start, end } = range ?? { start: 0, end: size - 1 };
    const data = new Uint8Array(end - start + 1);
    await file.read(data, 0, data.length, start);
    return new Response(data, {
      status: range ? 206 : 200,
      headers: range ? { ...headers, "Content-Range": `bytes ${start}-${end}/${size}` } : headers,
    });
  } catch {
    return new Response("Not found", { status: 404 }); // not uploaded yet: the card shows its gradient
  } finally {
    await file?.close();
  }
}
