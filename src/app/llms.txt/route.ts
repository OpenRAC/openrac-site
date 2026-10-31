import { llmsTxt, siteUrl } from "@/lib/machine";
import { getMods } from "@/lib/mods";
import { getProgress } from "@/lib/progress";

// Rebuilt in the background like the home page, so the numbers match it.
export const dynamic = "force-static";
export const revalidate = 300;

/** A short Markdown map of the site for AI tools (https://llmstxt.org). */
export async function GET() {
  const [progress, mods] = await Promise.all([getProgress(), getMods()]);
  return new Response(llmsTxt(siteUrl(), progress, mods), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
