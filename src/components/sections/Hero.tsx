import { formatSize } from "@/lib/format";
import { PROJECTS } from "@/lib/projects";
import type { ProjectProgress } from "@/lib/progress";
import type { ProjectId } from "@/lib/projects";
import CountUp from "@/components/ui/CountUp";
import Particles from "@/components/ui/Particles";

/** The top of the home page: headline, the two main buttons and three headline numbers. */
export default function Hero({ progress }: { progress: Partial<Record<ProjectId, ProjectProgress>> }) {
  const active = Object.values(progress);
  const bytes = active.reduce((sum, p) => sum + (p?.code.done ?? 0), 0);

  return (
    <div className="relative isolate pb-8 pt-12 sm:pb-16 sm:pt-24">
      <Particles />
      {/* A soft gold glow on the right: a radial gradient moved by transform only, so it costs no repaint (a CSS blur filter would, every frame). */}
      <div aria-hidden className="absolute -right-56 -top-24 -z-10 size-[680px] bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-brand)_30%,transparent),transparent)] will-change-transform sm:animate-drift" />

      {/* One line at every width: on a phone the letters shrink with the screen rather than wrap. */}
      <p className="mb-4 whitespace-nowrap font-orbitron text-[clamp(7px,2.35vw,11px)] font-bold uppercase tracking-[.2em] text-brand sm:tracking-[.28em] after:mt-2 after:block after:h-[3px] after:w-11 after:rounded-sm after:bg-brand after:content-[''] sm:text-[13px]">
        Unofficial · open source · community driven
      </p>
      {/* Balanced lines: no word is ever left alone on the last line, whatever the width. */}
      <h1 className="max-w-[860px] text-balance font-audiowide text-[clamp(32px,6.6vw,68px)] leading-[1.06]">
        <span className="animate-shine bg-gradient-to-r from-amber via-deep to-gold bg-[length:220%_100%] bg-clip-text text-transparent">
          Ratchet &amp; Clank
        </span>{" "}
        series, rebuilt from the original bytes.
      </h1>
      <p className="mt-5 max-w-[600px] text-[15px] leading-relaxed text-soft sm:text-[17px]">
        OpenRAC is a hub for community decompilation projects of the Ratchet &amp; Clank series. Each project reconstructs readable source code that compiles to the
        same bytes as the original game, one function at a time, in the open.
      </p>
      <div className="mt-7 grid animate-rise gap-3 [animation-delay:.45s] min-[560px]:flex min-[560px]:flex-wrap">
        {/* The main thing a visitor comes for, so it leads; it opens the Download panel right under the hero (DownloadPanel.tsx). */}
        <a id="download-button" href="#download" aria-controls="download" className="btn btn-primary">
          <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 flex-none fill-none stroke-current stroke-2">
            <path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download the launcher
        </a>
        <a href="#progress" className="btn">
          See progress
        </a>
      </div>

      <div className="mt-10 grid max-w-[760px] animate-rise grid-cols-3 gap-2.5 sm:mt-12 sm:gap-3.5 [animation-delay:.6s]">
        {[
          [<CountUp key="t" value={new Set(PROJECTS.map((p) => p.name)).size} />, "titles tracked"],
          [<CountUp key="a" value={active.length} />, "active projects"],
          [<span key="b">{formatSize(bytes)}</span>, "of code verified across projects"],
        ].map(([value, label], i) => (
          <div key={i} className="surface px-3 py-3 sm:px-[18px] sm:py-4">
            <b className="block font-orbitron whitespace-nowrap text-[clamp(15px,4.2vw,26px)] font-bold leading-tight tabular-nums text-gold">{value}</b>
            <span className="mt-0.5 block text-[12px] leading-snug text-dim sm:text-[13px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
