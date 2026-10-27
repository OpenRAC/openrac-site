import Image from "next/image";
import type { CSSProperties } from "react";
import { getGithubAvatar } from "@/lib/github";
import { PROJECTS, type Project, type ProjectId } from "@/lib/projects";
import { percent } from "@/lib/types";
import type { ProjectProgress } from "@/lib/progress";
import Backdrop from "./Backdrop";
import Section from "./Section";

/** Two decimals, like ByteMatch. */
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

const GITHUB = (
  <svg viewBox="0 0 16 16" aria-hidden="true" className="size-5 flex-none fill-current">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

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
  /** Type sizes for the name and the percentage, for a typeface wider than the rest. */
  sizes?: { name: string; pct: string; small: string };
}

const SIZES = { name: "text-[clamp(20px,3.2vw,30px)]", pct: "text-[clamp(20px,3.4vw,32px)]", small: "text-[11px] sm:text-[13px]" };

const BEVEL = "[clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)]";

const LOOKS: Partial<Record<ProjectId, Look>> = {
  deadlocked: {
    box: "rounded-md border border-white/15",
    title: "border-[#ff6b6b]/50! bg-gradient-to-r from-[#991b1b] via-[#dc2626] to-[#991b1b] text-white uppercase tracking-wider",
    fill: "from-[#991b1b] via-[#dc2626] to-[#f87171]",
  },
  gm: {
    box: "rounded-xl border-[3px] border-(--bd)",
    segments: true,
    sizes: { name: "text-[clamp(14px,2.4vw,24px)]", pct: "text-[clamp(14px,2.2vw,22px)]", small: "text-[8px] leading-relaxed sm:text-[10px]" },
  },
  sm: { box: `${BEVEL} border-2 border-(--bd)`, title: "uppercase tracking-wider", fill: "from-[#ca8a04] via-[#eab308] to-[#fde047]" },
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

/**
 * One title, in the colours, typeface and box shapes of its own menus, over its backdrop. All
 * cards share one layout (name and percentage, the bar, then the repository, the maintainers and
 * the bytes), so they read alike and only their accents differ. Rendered on the server.
 */
function Card({ project: g, progress: p }: { project: Project; progress?: ProjectProgress }) {
  const t = g.theme;
  const look = LOOKS[g.id] ?? DEFAULT_LOOK;
  const value = p ? percent(p.code) : 0;
  const style = {
    "--box": t.box, "--bd": t.border, "--tx": t.text, "--tx2": t.text2,
    backgroundImage: `radial-gradient(90% 90% at 85% 0, ${t.from}, transparent 70%), linear-gradient(160deg, ${t.from}, ${t.to})`,
  } as CSSProperties;
  const size = look.sizes ?? SIZES;
  const box = `${look.box} bg-(--box) text-(--tx) shadow-[0_6px_18px_rgb(0_0_0/0.35)]`;

  return (
    <section
      aria-label={`${g.name}${g.region ? ` (${g.region})` : ""}${g.phase === "research" ? ", research phase" : ""} progress`}
      style={style}
      data-reveal
      className={`relative isolate overflow-hidden rounded-[22px] border border-white/10 bg-ink shadow-[0_14px_40px_rgb(0_0_0/0.4)] ${g.fontClass}`}
    >
      <Backdrop src={g.image} quality={g.id === "rac1" || g.id === "gc" || g.id === "uya" ? 70 : 75} />
      {/* Darker where the text sits, so every backdrop reads the same. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20 max-sm:bg-none max-sm:bg-black/40" />

      <div className="relative grid gap-4 p-4 sm:gap-5 sm:p-6">
        <div className="flex flex-wrap items-stretch gap-3 sm:flex-nowrap sm:gap-4">
          <div className={`${box} ${look.title ?? ""} min-w-0 flex-[1_1_100%] px-4 py-3 sm:flex-1 sm:px-5`}>
            <h3 className={`${size.name} leading-tight`}>{g.name}</h3>
            <p className={`mt-1 tracking-wide opacity-80 ${size.small}`}>
              {g.subtitle ?? `decompilation · ${g.year}${g.region ? ` · ${g.region}` : ""}`}
            </p>
          </div>
          {/* On a phone a single row (label, figure) under the name; beside it on wider screens. */}
          <div className={`${box} flex flex-[1_1_100%] items-center justify-between gap-3 px-4 py-2.5 sm:flex-[0_1_220px] sm:flex-col sm:items-end sm:justify-center sm:gap-0 sm:px-5 sm:py-3 sm:text-right`}>
            <span className="text-[10px] uppercase tracking-[.2em] text-(--tx2) sm:text-[11px]">Progress</span>
            <b className={`${size.pct} whitespace-nowrap font-[inherit] leading-tight tabular-nums`}>{p ? pct(value) : "Not started"}</b>
          </div>
        </div>

        <Bar value={value} name={g.name} look={look} />

        <div className={`flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2.5 text-(--tx) ${look.sizes ? look.sizes.small : "text-[12px] sm:text-[13px]"}`}>
          {g.repo && (
            <a href={`https://github.com/${g.repo}`} className={`${box} inline-flex min-h-10 min-w-0 max-w-full items-center gap-2.5 px-3.5 py-1.5 no-underline transition hover:brightness-125`}>
              {GITHUB}
              <span className="truncate">{g.repo}</span>
            </a>
          )}
          <Maintainers users={g.maintainers} />
          {p && <p className="text-(--tx2) sm:ml-auto">{matchedLine(p)}</p>}
        </div>
        {g.phase === "research" && (
          <p className="-mt-1 flex flex-wrap items-center gap-2.5 text-[12px] text-(--tx2)">
            <ResearchBadge className="border-(--bd) bg-(--box) text-(--tx)" />
            <span>{RESEARCH_TEXT}</span>
          </p>
        )}
      </div>
    </section>
  );
}

/** A group of cards under its own heading and platform tag. */
function Group({ title, text, platforms, dot, tag, projects, progress }: {
  title: string;
  text: string;
  platforms: string;
  dot: string;
  tag: string;
  projects: readonly Project[];
  progress: Partial<Record<ProjectId, ProjectProgress>>;
}) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="flex items-center gap-2.5 font-orbitron text-lg font-bold tracking-wide text-lav sm:text-xl">
            <span aria-hidden className={`size-2.5 rounded-full ${dot}`} />
            {title}
          </h3>
          <p className="mt-1 text-sm text-dim">{text}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 font-orbitron text-xs ${tag}`}>{platforms}</span>
      </div>
      <div className="grid gap-4 sm:gap-5">
        {projects.map((g) => (
          <Card key={g.id} project={g} progress={progress[g.id]} />
        ))}
      </div>
    </div>
  );
}

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
          tag="border-lav/20 bg-lav/5 text-dim"
          projects={mainline}
          progress={progress}
        />
        {spinoffs.length > 0 && (
          <Group
            title="Spin-offs & Handhelds"
            text="Handheld and spin-off entries in the Ratchet & Clank universe."
            platforms="PSP / PS2 / Mobile"
            dot="bg-[#00b4d8]"
            tag="border-[#00b4d8]/40 bg-[#00b4d8]/10 text-[#7dd3fc]"
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
