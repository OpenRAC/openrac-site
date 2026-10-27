import Image from "next/image";
import type { CSSProperties } from "react";
import { formatSize } from "@/lib/format";
import { getGithubAvatar } from "@/lib/github";
import { PROJECTS, type Project, type ProjectId } from "@/lib/projects";
import { percent } from "@/lib/progress/types";
import type { ProjectProgress } from "@/lib/progress";
import Backdrop from "@/components/ui/Backdrop";
import { GithubIcon } from "@/components/ui/icons";
import Section from "@/components/ui/Section";

/** Two decimals, like ByteMatch. */
const pct = (p: number) => `${p.toFixed(2).replace(".", ",")} %`;

/** The line under every bar: the same measure as the percentage, in KB or MB as fits the game. */
const matchedLine = (p: ProjectProgress) =>
  `${formatSize(p.code.done)} of ${formatSize(p.code.total)} code matched${p.stale ? " · snapshot, live numbers unavailable" : ""}`;

/** The exact figures, shown on hover. */
const exactLine = (p: ProjectProgress) =>
  `${p.code.done.toLocaleString("en-US")} of ${p.code.total.toLocaleString("en-US")} bytes`;

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

/** "maintained by" with each maintainer's GitHub picture: the work on every card is theirs. */
async function Maintainers({ users, className = "" }: { users?: string[]; className?: string }) {
  if (!users?.length) return null;
  const avatars = await Promise.all(users.map(getGithubAvatar));
  return (
    <p className={`relative flex flex-wrap items-center gap-x-2.5 gap-y-1.5 ${className}`}>
      <span className="opacity-80">maintained by</span>
      {users.map((u, i) => (
        <a key={u} href={`https://github.com/${u}`} className="inline-flex items-center gap-1.5 font-semibold no-underline hover:underline">
          {avatars[i] && <Image src={avatars[i]} alt="" width={22} height={22} className="size-[22px] rounded-full border border-current/40" />}
          @{u}
        </a>
      ))}
    </p>
  );
}

/** Type sizes on every card, scaled to the card's own width (cqi), so a half card is not crowded. */
const SIZES = { name: "text-[clamp(20px,5cqi,28px)]", pct: "text-[clamp(20px,5cqi,28px)]", small: "text-[12px] @xl:text-[13px]" };

/** How colourful a hex colour is: its strongest channel minus its weakest, 0 for a grey. */
const chroma = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(...c) - Math.min(...c);
};

/** A title's accent: its text colour, or its second one where the text is near white (Deadlocked, Size Matters, Secret Agent Clank), so every card keeps a colour of its own. */
const accent = (t: Project["theme"]) => (chroma(t.text) < 40 ? t.text2 : t.text);

/** A thin bar in the title's own accent, the one colour on the card. */
function Bar({ value, name }: { value: number; name: string }) {
  return (
    <div
      role="progressbar"
      aria-label={`${name} code matched`}
      aria-valuenow={Math.round(value * 10) / 10}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 overflow-hidden rounded-full bg-white/10"
    >
      <i style={{ "--w": `${value}%` } as CSSProperties} className="bar-fill block h-full rounded-full bg-(--tx)" />
    </div>
  );
}

/** The region as people say it: the badge on a game with a card per release. */
const REGION_NAME: Record<string, string> = { PAL: "PAL · Europe", "NTSC-U": "NTSC-U · USA" };

/**
 * One title over its own backdrop, darkened so the text reads the same on every card. The title's
 * typeface and one accent (the percentage and the bar) set the cards apart; everything else is the
 * site's own neutral text. All cards share one layout (name and percentage, the bar, then the
 * repository, the maintainers and the bytes), laid out by the card's own width (container queries).
 * `release`: the card is one of several for the same game, so its region is shown as a badge.
 * Rendered on the server.
 */
