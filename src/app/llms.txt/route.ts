import { getPosts } from "@/lib/blog";
import { llmsTxt, siteUrl } from "@/lib/machine";
import { getProgress } from "@/lib/progress";

// Rebuilt in the background like the home page, so the numbers match it.
export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  const [progress, posts] = await Promise.all([getProgress(), getPosts()]);
  return new Response(llmsTxt(siteUrl(), progress, posts), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
