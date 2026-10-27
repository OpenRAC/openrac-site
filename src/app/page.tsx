import Activity from "@/components/sections/Activity";
import AiView from "@/components/sections/AiView";
import Contribute from "@/components/sections/Contribute";
import Credits from "@/components/sections/Credits";
import Faq from "@/components/sections/Faq";
import Hero from "@/components/sections/Hero";
import HowItWorks from "@/components/sections/HowItWorks";
import Legal from "@/components/sections/Legal";
import Progress from "@/components/sections/Progress";
import Resources from "@/components/sections/Resources";
import { getActivity } from "@/lib/activity";
import { homeLd, ldJson, siteUrl } from "@/lib/machine";
import { getProgress } from "@/lib/progress";

// Rendered on the server and cached; rebuilt in the background at most every 5 minutes.
export const revalidate = 300;

/** The home page: every section in order, with the progress and activity loaded on the server. */
export default async function Home() {
  const [progress, commits] = await Promise.all([getProgress(), getActivity()]);

  return (
    <main className="mx-auto max-w-[1080px] px-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(homeLd(siteUrl())) }} />
      <Hero progress={progress} />
      <Progress progress={progress} />
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
