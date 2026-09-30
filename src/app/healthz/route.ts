// Used by the container health check. Does not touch GitHub.
export const dynamic = "force-static";

export function GET() {
  return new Response("ok", { headers: { "Cache-Control": "no-store" } });
}
