import { FAQ } from "@/components/sections/Faq";
import { llmsFullTxt, siteUrl } from "@/lib/machine";
import { getMods } from "@/lib/mods";
import { getProgress } from "@/lib/progress";

// Rebuilt in the background like the home page, so the numbers match it.
export const dynamic = "force-static";
export const revalidate = 300;

/** llms.txt plus the FAQ in full. */
export async function GET() {
  const [progress, mods] = await Promise.all([getProgress(), getMods()]);
  // Answers that are plain text; the one built from the project list is covered by "Projects" above.
  const faq = FAQ.filter((e): e is readonly [string, string] => typeof e[1] === "string");
  return new Response(llmsFullTxt(siteUrl(), progress, faq, mods), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
