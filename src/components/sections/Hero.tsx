import { formatSize } from "@/lib/format";
import { PROJECTS } from "@/lib/projects";
import type { ProjectProgress } from "@/lib/progress";
import type { ProjectId } from "@/lib/projects";
import CountUp from "@/components/ui/CountUp";
import HeroStage from "@/components/ui/HeroShots";
import HeroDownload from "@/components/sections/HeroDownload";
import Link from "next/link";
import type { LauncherRelease } from "@/lib/releases";

/**
 * The home page's first screen, like a game's title screen: free-camera clips from the games crossfading
 * edge to edge, the headline numbers as a HUD in the corner, and bottom left the latest release, the
 * headline, one download button for the visitor's system and the clip captions.
 */
export default function Hero({ progress, mods, release }: { progress: Partial<Record<ProjectId, ProjectProgress>>; mods: number; release: LauncherRelease | null }) {
  const active = Object.values(progress);
  const bytes = active.reduce((sum, p) => sum + (p?.code.done ?? 0), 0);

  const bolt = "M12 1.5 21.1 6.75v10.5L12 22.5 2.9 17.25V6.75L12 1.5Zm0 6.2a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6Z";

  // The numbers as a game HUD in the top corner: the bolt counter is the code verified so far.
  const hud = (
    <div className="absolute right-[max(16px,calc(50%-524px))] top-6 animate-rise text-right [animation-delay:.6s] max-[700px]:inset-x-6 max-[700px]:text-center">
      <div className="flex items-center justify-end gap-2.5 font-orbitron text-[clamp(22px,4vw,30px)] font-extrabold tabular-nums text-gold [text-shadow:0_2px_0_#000] max-[700px]:justify-center">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[0.9em] fill-amber">
          <path fillRule="evenodd" d={bolt} />
        </svg>
        {formatSize(bytes)}
      </div>
      <small className="block font-mono text-[11px] font-semibold tracking-[.08em] text-soft">OF CODE VERIFIED</small>
      <p className="mt-2.5 font-mono text-[12px] font-semibold text-soft [text-shadow:0_1px_0_#000]">
        <b className="text-gold"><CountUp value={new Set(PROJECTS.map((p) => p.name)).size} /></b> titles · <b className="text-gold"><CountUp value={active.length} /></b> projects
        {/* Left out while the mod list cannot be read, rather than claiming none. */}
        {mods > 0 && <> · <b className="text-gold"><CountUp value={mods} /></b> mods</>}
      </p>
    </div>
  );

  return (
    <HeroStage hud={hud}>
      {/* What is new: the launcher's latest release and its notes. */}
      {release && (
        <a href={release.url} className="mb-6 inline-flex max-w-full flex-wrap gap-x-1.5 rounded-full bg-black/40 px-4 py-2 text-[13px] leading-snug text-soft no-underline backdrop-blur-sm transition-colors hover:bg-black/55 sm:text-[14px]">
          <b className="font-semibold text-text">Launcher v{release.version} is out.</b>
          <span>
            See <span className="text-amber underline decoration-amber/40 underline-offset-2">what&apos;s new</span>
          </span>
        </a>
      )}
      <h1 className="max-w-[640px] text-pretty font-audiowide text-[clamp(30px,5.4vw,54px)] leading-[1.08] [text-shadow:0_2px_24px_rgb(0_0_0/0.6)]">
        <span className="animate-shine bg-gradient-to-r from-amber via-[#e8a317] to-gold bg-[length:220%_100%] bg-clip-text text-transparent">
          Ratchet &amp; Clank
        </span>{" "}
        {/* "original bytes." stays together, so "bytes." never sits alone on the last line. */}
        series, rebuilt from the <span className="whitespace-nowrap">original bytes.</span>
      </h1>
      <p className="mt-5 max-w-[560px] text-pretty text-[15px] leading-relaxed text-body sm:text-[17px]">
        A hub for the <span className="text-amber">community decompilations</span> of Ratchet &amp; Clank:{" "}
        <span className="text-amber">readable source code</span> that compiles to the original games&apos;{" "}
        <span className="text-amber">exact bytes</span>
      </p>
      <HeroDownload version={release?.version ?? null} date={release?.date || null} ready={(release?.platforms ?? []).filter((p) => p.main).map((p) => p.id)} />
      <p className="mt-5 max-w-[560px] text-[13px] leading-relaxed text-dim">
        Unofficial and community driven. You need your own copy of the original game to play.{" "}
        <Link href="/install#your-disc" className="whitespace-nowrap font-semibold text-hi no-underline hover:text-amber">
          Learn more →
        </Link>
      </p>
    </HeroStage>
  );
}
