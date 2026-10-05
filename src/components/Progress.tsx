import Image from "next/image";
import type { CSSProperties } from "react";
import { PROJECTS, type Project, type ProjectId } from "@/lib/projects";
import { percent } from "@/lib/types";
import type { ProjectProgress } from "@/lib/progress";
import GameTabs from "./GameTabs";
import Section from "./Section";

/** Two decimals, like decomp.dev. */
const pct = (p: number) => `${p.toFixed(2).replace(".", ",")} %`;

/** Thin-space groups, so they cannot be mistaken for the decimal comma above. */
const bytes = (n: number) => n.toLocaleString("en-US").replace(/,/g, "\u202f");

/** The line under every bar: the same measure as the percentage, for every project. */
const matchedLine = (p: ProjectProgress) =>
  `${bytes(p.code.done)} of ${bytes(p.code.total)} code bytes matched${p.stale ? " · snapshot, live numbers unavailable" : ""}`;

const RESEARCH_TEXT = "Research phase: the game and its toolchain are still being mapped. Progress is tracked like every other project.";

/** Marks a project that is still in its research phase. */
function ResearchBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-orbitron text-[10px] font-bold uppercase tracking-[.2em] sm:text-[11px] ${className}`}>
      <i aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />
      Research phase
    </span>
  );
}

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
      aria-label={`${g.name}${g.region ? ` (${g.region})` : ""} progress`}
      style={style}
      className={`relative flex min-h-[560px] flex-col items-center justify-center gap-5 overflow-hidden rounded-[30px] bg-ink px-3.5 py-8 shadow-[0_18px_50px_rgb(0_0_0/0.45)] sm:h-[600px] sm:px-6 sm:py-10 ${g.fontClass}`}
    >
      {/* Optional backdrop (not in the repository). If the file is missing, the gradient above shows. */}
      <Image src={g.image} alt="" fill sizes="(min-width: 1080px) 1048px, 100vw" quality={70} className="object-cover" />
      <div aria-hidden className="absolute inset-0 bg-black/20" />
      {g.phase === "research" && <ResearchBadge className="relative border-(--bd) bg-(--box) text-(--tx)" />}
      <div className={`${box} relative w-full max-w-[640px] text-[clamp(24px,4.5vw,44px)] leading-tight sm:px-10 sm:py-6`}>
        {g.name}
        <small className="mt-1.5 block text-[.5em] tracking-wide text-(--tx2)">{g.subtitle ?? `decompilation · ${g.year}${g.region ? ` · ${g.region}` : ""}`}</small>
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
              <i
                style={{ "--w": `${codePct}%` } as CSSProperties}
                className="bar-fill relative block h-full overflow-hidden rounded-md bg-gradient-to-r from-(--tx2) to-(--tx)"
              >
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
          <p className="relative px-2 text-center text-[13px] text-(--tx2)">
            {matchedLine(p)}
            {g.phase === "research" && <span className="mt-1 block">{RESEARCH_TEXT}</span>}
          </p>
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

function MobileCard({ project: g, progress: p }: { project: Project; progress?: ProjectProgress }) {
  const codePct = p ? percent(p.code) : 0;
  const lit = Math.floor(codePct / 10);

  return (
    <section
      aria-label={`${g.name} progress`}
      className="relative flex min-h-[560px] flex-col items-center justify-center gap-5 overflow-hidden rounded-[30px] bg-[#020b14] px-3.5 py-8 shadow-[0_18px_50px_rgb(0_0_0/0.45)] sm:h-[600px] sm:px-6 sm:py-10 font-pixel"
    >
      {/* Authentic Going Mobile starfield backdrop with Ratchet */}
      <Image src={g.image} alt="" fill sizes="(min-width: 1080px) 1048px, 100vw" quality={90} className="object-cover opacity-90" />
      <div aria-hidden className="absolute inset-0 bg-black/35" />

      {/* Main Title Box in Pixel Styling */}
      <div className="relative w-full max-w-[640px] rounded-xl border-4 border-[#00f0ff] bg-[#002433]/92 px-4 py-5 text-center text-[#e0f2fe] shadow-[0_8px_24px_rgba(0,0,0,0.45)] sm:px-8 sm:py-6">
        <h2 className="text-[clamp(16px,2.8vw,28px)] font-normal tracking-wide text-[#00f0ff]">
          {g.name}
        </h2>
        <small className="mt-2.5 block text-[9px] tracking-wider text-[#7dd3fc] sm:text-[11px]">
          {g.subtitle ?? "Java reconstruction · 2005 · J2ME"}
        </small>
      </div>

      {/* Progress Box in Pixel Styling */}
      <div className="relative flex w-full max-w-[640px] flex-wrap justify-center gap-3">
        <div className="flex-1 rounded-xl border-4 border-[#00f0ff] bg-[#002433]/92 px-4 py-3 text-center text-[clamp(11px,1.8vw,16px)] text-[#00f0ff] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          PROGRESS
        </div>
        <div className="flex-[2] rounded-xl border-4 border-[#00f0ff] bg-[#002433]/92 px-4 py-3 text-center text-[clamp(13px,2.2vw,22px)] text-[#00f0ff] shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
          {pct(codePct)}
        </div>
      </div>

      {/* Segmented Pixel Progress Bar */}
      <div className="relative w-full max-w-[640px]">
        <div
          role="progressbar"
          aria-label={`${g.name} code matched`}
          aria-valuenow={Math.round(codePct * 10) / 10}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-5 overflow-hidden rounded-lg border-2 border-[#00f0ff] bg-[#001018] p-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
        >
          <div className="flex h-full w-full gap-1">
            {[...Array(10)].map((_, i) => (
              <span
                key={i}
                className={`h-full flex-1 rounded-xs ${i < lit ? "bg-gradient-to-t from-[#00b4d8] to-[#00f0ff]" : "bg-[#00f0ff]/10"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* GitHub Repo Link in Pixel Style */}
      {g.repo && (
        <a
          href={`https://github.com/${g.repo}`}
          className="relative inline-flex max-w-full items-center gap-3 rounded-xl border-4 border-[#00f0ff] bg-[#002433]/92 px-5 py-3 text-[10px] text-[#e0f2fe] no-underline shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:bg-[#00384d] hover:brightness-125 sm:text-xs"
        >
          {GITHUB}
          <span className="truncate">{g.repo}</span>
        </a>
      )}

      {/* Note */}
      {p && (
        <p className="relative px-2 text-center text-[9px] tracking-wider text-[#7dd3fc] sm:text-[11px]">
          {matchedLine(p)}
        </p>
      )}
    </section>
  );
}

