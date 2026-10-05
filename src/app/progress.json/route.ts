import { progressJson } from "@/lib/machine";
import { getProgress } from "@/lib/progress";

// Rebuilt in the background like the home page, so the numbers match it.
export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  // Anyone may read it from a browser too: other dashboards, project READMEs, scripts.
  return Response.json(progressJson(await getProgress()), { headers: { "Access-Control-Allow-Origin": "*" } });
}