function Card({ project: g, progress: p, release = false }: { project: Project; progress?: ProjectProgress; release?: boolean }) {
  const value = p ? percent(p.code) : 0;

  return (
    <section
      aria-label={`${g.name}${g.region ? ` (${g.region})` : ""}${g.phase === "research" ? ", research phase" : ""} progress`}
      style={{ "--tx": accent(g.theme) } as CSSProperties}
      data-reveal
      className="group/card @container relative isolate overflow-hidden rounded-2xl bg-ink"
    >
      {/* The backdrop leans in a little under the pointer (hover only: never on touch screens). Its
          zoom runs on a layer of its own, which a rounded overflow does not always clip (square
          corners in Chrome and Safari), so the backdrop is cut to the card's corners itself. */}
      <Backdrop src={g.image} fallback={g.fallbackImage} zoom="group-hover/card:[--zoom:1.04]" className="rounded-[inherit] [clip-path:inset(0_round_16px)] [mask-image:linear-gradient(#000,#000)] saturate-[.7]" />
      {/* Dark over the whole picture, darkest where the text sits. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/85 to-ink/70" />

      <div className="relative grid gap-4 p-5 @xl:p-6">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h4 className={`${SIZES.name} ${g.fontClass} leading-tight text-hi`}>{g.name}</h4>
            {/* A card of one release (PAL, NTSC-U) shows its region as a badge on the line under the name. */}
            <p className={`mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-dim ${SIZES.small}`}>
              <span>{g.subtitle ?? `decompilation · ${g.year}${g.region && !release ? ` · ${g.region}` : ""}`}</span>
              {release && g.region && (
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[.15em] @xl:text-[11px]">
                  {REGION_NAME[g.region] ?? g.region}
                </span>
              )}
            </p>
          </div>
          {/* As wide as "100,00 %" whatever the figure, so the card keeps its layout as it grows. */}
          <b className={`${SIZES.pct} ${g.fontClass} grid flex-none justify-items-end whitespace-nowrap leading-tight tabular-nums text-(--tx)`}>
            <span className="col-start-1 row-start-1">{p ? pct(value) : "Not started"}</span>
            <span aria-hidden className="invisible col-start-1 row-start-1">{pct(100)}</span>
          </b>
        </div>

        <Bar value={value} name={g.name} />

        {/* Narrow card: repository, maintainers and size each on a line of their own; wide card: one row. */}
        <div className={`flex min-w-0 flex-col items-start gap-2 text-dim @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-x-5 ${SIZES.small}`}>
          {g.repo && (
            <a href={`https://github.com/${g.repo}`} className="inline-flex min-h-8 min-w-0 max-w-full items-center gap-2 text-text no-underline transition-colors hover:text-hi">
              <GithubIcon />
              <span className="truncate">{g.repo}</span>
            </a>
          )}
          <Maintainers users={g.maintainers} />
          {p && <p title={exactLine(p)} className="@xl:ml-auto">{matchedLine(p)}</p>}
        </div>
        {g.phase === "research" && (
          <p className="flex flex-wrap items-center gap-2.5 text-[12px] text-dim">
            <ResearchBadge className="border-white/15 text-text" />
            <span>{RESEARCH_TEXT}</span>
          </p>
        )}
      </div>
      {/* The frame, drawn over everything: the picture under it never shows past its line or its corners. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/8 transition-colors duration-500 group-hover/card:border-white/20" />
    </section>
  );
}

/** Consecutive cards of the same game (its releases) go in one row, side by side. */
function rows(projects: readonly Project[]): Project[][] {
  const out: Project[][] = [];
  for (const g of projects) {
    const last = out.at(-1);
    if (last && last[0].name === g.name) last.push(g);
    else out.push([g]);
  }
  return out;
}

/** A group of cards under its own heading and platform tag. */
function Group({ title, text, platforms, projects, progress }: {
  title: string;
  text: string;
  platforms: string;
  projects: readonly Project[];
  progress: Partial<Record<ProjectId, ProjectProgress>>;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="font-orbitron text-lg font-bold tracking-wide text-hi sm:text-xl">
            {title}
          </h3>
          <p className="mt-1 text-sm text-dim">{text}</p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 font-orbitron text-xs text-dim">{platforms}</span>
      </div>
      <div className="grid gap-3 sm:gap-4">
        {rows(projects).map((row) =>
          row.length === 1 ? (
            <Card key={row[0].id} project={row[0]} progress={progress[row[0].id]} />
          ) : (
            <div key={row[0].id} className="grid gap-3 sm:gap-4 md:grid-cols-2">
              {row.map((g) => (
                <Card key={g.id} project={g} progress={progress[g.id]} release />
              ))}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/** "Progress": a card per title, the main series first, then the spin-offs. */
export default function Progress({ progress }: { progress: Partial<Record<ProjectId, ProjectProgress>> }) {
  const mainline = PROJECTS.filter((p) => p.category !== "spinoff");
  const spinoffs = PROJECTS.filter((p) => p.category === "spinoff");

  return (
    <Section id="progress" title="Progress" sub="The percentage is the share of each game's code that compiles to exactly the retail bytes.">
      <div className="space-y-12">
        <Group
          title="Original Trilogy & Deadlocked"
          text="The four PlayStation 2 releases of the main series, from the 2002 debut to the combat arena of Deadlocked."
          platforms="PlayStation 2"
          projects={mainline}
          progress={progress}
        />
        {spinoffs.length > 0 && (
          <Group
            title="Spin-offs & Handhelds"
            text="Handheld and spin-off entries in the Ratchet & Clank universe."
            platforms="PSP / PS2 / Mobile"
            projects={spinoffs}
            progress={progress}
          />
        )}
      </div>
      <p className="mt-8 max-w-[860px] text-[13px] text-dim">
        The figure is matched code, weighted by size, the same number ByteMatch shows. Each title links to its own community repository, and a title
        without a link has not been started. Numbers are read from the repositories on the server and refreshed every ten minutes. Roadmap entries are
        not a promise.
      </p>
    </Section>
  );
}
