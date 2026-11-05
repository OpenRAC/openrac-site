import type { Metadata } from "next";
import PageTransition from "@/components/layout/PageTransition";
import DownloadPanel from "@/components/sections/DownloadPanel";
import SectionArt from "@/components/ui/SectionArt";
import { DOWNLOAD_URL } from "@/lib/projects";
import { getDevBuild, getLauncherRelease, noFiles } from "@/lib/releases";

export const revalidate = 300;

const DESCRIPTION = "Get the OpenRAC launcher for Windows, macOS, Linux or Android. It sets each game up from your own disc; no game is downloaded.";

export const metadata: Metadata = {
  title: "Install",
  description: DESCRIPTION,
  alternates: { canonical: "/install" },
  openGraph: { title: "Install OpenRAC", description: DESCRIPTION, url: "/install", type: "website" },
};

/** What a player needs before the launcher can build a game, in order. */
const STEPS = [
  ["Your own disc", "OpenRAC ships no game data. Make a copy (an ISO) of a Ratchet & Clank disc you own; the launcher reads the game from it."],
  ["The launcher", "Download it for your system above. It keeps itself and the games up to date."],
  ["Point it at your copy", "Pick the ISO in the launcher: it sets the game up from it and starts it."],
] as const;

/** The launcher's downloads, one card per system, and what you need to play: the page the bar's Download button opens. */
export default async function InstallPage() {
  const [release, dev] = await Promise.all([getLauncherRelease(), getDevBuild()]);
  return (
    <PageTransition>
      <main className="mx-auto max-w-[1080px] px-4 pb-16 pt-8">
        <DownloadPanel
          standalone
          release={release}
          dev={dev}
          platforms={release?.platforms ?? noFiles()}
          fallback={DOWNLOAD_URL}
          art={<SectionArt id="download" className="h-12 w-auto sm:h-16" />}
        />
        <section id="your-disc" aria-labelledby="steps-title" className="scroll-mt-16">
          <h2 id="steps-title" className="font-audiowide text-[clamp(20px,2.6vw,26px)] text-hi">Before you play</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="surface p-5">
                <span className="font-orbitron text-[12px] font-bold tracking-[.14em] text-brand">STEP {i + 1}</span>
                <h3 className="mt-1.5 font-orbitron text-[16px] font-bold text-text">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-soft">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </PageTransition>
  );
}
