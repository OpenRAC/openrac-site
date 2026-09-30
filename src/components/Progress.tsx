import Image from "next/image";
import type { CSSProperties } from "react";
import { PROJECTS, type Project, type ProjectId } from "@/lib/projects";
import { percent } from "@/lib/types";
import type { ProjectProgress } from "@/lib/progress";
import Section from "./Section";

/** Two decimals, like decomp.dev. */
const pct = (p: number) => `${p.toFixed(2).replace(".", ",")} %`;

const GITHUB = (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-7 flex-none fill-current sm:size-9">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

/** One title, styled like its own menu. Rendered on the server. */
function Card({ project: g, progress: p }: { project: Project; progress?: ProjectProgress }) {
  const t = g.theme;
  const style = {
    "--box": t.box, "--bd": t.border, "--tx": t.text, "--tx2": t.text2,
    // the gradient is the card's own background; the optional backdrop image is laid over it
    backgroundImage: `radial-gradient(90% 70% at 70% 0, ${t.from}, transparent 70%), linear-gradient(160deg, ${t.from}, ${t.to})`,
  } as CSSProperties;
  const box = "border-[7px] border-(--bd) bg-(--box) px-5 py-3 text-center text-(--tx) shadow-[0_8px_24px_rgb(0_0_0/0.35)] sm:px-6 sm:py-3.5";
  const codePct = p ? percent(p.code) : 0;

  return (
    <section
      aria-label={`${g.name} progress`}
      style={style}
      className={`relative flex min-h-[560px] flex-col items-center justify-center gap-5 overflow-hidden rounded-[30px] bg-ink px-3.5 py-8 shadow-[0_18px_50px_rgb(0_0_0/0.45)] sm:h-[600px] sm:px-6 sm:py-10 ${g.fontClass}`}
    >
      {/* Optional backdrop (not in the repository). If the file is missing, the gradient above shows. */}
      <Image src={g.image} alt="" fill sizes="(min-width: 1080px) 1048px, 100vw" quality={70} className="object-cover" />
      <div aria-hidden className="absolute inset-0 bg-black/20" />
      <div className={`${box} relative w-full max-w-[640px] text-[clamp(24px,4.5vw,44px)] leading-tight sm:px-10 sm:py-6`}>
        {g.name}
        <small className="mt-1.5 block text-[.5em] tracking-wide text-(--tx2)">decompilation · {g.year}</small>
      </div>

      {p ? (
        <>
          <div className="relative flex w-full max-w-[640px] flex-wrap justify-center gap-4">
            <div className={`${box} flex-1 text-[clamp(18px,3vw,26px)]`}>Progress</div>
            <div className={`${box} flex-[2] text-[clamp(20px,3.4vw,32px)] tabular-nums`}>{pct(codePct)}</div>
          </div>

          <div className="relative w-full max-w-[640px]">
            <div
              role="progressbar"
              aria-label={`${g.name} code matched`}
              aria-valuenow={Math.round(codePct * 10) / 10}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-3.5 overflow-hidden rounded-[7px] border-2 border-(--bd) bg-black/45"
            >
              <i style={{ "--w": `${codePct}%` } as CSSProperties} className="bar-fill relative block h-full overflow-hidden rounded-md bg-gradient-to-r from-(--tx2) to-(--tx)">
                <span aria-hidden className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-white/45 to-transparent" />
              </i>
            </div>
          </div>

          {g.repo && (
            <a href={`https://github.com/${g.repo}`} className={`${box} relative inline-flex max-w-full items-center gap-3.5 text-[clamp(14px,2.4vw,22px)] no-underline transition hover:brightness-125`}>
              {GITHUB}
              <span className="truncate">{g.repo}</span>
            </a>
          )}
          {p.note && <p className="relative px-2 text-center text-[13px] text-(--tx2)">{p.note}{p.stale ? " · snapshot, live numbers unavailable" : ""}</p>}
        </>
      ) : (
        <>
          <div className="relative flex w-full max-w-[640px] flex-wrap justify-center gap-4 opacity-85">
            <div className={`${box} flex-1 text-[clamp(18px,3vw,26px)]`}>Progress</div>
            <div className={`${box} flex-[2] text-[clamp(16px,2.6vw,24px)]`}>Not started</div>
          </div>
          <div className="relative h-3.5 w-full max-w-[640px] rounded-[7px] border-2 border-(--bd) bg-black/45" />
        </>
      )}
    </section>
  );
}

export default function Progress({ progress }: { progress: Partial<Record<ProjectId, ProjectProgress>> }) {
  return (
    <Section id="progress" title="Progress" sub="Every title gets its own menu. The percentage is the share of the game's code that compiles to exactly the retail bytes.">
      <div className="grid gap-7">
        {PROJECTS.map((g) => (
          <Card key={g.id} project={g} progress={progress[g.id]} />
        ))}
      </div>
      <p className="mt-3.5 text-[13px] text-dim">
        The figure is matched code, weighted by size, the same number decomp.dev shows. Each title links to its own community repository, and a title
        without a link has not been started. Up Your Arsenal counts hand-written assembly that is verified against retail as done, as objdiff does, and
        lists its C-only count underneath. Numbers are read from the repositories on the server and refreshed every ten minutes. Roadmap entries are
        not a promise.
      </p>
    </Section>
  );
}
