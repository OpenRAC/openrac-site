import { DOWNLOAD_URL, PROJECTS } from "@/lib/projects";
import type { ProjectProgress } from "@/lib/progress";
import type { ProjectId } from "@/lib/projects";
import CountUp from "./CountUp";
import Particles from "./Particles";

const fmtBytes = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} MB` : `${Math.round(n / 1024).toLocaleString("en-US")} KB`);

export default function Hero({ progress }: { progress: Partial<Record<ProjectId, ProjectProgress>> }) {
  const active = Object.values(progress);
  const bytes = active.reduce((sum, p) => sum + (p?.code.done ?? 0), 0);

  return (
    <div className="relative isolate pb-8 pt-12 sm:pb-16 sm:pt-24">
      <Particles />
      {/* A soft gold glow on the right: a radial gradient moved by transform only, so it costs no repaint (a CSS blur filter would, every frame). */}
      <div aria-hidden className="absolute -right-56 -top-24 -z-10 size-[680px] bg-[radial-gradient(closest-side,rgb(213_138_0/0.3),transparent)] will-change-transform sm:animate-drift" />

      {/* The same eyebrow as every section's number below. */}
      <p className="mb-4 font-orbitron text-[11px] font-bold uppercase tracking-[.28em] text-brand after:mt-2 after:block after:h-[3px] after:w-11 after:rounded-sm after:bg-brand after:content-[''] sm:text-[13px]">
        Unofficial · open source · community driven
      </p>
      {/* Balanced lines: no word is ever left alone on the last line, whatever the width. */}
      <h1 className="max-w-[860px] text-balance font-audiowide text-[clamp(32px,6.6vw,68px)] leading-[1.06]">
        <span className="animate-shine bg-gradient-to-r from-amber via-[#ff8a00] to-gold bg-[length:220%_100%] bg-clip-text text-transparent">
          Ratchet &amp; Clank
        </span>
        , rebuilt from the original bytes.
      </h1>
      <p className="mt-5 max-w-[600px] text-[15px] leading-relaxed text-soft sm:text-[17px]">
        OpenRAC is a hub for community decompilation projects of the Ratchet &amp; Clank series. Each project reconstructs readable source code that compiles to the
        same bytes as the original game, one function at a time, in the open.
      </p>
      <div className="mt-7 grid animate-rise gap-3 [animation-delay:.45s] min-[560px]:flex min-[560px]:flex-wrap">
        <a href="#progress" className="btn btn-primary">
          See progress
        </a>
        <a href={DOWNLOAD_URL} className="btn">
          Download the launcher
        </a>
      </div>

      <div className="mt-10 grid max-w-[760px] animate-rise grid-cols-3 gap-2.5 sm:mt-12 sm:gap-3.5 [animation-delay:.6s]">
        {[
          [<CountUp key="t" value={new Set(PROJECTS.map((p) => p.name)).size} />, "titles tracked"],
          [<CountUp key="a" value={active.length} />, "active projects"],
          [<span key="b">{fmtBytes(bytes)}</span>, "of code verified across projects"],
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
