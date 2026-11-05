import Image from "next/image";
import type { CSSProperties } from "react";
import { formatSize } from "@/lib/format";
import { getGithubAvatar } from "@/lib/github";
import { PROJECTS, type Project, type ProjectId } from "@/lib/projects";
import { percent } from "@/lib/progress/types";
import type { ProjectProgress } from "@/lib/progress";
import Backdrop from "@/components/ui/Backdrop";
import { GithubIcon } from "@/components/ui/icons";
import Section from "./HomeSection";
import styles from "./Home.module.css";

/** Two decimals, like ByteMatch. */
const pct = (p: number) => `${p.toFixed(2).replace(".", ",")} %`;

/** The line under every bar: the same measure as the percentage, in KB or MB as fits the game. */
const matchedLine = (p: ProjectProgress) =>
  `${formatSize(p.code.done)} of ${formatSize(p.code.total)} code matched${p.stale ? " · snapshot, live numbers unavailable" : ""}`;

/** The exact figures, shown on hover. */
const exactLine = (p: ProjectProgress) =>
  `${p.code.done.toLocaleString("en-US")} of ${p.code.total.toLocaleString("en-US")} bytes`;

/** The data counter's hover text: its size and exact bytes, or why there is no figure. */
const dataTitle = (p?: ProjectProgress) =>
  p?.data
    ? `${formatSize(p.data.done)} of ${formatSize(p.data.total)} data matched (${p.data.done.toLocaleString("en-US")} of ${p.data.total.toLocaleString("en-US")} bytes)`
    : "This project's report does not measure data yet";

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

/** How colourful a hex colour is: its strongest channel minus its weakest, 0 for a grey. */
const chroma = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(...c) - Math.min(...c);
};

/** A title's accent: its text colour, or its second one where the text is near white (Deadlocked, Size Matters, Secret Agent Clank), so every card keeps a colour of its own. */
const accent = (t: Project["theme"]) => (chroma(t.text) < 40 ? t.text2 : t.text);

/**
 * A thin bar in the title's own accent, the one colour on the card. The data bar under the code bar is
 * thinner and a fainter shade of the same accent; without a data measure only its track is drawn.
 */
function Bar({ value, name, data = false }: { value: number | null; name: string; data?: boolean }) {
  return (
    <div
      role="progressbar"
      aria-label={`${name} ${data ? "data" : "code"} matched${value == null ? ", not measured" : ""}`}
      aria-valuenow={value == null ? undefined : Math.round(value * 10) / 10}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`${data ? "h-1" : "h-1.5"} overflow-hidden rounded-full bg-white/10`}
    >
      {value != null && (
        <i style={{ "--w": `${value}%` } as CSSProperties} className={`bar-fill block h-full rounded-full ${data ? "bg-(--tx)/45" : "bg-(--tx)"}`} />
      )}
    </div>
  );
}

/** The region as people say it: the badge on a game with a card per release. */
const REGION_NAME: Record<string, string> = { PAL: "PAL · Europe", "NTSC-U": "NTSC-U · USA" };

/** One release per card; code and data remain separate measures. */
function Card({ project: g, progress: p, release = false }: { project: Project; progress?: ProjectProgress; release?: boolean }) {
  const value = p ? percent(p.code) : 0;
  const dataValue = p?.data ? percent(p.data) : null;

  return (
    <section
      aria-label={`${g.name}${g.region ? ` (${g.region})` : ""}${g.phase === "research" ? ", research phase" : ""} progress`}
      style={{ "--tx": accent(g.theme) } as CSSProperties}
      data-reveal
      className={`group/card ${styles.projectCard} ${release ? styles.releaseCard : ""}`}
    >
      <div className={styles.projectBanner}>
        <Backdrop src={g.image} fallback={g.fallbackImage} zoom="group-hover/card:[--zoom:1.035]" className="[clip-path:inset(0_round_11px_11px_0_0)]" />
        <div aria-hidden className={styles.bannerShade} />
        <div className={styles.bannerTop}>
          <span className={styles.gameTag}>{g.tag}</span>
          {g.region && <span className={styles.region}>{release ? REGION_NAME[g.region] ?? g.region : g.region}</span>}
        </div>
        <div className={styles.bannerTitle}>
          <h4 className={g.fontClass}>{g.name}</h4>
          <p>{g.subtitle ?? `decompilation · ${g.year}`}</p>
        </div>
      </div>
      <div className={styles.projectBody}>
        <div className={styles.metrics}>
          <div className={styles.codeMetric}><span>Code matched</span><strong className={p ? undefined : styles.notStarted}>{p ? pct(value) : "Not started"}</strong></div>
          <div className={styles.dataMetric} title={dataTitle(p)}><span>Data matched</span><b>{dataValue == null ? "–" : pct(dataValue)}</b></div>
        </div>
        <div className={styles.bars}>
          <Bar value={value} name={g.name} />
          <Bar value={dataValue} name={g.name} data />
        </div>
        <div className={styles.projectMeta}>
          {g.repo && <a href={`https://github.com/${g.repo}`} className={styles.repoLink}><GithubIcon /><span>{g.repo}</span><i aria-hidden>↗</i></a>}
          <Maintainers users={g.maintainers} className={styles.maintainers} />
          {p && <p title={exactLine(p)} className={styles.matchedBytes}>{matchedLine(p)}</p>}
        </div>
        {g.phase === "research" && <div className={styles.research}><ResearchBadge className="w-fit border-white/15 text-text" /><p>{RESEARCH_TEXT}</p></div>}
      </div>
    </section>
  );
}

function Group({ title, text, platforms, projects, progress }: {
  title: string; text: string; platforms: string; projects: readonly Project[];
  progress: Partial<Record<ProjectId, ProjectProgress>>;
}) {
  return (
    <div>
      <div className={styles.groupHeading}>
        <div><h3>{title}</h3><p>{text}</p></div>
        <span className={styles.platformTag}>{platforms}</span>
      </div>
      <div className={styles.projectGrid}>
        {projects.map(g => <Card key={g.id} project={g} progress={progress[g.id]} release={projects.filter(p => p.name === g.name).length > 1} />)}
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
      <div className={styles.projectGroups}>
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
      <p className={styles.methodNote}>
        The figure is matched code, weighted by size, the same number ByteMatch shows; the data figure and the fainter bar under it are the share
        of the game&apos;s data that matches, where the project&apos;s report measures it. Each title links to its own community repository, and a title
        without a link has not been started. Numbers are read from the repositories on the server and refreshed every ten minutes. Roadmap entries are
        not a promise.
      </p>
    </Section>
  );
}
