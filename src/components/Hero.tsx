import { DISCORD_URL, PROJECTS } from "@/lib/projects";
import type { ProjectProgress } from "@/lib/progress";
import type { ProjectId } from "@/lib/projects";
import CountUp from "./CountUp";
import Particles from "./Particles";

const fmtBytes = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)} MB` : `${Math.round(n / 1024).toLocaleString("en-US")} KB`);

export default function Hero({ progress }: { progress: Partial<Record<ProjectId, ProjectProgress>> }) {
  const active = Object.values(progress);
  const bytes = active.reduce((sum, p) => sum + (p?.code.done ?? 0), 0);

  return (
    <div className="relative isolate pb-10 pt-16 sm:pb-16 sm:pt-24">
      <Particles />
      <div aria-hidden className="absolute -left-32 -top-10 -z-10 size-[420px] rounded-full bg-brand opacity-25 blur-[60px] sm:animate-drift sm:blur-[90px]" />
      <div aria-hidden className="absolute -right-36 top-8 -z-10 size-[460px] rounded-full bg-[#3a4fb8] opacity-50 blur-[60px] sm:animate-drift sm:blur-[90px] [animation-delay:-6s]" />

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
      <p className="mt-4 max-w-[660px] text-[17px] text-soft sm:text-[19px]">
        OpenRAC is a hub for community decompilation projects of the Ratchet &amp; Clank series. Each project reconstructs readable source code that compiles to the
        same bytes as the original game, one function at a time, in the open.
      </p>
      <div className="mt-6 flex animate-rise flex-wrap gap-3 [animation-delay:.45s]">
        <a href="#progress" className="rounded-full border border-amber bg-gradient-to-b from-amber to-[#ff8a00] px-5 py-2.5 font-semibold text-[#1a0d00] shadow-[0_6px_24px_rgb(255_138_0/0.35)] transition hover:-translate-y-0.5 hover:brightness-110">
          See progress
        </a>
        <a href={DISCORD_URL} className="rounded-full border border-lav/40 bg-white/[0.03] px-5 py-2.5 font-semibold text-[#e8f0ff] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(0_0_0/0.4)]">
          Join our Discord
        </a>
      </div>

      <div className="mt-11 grid max-w-[760px] animate-rise grid-cols-1 gap-3.5 min-[520px]:grid-cols-3 [animation-delay:.6s]">
        {[
          [<CountUp key="t" value={PROJECTS.filter((p) => !p.sameGameAs).length} />, "titles tracked"],
          [<CountUp key="a" value={active.length} />, "active projects"],
          [<span key="b">{fmtBytes(bytes)}</span>, "of code verified across projects"],
        ].map(([value, label], i) => (
          <div key={i} className="rounded-[14px] border border-lav/25 bg-ink/70 px-[18px] py-4 backdrop-blur-sm transition hover:-translate-y-1 hover:border-brand">
            <b className="block font-orbitron text-[26px] font-bold tabular-nums text-gold">{value}</b>
            <span className="text-[13px] text-dim">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
