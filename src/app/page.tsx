import PageTransition from "@/components/layout/PageTransition";
import Activity from "@/components/sections/Activity";
import AiView from "@/components/sections/AiView";
import Contribute from "@/components/sections/Contribute";
import Credits from "@/components/sections/Credits";
import Faq from "@/components/sections/Faq";
import Hero from "@/components/sections/Hero";
import LatestNews from "@/components/sections/LatestNews";
import HowItWorks from "@/components/sections/HowItWorks";
import Legal from "@/components/sections/Legal";
import Progress from "@/components/sections/Progress";
import Resources from "@/components/sections/Resources";
import { getActivity } from "@/lib/activity";
import { getModCatalog } from "@/lib/mods";
import { getLatestReports } from "@/lib/news";
import { isWithdrawn } from "@/lib/mods/logic";
import { homeLd, ldJson, siteUrl } from "@/lib/machine";
import { getProgress } from "@/lib/progress";
import { getLauncherRelease } from "@/lib/releases";

// Rendered on the server and cached; rebuilt in the background at most every 5 minutes.
export const revalidate = 300;

/** The home page: every section in order, with the progress, activity and latest launcher release loaded on the server. Downloads live on /install. */
export default async function Home() {
  const [progress, commits, release, { catalog }, news] = await Promise.all([getProgress(), getActivity(), getLauncherRelease(), getModCatalog(), getLatestReports(3)]);
  // Counted as on /mods, so the two numbers agree.
  const mods = catalog.mods.filter((m) => !isWithdrawn(catalog.revoked, m.id)).length;

  return (
    <PageTransition>
    <main className="bands mx-auto max-w-[1080px] px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(homeLd(siteUrl(), release)) }} />
      <Hero progress={progress} mods={mods} release={release} />
      <Progress progress={progress} />
      <Contribute />
      {news.length > 0 && <LatestNews reports={news} />}
      <Activity commits={commits} />
      <HowItWorks />
      <Resources />
      <Faq />
      <AiView />
      <Credits />
      <Legal />
    </main>
    </PageTransition>
  );
}
