import { DISCORD_URL, DOWNLOAD_URL, PROJECTS } from "@/lib/projects";
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
      {/* Soft glows: radial gradients moved by transform only, so they cost no repaint (a CSS blur filter would, every frame). */}
      <div aria-hidden className="absolute -left-48 -top-32 -z-10 size-[620px] bg-[radial-gradient(closest-side,rgb(213_138_0/0.28),transparent)] will-change-transform sm:animate-drift" />
      <div aria-hidden className="absolute -right-56 -top-12 -z-10 size-[680px] bg-[radial-gradient(closest-side,rgb(58_79_184/0.5),transparent)] will-change-transform sm:animate-drift [animation-delay:-8s]" />

      <span className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-lav/35 bg-lav/10 px-3.5 py-1.5 text-[13px] tracking-wide text-lav">
        <i className="size-2 animate-pulse-dot rounded-full bg-[#5be38a] shadow-[0_0_0_0_rgb(91_227_138/0.6)]" />
        Unofficial · open source · community driven
      </span>
      <h1 className="max-w-[900px] font-audiowide text-[clamp(36px,7.2vw,72px)] leading-[1.04]">
        Understanding the{" "}
        <span className="animate-shine bg-gradient-to-r from-amber via-[#ff8a00] to-gold bg-[length:220%_100%] bg-clip-text text-transparent">
          Ratchet &amp; Clank
        </span>{" "}
        series from the inside out.
      </h1>
      <p className="mt-5 max-w-[660px] text-[17px] text-soft sm:text-[19px]">
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
        <a href={DISCORD_URL} className="btn">
          Join our Discord
        </a>
      </div>

      <div className="mt-10 grid max-w-[760px] animate-rise grid-cols-3 gap-2.5 sm:mt-12 sm:gap-3.5 [animation-delay:.6s]">
        {[
          [<CountUp key="t" value={PROJECTS.length} />, "titles tracked"],
          [<CountUp key="a" value={active.length} />, "active projects"],
          [<span key="b">{fmtBytes(bytes)}</span>, "of code verified across projects"],
        ].map(([value, label], i) => (
          <div key={i} className="rounded-2xl border border-lav/25 bg-ink/80 px-3 py-3 sm:px-[18px] sm:py-4">
            <b className="block font-orbitron whitespace-nowrap text-[clamp(15px,4.2vw,26px)] font-bold leading-tight tabular-nums text-gold">{value}</b>
            <span className="mt-0.5 block text-[12px] leading-snug text-dim sm:text-[13px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
