import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageTransition from "@/components/layout/PageTransition";
import SectionArt from "@/components/ui/SectionArt";
import { getNewsDays } from "@/lib/news";
import { newsAlternates } from "@/lib/news/metadata";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "News",
  description: "What happens across the OpenRAC projects, day by day.",
  alternates: newsAlternates("/news"),
};

/** The latest day; if the news cannot be read at all, a plain message rather than an error. */
export default async function NewsPage() {
  const latest = (await getNewsDays())?.[0];
  if (latest) redirect(`/news/${latest.date}`);
  return (
    <PageTransition>
      <main className="mx-auto grid max-w-[1080px] justify-items-center gap-4 px-4 py-24 text-center">
        <SectionArt id="activity" className="h-20 w-auto" />
        <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] text-hi">No news to show right now</h1>
        <p className="max-w-[480px] text-dim">The news could not be loaded. Try again in a little while.</p>
      </main>
    </PageTransition>
  );
}
