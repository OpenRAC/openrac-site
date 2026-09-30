import fs from "node:fs/promises";
import { resolveImage } from "@/lib/images";

// Read from disk on every request, so a file dropped into the folder shows up without a restart.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: RouteContext<"/img/[name]">) {
  const image = resolveImage((await params).name);
  if (!image) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(image.file);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": image.type, "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return new Response("Not found", { status: 404 }); // not uploaded yet: the card shows its gradient
  }
}
