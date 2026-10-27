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

/**
 * What sets each title's card apart, on top of its colours and typeface (Project.theme, fontClass):
 * the shape of its boxes, its title plate and its bar, after the game's own menus.
 */
interface Look {
  /** Shape of every box on the card. */
  box: string;
  /** Extra classes for the title plate. */
  title?: string;
  /** The bar's fill; default: the card's two text colours. */
  fill?: string;
  /** Ten lit segments instead of a smooth bar (Going Mobile's pixel meter). */
  segments?: boolean;
}

/** Type sizes on every card, scaled to the card's own width (cqi), so a half card is not crowded. */
const SIZES = { name: "text-[clamp(20px,5.2cqi,30px)]", pct: "text-[clamp(18px,4.8cqi,28px)]", small: "text-[12px] @xl:text-[13px]" };

const BEVEL = "[clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)]";

const LOOKS: Partial<Record<ProjectId, Look>> = {
  deadlocked: {
    box: "rounded-md border border-white/15",
    title: "border-[#c05050]/40! bg-gradient-to-r from-[#3d1212] via-[#5e1919] to-[#3d1212] text-[#f1e8e8] uppercase tracking-wider",
    fill: "from-[#5c1717] via-[#8f2424] to-[#c05454]",
  },
  gm: { box: "rounded-xl border-[3px] border-(--bd)", segments: true },
  sm: { box: `${BEVEL} border-2 border-(--bd)`, title: "uppercase tracking-wider", fill: "from-[#7d6015] via-[#a8842e] to-[#d2ae58]" },
  sac: { box: "rounded-lg border-[3px] border-(--bd)" },
};
const DEFAULT_LOOK: Look = { box: "border-[3px] border-(--bd)" };

function Bar({ value, name, look }: { value: number; name: string; look: Look }) {
  const lit = Math.floor(value / 10);
  return (
    <div
      role="progressbar"
      aria-label={`${name} code matched`}
      aria-valuenow={Math.round(value * 10) / 10}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative h-3.5 overflow-hidden rounded-[7px] border-2 border-(--bd) bg-black/50 p-px"
    >
      {look.segments ? (
        <div className="flex h-full gap-1">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`h-full flex-1 rounded-[2px] ${i < lit ? "bg-(--tx)" : "bg-(--tx)/12"}`} />
          ))}
        </div>
      ) : (
        <i
          style={{ "--w": `${value}%` } as CSSProperties}
          className={`bar-fill relative block h-full overflow-hidden rounded-[5px] bg-gradient-to-r ${look.fill ?? "from-(--tx2) to-(--tx)"}`}
        >
          <span aria-hidden className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-white/45 to-transparent" />
        </i>
      )}
    </div>
  );
}

/** The region as people say it: the badge on a game with a card per release. */
const REGION_NAME: Record<string, string> = { PAL: "PAL · Europe", "NTSC-U": "NTSC-U · USA" };

/**
 * One title, in the colours, typeface and box shapes of its own menus, over its backdrop. All
 * cards share one layout (name and percentage, the bar, then the repository, the maintainers and
 * the bytes), so they read alike and only their accents differ. It lays itself out by its own
 * width (container queries), so a card in a pair of releases stacks like one on a phone.
 * `release`: the card is one of several for the same game, so its region is shown as a badge.
 * Rendered on the server.
 */
