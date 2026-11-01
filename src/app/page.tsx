import Activity from "@/components/sections/Activity";
import AiView from "@/components/sections/AiView";
import Contribute from "@/components/sections/Contribute";
import Credits from "@/components/sections/Credits";
import Download from "@/components/sections/Download";
import Faq from "@/components/sections/Faq";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import Legal from "@/components/sections/Legal";
import ModsTeaser from "@/components/sections/ModsTeaser";
import Progress from "@/components/sections/Progress";
import Resources from "@/components/sections/Resources";
import { getActivity } from "@/lib/activity";
import { homeLd, ldJson, siteUrl } from "@/lib/machine";
import { getProgress } from "@/lib/progress";
import { getDevBuild, getLauncherRelease } from "@/lib/releases";

// Rendered on the server and cached; rebuilt in the background at most every 5 minutes.
export const revalidate = 300;

/** The home page: every section in order, with the progress, activity and latest launcher builds loaded on the server. */
export default async function Home() {
  const [progress, commits, release, dev] = await Promise.all([getProgress(), getActivity(), getLauncherRelease(), getDevBuild()]);

  return (
    <main className="mx-auto max-w-[1080px] px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(homeLd(siteUrl(), release)) }} />
      <Hero progress={progress} />
      <Download release={release} dev={dev} />
      <Progress progress={progress} />
      <ModsTeaser />
      <Contribute />
      <Activity commits={commits} />
      <HowItWorks />
      <Resources />
      <Faq />
      <AiView />
      <Credits />
      <Legal />
    </main>
  );
}
