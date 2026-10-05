import { FAQ } from "@/components/Content";
import { getPosts } from "@/lib/blog";
import { llmsFullTxt, siteUrl } from "@/lib/machine";
import { getProgress } from "@/lib/progress";

// Rebuilt in the background like the home page, so the numbers match it.
export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  const [progress, posts] = await Promise.all([getProgress(), getPosts()]);
  // Answers that are plain text; the one built from the project list is covered by "Projects" above.
  const faq = FAQ.filter((e): e is readonly [string, string] => typeof e[1] === "string");
  return new Response(llmsFullTxt(siteUrl(), progress, posts, faq), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
