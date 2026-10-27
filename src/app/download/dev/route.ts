import { getDevBuild } from "@/lib/releases";

/** The newest development build's version and time, which the Download panel reads when it opens, so it never shows an older build than GitHub has. */
export async function GET() {
  const dev = await getDevBuild();
  return Response.json(dev ? { version: dev.version, date: dev.date } : null, { headers: { "Cache-Control": "public, max-age=60" } });
}
