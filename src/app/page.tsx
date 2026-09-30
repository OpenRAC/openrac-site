import { Activity, AiView, Contribute, Faq, HowItWorks, Legal, Resources } from "@/components/Content";
import Credits from "@/components/Credits";
import Hero from "@/components/Hero";
import Progress from "@/components/Progress";
import { getActivity } from "@/lib/activity";
import { getProgress } from "@/lib/progress";

// Rendered on the server and cached; rebuilt in the background at most every 5 minutes.
export const revalidate = 300;

export default async function Home() {
  const [progress, commits] = await Promise.all([getProgress(), getActivity()]);

  return (
    <main className="mx-auto max-w-[1080px] px-4">
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
