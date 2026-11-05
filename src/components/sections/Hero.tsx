import { formatSize } from "@/lib/format";
import { PROJECTS } from "@/lib/projects";
import type { ProjectProgress } from "@/lib/progress";
import type { ProjectId } from "@/lib/projects";
import CountUp from "@/components/ui/CountUp";
import HeroGalaxies from "@/components/ui/HeroGalaxies";
import HeroDownload from "@/components/sections/HeroDownload";
import Link from "next/link";
import type { LauncherRelease } from "@/lib/releases";

/**
 * The top of the home page, centred: the latest release, the headline, one download button for the
 * visitor's system, and a window onto the series' galaxies; the four headline numbers under it.
 */
export default function Hero({ progress, mods, release }: { progress: Partial<Record<ProjectId, ProjectProgress>>; mods: number; release: LauncherRelease | null }) {
  const active = Object.values(progress);
  const bytes = active.reduce((sum, p) => sum + (p?.code.done ?? 0), 0);

  return (
    <div className="relative flex flex-col items-center pb-10 pt-10 text-center sm:pb-16 sm:pt-14">
      {/* What is new: the launcher's latest release and its notes. */}
      {release && (
        <a href={release.url} className="mb-7 inline-flex max-w-full flex-wrap justify-center gap-x-1.5 rounded-full bg-white/[.06] px-4 py-2 text-[13px] leading-snug text-soft no-underline transition-colors hover:bg-white/10 sm:text-[14px]">
          <b className="font-semibold text-text">Launcher v{release.version} is out.</b>
          <span>
            See <span className="text-amber underline decoration-amber/40 underline-offset-2">what&apos;s new</span>
          </span>
        </a>
      )}
      {/* Balanced lines: no word is ever left alone on the last line, whatever the width. */}
      <h1 className="max-w-[760px] text-balance font-audiowide text-[clamp(28px,5.4vw,52px)] leading-[1.08]">
        <span className="animate-shine bg-gradient-to-r from-amber via-[#e8a317] to-gold bg-[length:220%_100%] bg-clip-text text-transparent">
          Ratchet &amp; Clank
        </span>{" "}
        {/* "original bytes." stays together, so "bytes." never sits alone on the last line. */}
        series, rebuilt from the <span className="whitespace-nowrap">original bytes.</span>
      </h1>
      <p className="mt-5 max-w-[620px] text-pretty text-[15px] leading-relaxed text-soft sm:text-[17px]">
        A hub for the <span className="text-amber">community decompilations</span> of Ratchet &amp; Clank:{" "}
        <span className="text-amber">readable source code</span> that compiles to the original games&apos;{" "}
        <span className="whitespace-nowrap">
          <span className="text-amber">exact bytes</span>
          {/* A bolt, the series' currency, ends the sentence in place of a full stop. */}
          <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-1.5 inline-block size-[1.05em] -translate-y-px fill-amber align-[-0.15em]">
            <path fillRule="evenodd" d="M12 1.5 21.1 6.75v10.5L12 22.5 2.9 17.25V6.75L12 1.5Zm0 6.2a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6Z" />
          </svg>
        </span>
      </p>
      <HeroDownload version={release?.version ?? null} date={release?.date || null} ready={(release?.platforms ?? []).filter((p) => p.main).map((p) => p.id)} />
      <p className="mt-6 max-w-[660px] text-[13px] leading-relaxed text-dim">
        Unofficial and community driven. You need your own copy of the original game to play.{" "}
        <Link href="/install#your-disc" className="whitespace-nowrap font-semibold text-hi no-underline hover:text-amber">
          Learn more →
        </Link>
      </p>

      {/* A window onto the series' sky, on a gold horizon that runs across the page behind it. */}
      <div className="relative mt-10 w-full sm:mt-12">
        <div aria-hidden className="absolute inset-x-[calc(50%-50vw)] bottom-[40%] top-[-30%] -z-10 bg-gradient-to-b from-transparent via-[#3a2606]/60 to-[#8a5c10]/75" />
        <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-deep shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)]">
          <div className="flex h-9 items-center gap-2 border-b border-white/[.06] bg-white/[.03] px-4">
            <span className="size-3 rounded-full bg-[#f5c040]" />
            <span className="size-3 rounded-full bg-[#d6a020]" />
            <span className="size-3 rounded-full bg-[#8a6512]" />
          </div>
          <div className="relative aspect-[4/3] min-[560px]:aspect-[16/8] lg:aspect-[16/7]">
            <HeroGalaxies />
          </div>
        </div>
      </div>

      <div className={`mt-10 grid w-full animate-rise gap-x-6 gap-y-4 text-left [animation-delay:.6s] ${mods ? "grid-cols-2" : "grid-cols-3"} min-[560px]:flex min-[560px]:w-auto min-[560px]:flex-wrap min-[560px]:justify-center min-[560px]:gap-x-6`}>
        {[
          [<CountUp key="t" value={new Set(PROJECTS.map((p) => p.name)).size} />, "titles tracked"],
          [<CountUp key="a" value={active.length} />, "active projects"],
          // Left out while the mod list cannot be read, rather than claiming none.
          ...(mods ? [[<CountUp key="m" value={mods} />, "community mods"]] : []),
          [<span key="b">{formatSize(bytes)}</span>, "of code verified across projects"],
        ].map(([value, label], i, all) => (
          // A thin gold rule between the numbers: in the row from 560 px, between the columns below.
          <div key={i} className={`${i ? "min-[560px]:border-l min-[560px]:border-brand/50 min-[560px]:pl-6" : ""} ${i % (all.length === 4 ? 2 : 3) ? "max-[559px]:border-l max-[559px]:border-brand/50 max-[559px]:pl-4" : ""}`}>
            <b className="block font-orbitron whitespace-nowrap text-[clamp(15px,3.8vw,20px)] font-bold leading-tight tabular-nums text-gold">{value}</b>
            <span className="block text-[12px] leading-snug text-dim">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