function Card({ project: g, progress: p, release = false }: { project: Project; progress?: ProjectProgress; release?: boolean }) {
  const t = g.theme;
  const look = LOOKS[g.id] ?? DEFAULT_LOOK;
  const value = p ? percent(p.code) : 0;
  const style = {
    "--box": t.box, "--bd": t.border, "--tx": t.text, "--tx2": t.text2,
    backgroundImage: `radial-gradient(90% 90% at 85% 0, ${t.from}, transparent 70%), linear-gradient(160deg, ${t.from}, ${t.to})`,
  } as CSSProperties;
  const box = `${look.box} bg-(--box) text-(--tx) shadow-[0_6px_18px_rgb(0_0_0/0.35)]`;

  return (
    <section
      aria-label={`${g.name}${g.region ? ` (${g.region})` : ""}${g.phase === "research" ? ", research phase" : ""} progress`}
      style={style}
      data-reveal
      className={`group/card @container relative isolate overflow-hidden rounded-[22px] bg-ink shadow-[0_14px_40px_rgb(0_0_0/0.4)] transition-shadow duration-500 hover:shadow-[0_18px_48px_rgb(0_0_0/0.5)] ${g.fontClass}`}
    >
      {/* The backdrop leans in a little under the pointer (hover only: never on touch screens). Its
          zoom runs on a layer of its own, which a rounded overflow does not always clip (square
          corners in Chrome and Safari), so the backdrop is cut to the card's corners itself. */}
      <Backdrop src={g.image} fallback={g.fallbackImage} zoom="group-hover/card:[--zoom:1.05]" className="rounded-[inherit] [clip-path:inset(0_round_22px)] [mask-image:linear-gradient(#000,#000)]" />
      {/* Darker where the text sits, so every backdrop reads the same. */}
      <div aria-hidden className="absolute inset-0 bg-black/40 @xl:bg-transparent @xl:bg-gradient-to-r @xl:from-black/70 @xl:via-black/40 @xl:to-black/20" />

      <div className="relative grid gap-4 p-4 @xl:gap-5 @xl:p-6">
        <div className="flex flex-wrap items-stretch gap-3 @md:flex-nowrap @xl:gap-4">
          <div className={`${box} ${look.title ?? ""} flex min-w-0 flex-[1_1_100%] flex-col justify-center px-4 py-3 @md:flex-1 @xl:px-5`}>
            <h4 className={`${SIZES.name} leading-tight`}>{g.name}</h4>
            {/* A card of one release (PAL, NTSC-U) shows its region as a badge on the line under the name. */}
            <p className={`mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 tracking-wide ${SIZES.small}`}>
              <span className="opacity-80">{g.subtitle ?? `decompilation · ${g.year}${g.region && !release ? ` · ${g.region}` : ""}`}</span>
              {release && g.region && (
                <span className="rounded-full border border-(--bd) bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-[.15em] text-(--tx2) @xl:text-[11px]">
                  {REGION_NAME[g.region] ?? g.region}
                </span>
              )}
            </p>
          </div>
          {/* Beside the name from a medium width on (half cards too); on a phone, one row under it. */}
          <div className={`${box} flex flex-[1_1_100%] items-center justify-between gap-3 px-4 py-2.5 @md:flex-none @md:flex-col @md:items-end @md:justify-center @md:gap-0 @md:py-3 @md:text-right @xl:flex-[0_1_220px] @xl:px-5`}>
            <span className="text-[10px] uppercase tracking-[.2em] text-(--tx2) @xl:text-[11px]">Progress</span>
            {/* As wide as "100,00 %" whatever the figure, so the card keeps its layout and height as it grows. */}
            <b className={`${SIZES.pct} grid justify-items-end whitespace-nowrap font-[inherit] leading-tight tabular-nums`}>
              <span className="col-start-1 row-start-1">{p ? pct(value) : "Not started"}</span>
              <span aria-hidden className="invisible col-start-1 row-start-1">{pct(100)}</span>
            </b>
          </div>
        </div>

        <Bar value={value} name={g.name} look={look} />

        {/* Narrow card: repository, maintainers and size each on a line of their own, so every card
            reads the same whatever the names' lengths; wide card: one row. */}
        <div className={`flex min-w-0 flex-col items-start gap-2.5 text-(--tx) @xl:flex-row @xl:flex-wrap @xl:items-center @xl:gap-x-5 ${SIZES.small}`}>
          {g.repo && (
            <a href={`https://github.com/${g.repo}`} className={`${box} inline-flex min-h-10 min-w-0 max-w-full items-center gap-2.5 px-3.5 py-1.5 no-underline transition hover:brightness-125`}>
              <GithubIcon />
              <span className="truncate">{g.repo}</span>
            </a>
          )}
          <Maintainers users={g.maintainers} />
          {/* In the card's main text colour, softened: the second colour can vanish on its backdrop (Deadlocked's red). */}
          {p && <p title={exactLine(p)} className="opacity-80 @xl:ml-auto">{matchedLine(p)}</p>}
        </div>
        {g.phase === "research" && (
          <p className="-mt-1 flex flex-wrap items-center gap-2.5 text-[12px] text-(--tx)/80">
            <ResearchBadge className="border-(--bd) bg-(--box) text-(--tx)" />
            <span>{RESEARCH_TEXT}</span>
          </p>
        )}
      </div>
      {/* The frame, drawn over everything: the picture under it never shows past its line or its corners. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-white/10 transition-colors duration-500 group-hover/card:border-(--bd)/60" />
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
function Group({ title, text, platforms, dot, projects, progress }: {
  title: string;
  text: string;
  platforms: string;
  dot: string;
  projects: readonly Project[];
  progress: Partial<Record<ProjectId, ProjectProgress>>;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="flex items-center gap-2.5 font-orbitron text-lg font-bold tracking-wide text-hi sm:text-xl">
            <span aria-hidden className={`size-2.5 rounded-full ${dot}`} />
            {title}
          </h3>
          <p className="mt-1 text-sm text-dim">{text}</p>
        </div>
        <span className="rounded-full border border-hi/20 bg-hi/5 px-3 py-1 font-orbitron text-xs text-dim">{platforms}</span>
      </div>
      <div className="grid gap-4 sm:gap-5">
        {rows(projects).map((row) =>
          row.length === 1 ? (
            <Card key={row[0].id} project={row[0]} progress={progress[row[0].id]} />
          ) : (
            <div key={row[0].id} className="grid gap-4 sm:gap-5 md:grid-cols-2">
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
    <Section id="progress" title="Progress" sub="Every title gets its own menu. The percentage is the share of the game's code that compiles to exactly the retail bytes.">
      <div className="space-y-12">
        <Group
          title="Original Trilogy & Deadlocked"
          text="The four PlayStation 2 releases of the main series, from the 2002 debut to the combat arena of Deadlocked."
          platforms="PlayStation 2"
          dot="bg-brand"
          projects={mainline}
          progress={progress}
        />
        {spinoffs.length > 0 && (
          <Group
            title="Spin-offs & Handhelds"
            text="Handheld and spin-off entries in the Ratchet & Clank universe."
            platforms="PSP / PS2 / Mobile"
            dot="bg-gold"
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