function DeadlockedCard({ project: g, progress: p }: { project: Project; progress?: ProjectProgress }) {
  const codePct = p ? percent(p.code) : 0;

  return (
    <section
      aria-label={`${g.name}${g.phase === "research" ? " (research phase)" : ""} progress`}
      className="relative flex min-h-[560px] flex-col items-center justify-center gap-5 overflow-hidden rounded-[30px] bg-[#0c0d12] px-3.5 py-8 shadow-[0_18px_50px_rgb(0_0_0/0.5)] sm:h-[600px] sm:px-6 sm:py-10 font-orbitron"
    >
      {/* Battledome arena backdrop */}
      <Image
        src={g.image}
        alt=""
        fill
        sizes="(min-width: 1080px) 1048px, 100vw"
        quality={85}
        className="object-cover"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/65" />

      {/* DreadZone combat terminal box inspired by Deadlocked menu */}
      <div className="relative w-full max-w-[640px]">
        {/* Outer terminal frame */}
        <div className="overflow-hidden rounded-xl border-2 border-[#b91c1c] bg-[#12151c]/95 p-2 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#161a22]/90 p-2 sm:p-2.5">
            
            {/* Active Header item (inspired by 'SINGLE PLAYER' active row in images.jpeg) */}
            <div className="relative flex flex-col items-center justify-center rounded-md border border-[#ff6b6b]/40 bg-gradient-to-r from-[#991b1b] via-[#dc2626] to-[#991b1b] px-4 py-3 text-center text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.6)]">
              {g.phase === "research" && <ResearchBadge className="mb-2 border-white/45 bg-black/35 text-white" />}
              <h2 className="px-2 text-[clamp(18px,3.5vw,32px)] font-black tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
                {g.name.toUpperCase()}
              </h2>
              <small className="mt-1 block text-[10px] font-semibold tracking-widest text-red-100 uppercase sm:text-xs">
                {g.subtitle ?? `decompilation · ${g.year}${g.region ? ` · ${g.region}` : ""}`}
              </small>
            </div>

            {/* Menu item 1: Progress */}
            <div className="flex items-center justify-between rounded-md border border-white/5 bg-[#1b202a]/95 px-5 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <span className="text-[clamp(12px,2vw,16px)] font-bold tracking-widest text-[#9ca3af]">
                PROGRESS
              </span>
              <span className="text-[clamp(16px,2.8vw,24px)] font-black tabular-nums tracking-wider text-white">
                {pct(codePct)}
              </span>
            </div>

            {/* DreadZone energy / progress meter */}
            <div className="px-0.5">
              <div
                role="progressbar"
                aria-label={`${g.name} code matched`}
                aria-valuenow={Math.round(codePct * 10) / 10}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-4 overflow-hidden rounded-md border border-[#dc2626]/60 bg-black/70 p-0.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]"
              >
                <i
                  style={{ "--w": `${codePct}%` } as CSSProperties}
                  className="bar-fill relative block h-full overflow-hidden rounded-xs bg-gradient-to-r from-[#991b1b] via-[#dc2626] to-[#f87171]"
                >
                  <span aria-hidden className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-white/45 to-transparent" />
                </i>
              </div>
            </div>

            {/* Menu item 2: GitHub Repository (interactive hover state) */}
            {g.repo && (
              <a
                href={`https://github.com/${g.repo}`}
                className="group relative flex items-center justify-center gap-3 rounded-md border border-white/5 bg-[#1b202a]/95 px-5 py-3 text-[#d1d5db] no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-[#dc2626] hover:bg-gradient-to-r hover:from-[#7f1d1d]/90 hover:via-[#991b1b]/90 hover:to-[#7f1d1d]/90 hover:text-white"
              >
                {GITHUB}
                <span className="truncate text-[clamp(12px,2vw,17px)] font-bold tracking-wide">
                  {g.repo}
                </span>
              </a>
            )}

            {/* Menu item 3: Status */}
            <div className="flex flex-col items-center justify-center gap-1 rounded-md border border-white/5 bg-[#12151b]/90 px-4 py-2.5 text-center">
              {p && <p className="text-[11px] font-medium tracking-wide text-[#d1d5db] sm:text-xs">{matchedLine(p)}</p>}
              {g.phase === "research" && <p className="text-[11px] tracking-wide text-[#9ca3af] sm:text-xs">{RESEARCH_TEXT}</p>}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

/** The card that fits the project: most use the shared one, a few have their game's own menu. */
function ProjectCard({ project, progress }: { project: Project; progress?: ProjectProgress }) {
  if (project.id === "deadlocked") return <DeadlockedCard project={project} progress={progress} />;
  if (project.id === "gm") return <MobileCard project={project} progress={progress} />;
  return <Card project={project} progress={progress} />;
}

/** A game's card, or a tab per project when more than one project decompiles it. */
function Game({ project: g, progress }: { project: Project; progress: Partial<Record<ProjectId, ProjectProgress>> }) {
  const others = PROJECTS.filter((p) => p.sameGameAs === g.id);
  if (others.length === 0) return <ProjectCard project={g} progress={progress[g.id]} />;
  return (
    <GameTabs
      game={g.name}
      tabs={[g, ...others].map((p) => ({
        id: p.id,
        region: p.region ?? p.platform ?? "",
        project: p.repo?.split("/")[1] ?? p.name,
        panel: <ProjectCard project={p} progress={progress[p.id]} />,
      }))}
    />
  );
}

export default function Progress({ progress }: { progress: Partial<Record<ProjectId, ProjectProgress>> }) {
  const mainline = PROJECTS.filter((p) => p.category !== "spinoff" && !p.sameGameAs);
  const spinoffs = PROJECTS.filter((p) => p.category === "spinoff" && !p.sameGameAs);

  return (
    <Section id="progress" title="Progress" sub="Every title gets its own menu. The percentage is the share of the game's code that compiles to exactly the retail bytes.">
      <div className="space-y-12">
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2.5 font-orbitron text-lg font-bold tracking-wide text-lav sm:text-xl">
                <span className="size-2.5 rounded-full bg-brand" />
                Original Trilogy &amp; Deadlocked
              </h3>
              <p className="mt-1 text-xs text-dim sm:text-sm">
                The four Insomniac PlayStation 2 releases, from the 2002 debut to the combat arena of Deadlocked.
              </p>
            </div>
            <span className="rounded-full border border-lav/20 bg-lav/5 px-3 py-1 font-orbitron text-xs text-dim">
              PlayStation 2
            </span>
          </div>
          <div className="grid gap-7">
            {mainline.map((g) => (
              <Game key={g.id} project={g} progress={progress} />
            ))}
          </div>
        </div>

        {spinoffs.length > 0 && (
          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2.5 font-orbitron text-lg font-bold tracking-wide text-lav sm:text-xl">
                  <span className="size-2.5 rounded-full bg-[#00b4d8]" />
                  Spin-offs &amp; Handhelds
                </h3>
                <p className="mt-1 text-xs text-dim sm:text-sm">
                  Mobile entries and side projects in the Ratchet &amp; Clank universe.
                </p>
              </div>
              <span className="rounded-full border border-[#00b4d8]/40 bg-[#00b4d8]/10 px-3 py-1 font-orbitron text-xs text-[#7dd3fc]">
                J2ME / Mobile
              </span>
            </div>
            <div className="grid gap-7">
              {spinoffs.map((g) => (
                <Game key={g.id} project={g} progress={progress} />
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="mt-6 text-[13px] text-dim">
        The figure is matched code, weighted by size, the same number decomp.dev shows. Each title links to its own community repository, and a title
        without a link has not been started. A title marked research phase is still mapping its game, but is measured the same way. Numbers are read from the repositories on the server and refreshed every ten minutes. Roadmap entries are
        not a promise.
      </p>
    </Section>
  );
}
