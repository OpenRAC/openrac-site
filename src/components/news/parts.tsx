import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import Backdrop from "@/components/ui/Backdrop";
import { authorUrl, daysBehind, formatPercent, formatWeekName, formatWeekRange, NEWS_CONTRIBUTING, NEWS_ISSUES, newsPercent, plainTitle, progressChange, progressGain, reportSources, segments, splitLabel } from "@/lib/news/logic";
import type { NewsItem, NewsMedia, NewsProgress, NewsProject, NewsRatio, NewsReport, NewsReportSection, NewsWeekEntry } from "@/lib/news/types";
import { type Project, PROJECTS, type ProjectId } from "@/lib/projects";

/** Which game a tracked repository is. The launcher and mods have no game card, so they keep the site's gold. */
const GAME: Record<string, ProjectId> = { "rac1-decomp": "rac1", "rac2-decomp": "gc", "rac3-decomp": "uya", "rac4-decomp": "deadlocked" };

export const gameOf = (repo?: string): Project | undefined => (repo ? PROJECTS.find((p) => p.id === GAME[repo]) : undefined);

/** A game's accent for `--tx`, as on the Progress cards; the site's gold for the rest. */
export const accentStyle = (repo?: string) => ({ "--tx": gameOf(repo)?.theme.text2 ?? "var(--color-amber)" }) as CSSProperties;

export const LINK = "text-amber underline underline-offset-2";

/** The way to a project's own repository. */
export const githubLink = (repo: string) => (
  <a href={`https://github.com/OpenRAC/${repo}`} className="text-soft underline underline-offset-2 hover:text-amber">
    {repo} on GitHub
  </a>
);
const QUIET_LINK = "text-soft underline underline-offset-2 hover:text-amber";

/** Report text: plain words with citations as links. Never HTML, whatever the file says. */
export function ReportText({ text, known, owner }: { text: string; known: readonly string[]; owner?: string }) {
  return segments(text, known, owner).map((part, i) =>
    typeof part === "string" ? (
      part
    ) : (
      <a key={i} href={part.href} className={LINK}>
        {part.label}
      </a>
    ),
  );
}

/** A highlight, with its opening "Label:" standing out so the list can be scanned. */
export function Highlight({ line, known, owner }: { line: string; known: readonly string[]; owner: string }) {
  const { label, rest } = splitLabel(line);
  return (
    <li>
      {label && <strong className="font-semibold text-hi">{label}: </strong>}
      <ReportText text={rest} known={known} owner={owner} />
    </li>
  );
}

/** Who answers for a report, how it was made, and how much of it can be checked. Shown wherever report text is. */
export function WrittenBy({ report, sources }: { report: NewsReport; sources?: number }) {
  return (
    <p className="text-[13px] leading-relaxed text-dim [overflow-wrap:anywhere]">
      Written by{" "}
      <a href={authorUrl(report.author)} rel="nofollow ugc noopener noreferrer" className={QUIET_LINK}>
        @{report.author}
      </a>{" "}
      with {report.tool}.{sources ? ` Based on ${sources} linked ${sources === 1 ? "pull request or issue" : "pull requests and issues"}.` : ""}{" "}
      <a href={NEWS_ISSUES} className={QUIET_LINK}>
        Report a mistake
      </a>
    </p>
  );
}

/** The list a reader can check a report against, with each item's real title. */
export function Sources({ report, projects }: { report: NewsReport; projects: readonly NewsProject[] }) {
  const sources = reportSources(report, projects);
  if (!sources.length) return null;
  return (
    <details open className="rounded-2xl border border-line bg-panel px-5">
      <summary className="flex min-h-12 cursor-pointer items-center font-orbitron text-[13px] font-bold text-gold">Sources ({sources.length})</summary>
      <ul className="grid gap-1.5 pb-4 text-[14px] leading-snug">
        {sources.map((s) => (
          <li key={`${s.repo}#${s.number}`} className="min-w-0 text-soft [overflow-wrap:anywhere]">
            <a href={s.href} className={`${LINK} whitespace-nowrap`}>
              {s.repo}#{s.number}
            </a>{" "}
            {s.title}
          </li>
        ))}
      </ul>
    </details>
  );
}

/**
 * Progress as a bar: the earlier figure in a dim accent and the gain on top of it in the full one, at
 * least 2 px so a small real gain can be seen. It shows only what the project's report says.
 */
export function ProgressBar({ progress }: { progress: NonNullable<NewsProgress> }) {
  const after = progress.after.code as NewsRatio;
  const before = progressGain(progress) ? (progress.before?.code as NewsRatio) : undefined;
  const change = progressChange(progress);
  const width = before ? `max(${newsPercent(after)}%, calc(${newsPercent(before)}% + 2px))` : `${newsPercent(after)}%`;
  return (
    <div
      role="img"
      aria-label={before ? `Code matched rose from ${formatPercent(before)} to ${formatPercent(after)}` : `${formatPercent(after)} of code matched`}
      className="relative h-2.5 overflow-hidden rounded-full bg-white/10"
    >
      <i style={{ "--w": width } as CSSProperties} className="bar-fill absolute inset-y-0 left-0 block rounded-full bg-(--tx)" />
      {before && change && <i style={{ "--w": `${newsPercent(before)}%` } as CSSProperties} className="bar-fill absolute inset-y-0 left-0 block rounded-full bg-(--tx) brightness-50" />}
    </div>
  );
}

/** The figures beside a bar. */
export function ProgressFigures({ progress }: { progress: NonNullable<NewsProgress> }) {
  const after = progress.after.code as NewsRatio;
  const functions = progress.after.functions;
  const change = progressChange(progress);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2.5 text-[14px]">
      <span className="font-semibold text-hi">{formatPercent(after)} matched</span>
      {change && <span className="font-semibold text-(--tx)">{change} points</span>}
      {functions && (
        <span className="text-soft">
          {functions.done.toLocaleString("en-GB")} of {functions.total.toLocaleString("en-GB")} functions
        </span>
      )}
    </p>
  );
}

/** A project's card: its game's backdrop and typeface where it has them, as on the home page's Progress cards. */
export function ProjectCard({ project, children, href }: { project: NewsProject; children?: ReactNode; href?: string }) {
  const game = gameOf(project.repo);
  const inner = (
    <>
      {game && <Backdrop src={game.image} fallback={game.fallbackImage} className="rounded-[inherit] [clip-path:inset(0_round_1rem)]" />}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/85 to-ink/70" />
      <div className="relative grid gap-3 p-5">
        <h3 className={`text-[20px] leading-tight text-hi sm:text-[22px] ${game?.fontClass ?? "font-orbitron font-semibold"}`}>{project.title}</h3>
        {project.progress && (
          <div className="grid gap-2">
            <ProgressFigures progress={project.progress} />
            <ProgressBar progress={project.progress} />
          </div>
        )}
        {children}
      </div>
    </>
  );
  const box = "relative isolate block overflow-hidden rounded-2xl border border-line bg-ink";
  return href ? (
    <Link href={href} data-reveal style={accentStyle(project.repo)} className={`${box} no-underline transition-colors hover:border-(--tx)`}>
      {inner}
    </Link>
  ) : (
    <div data-reveal style={accentStyle(project.repo)} className={box}>
      {inner}
    </div>
  );
}

/** One project's part of a report, in reading order: conclusion, then the labelled lines. */
export function ReportSection({ section, known, repo }: { section: NewsReportSection; known: readonly string[]; repo: string }) {
  return (
    <div className="grid gap-2.5">
      <h4 className="text-[17px] font-semibold leading-snug text-hi [overflow-wrap:anywhere]">{section.headline}</h4>
      <p className="leading-relaxed text-body [overflow-wrap:anywhere]">
        <ReportText text={section.summary} known={known} owner={repo} />
      </p>
      {section.highlights.length > 0 && (
        <ul className="grid list-disc gap-1.5 pl-5 leading-relaxed text-body [overflow-wrap:anywhere] marker:text-(--tx)">
          {section.highlights.map((line, i) => (
            <Highlight key={i} line={line} known={known} owner={repo} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Screenshots. Each opens full size. If one cannot load, its alt text and caption still say what it showed. */
export function Gallery({ week, media }: { week: string; media: readonly NewsMedia[] }) {
  if (!media.length) return null;
  return (
    <div className={`grid gap-3 ${media.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {media.map((m) => {
        const src = `/news/media/${week}/${m.file}`;
        return (
          <figure key={m.file} className="m-0 grid gap-1.5">
            <a href={src} className="block overflow-hidden rounded-xl border border-line bg-panel text-soft">
              {/* eslint-disable-next-line @next/next/no-img-element -- served by our own route, already sized by its author */}
              <img src={src} alt={m.alt} loading="lazy" className="block min-h-16 w-full p-0 text-[14px]" />
            </a>
            {m.caption && <figcaption className="text-[13px] text-dim [overflow-wrap:anywhere]">{m.caption}</figcaption>}
          </figure>
        );
      })}
    </div>
  );
}

/** A plain line about what the page can and cannot show. Says what happened and what still works; never alarms. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-xl border border-line border-l-4 border-l-amber bg-panel px-4 py-3 text-[15px] text-soft">
      {children}
    </p>
  );
}

/** Says when figures may be old: this server's last copy, or a source that has stopped updating. */
export function Freshness({ stale, newest, now }: { stale: boolean; newest?: string; now: number }) {
  if (stale) return <Notice>These figures may be out of date. We couldn&apos;t reach the news source just now, so this is the last copy we have.</Notice>;
  if (daysBehind(newest, now) > 3) return <Notice>New daily figures are running late. The newest we have are from {newest}.</Notice>;
  return null;
}

export function NoReport({ state }: { state: "none" | "unavailable" | "invalid" }) {
  if (state === "unavailable") return <Notice>The written report couldn&apos;t be loaded just now. These are the week&apos;s facts from GitHub. Try again in a little while.</Notice>;
  if (state === "invalid")
    return (
      <Notice>
        This week&apos;s report has a problem and can&apos;t be shown yet, so here are the week&apos;s facts from GitHub. <a href={NEWS_ISSUES} className={LINK}>Let us know</a>
      </Notice>
    );
  return (
    <Notice>
      No written report for this week yet. These are the facts from GitHub. <a href={NEWS_CONTRIBUTING} className={LINK}>Help write it</a>
    </Notice>
  );
}

/** A report as a poster: its lead game's art, with the headline over it. On the news page and the home page. */
export function ReportPoster({ entry, report, lead, large = false, heading: Heading = "h2" }: { entry: Pick<NewsWeekEntry, "week" | "start" | "end">; report: NewsReport; lead?: string; large?: boolean; heading?: "h2" | "h3" }) {
  const game = gameOf(lead);
  const picture = report.media[0];
  return (
    <article data-reveal style={accentStyle(lead)} className={`group/poster relative isolate flex overflow-hidden rounded-2xl border border-line bg-ink transition-colors hover:border-(--tx) ${large ? "min-h-[340px]" : "min-h-[240px]"}`}>
      {picture ? (
        // eslint-disable-next-line @next/next/no-img-element -- decoration here: the report page shows it with its description
        <img src={`/news/media/${entry.week}/${picture.file}`} alt="" loading="lazy" className="absolute inset-0 -z-10 size-full object-cover" />
      ) : (
        game && <Backdrop src={game.image} fallback={game.fallbackImage} zoom="group-hover/poster:[--zoom:1.04]" className="rounded-[inherit] [clip-path:inset(0_round_1rem)]" />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/40" />
      <div className="relative mt-auto grid w-full min-w-0 gap-2 p-5 [overflow-wrap:anywhere] sm:p-6">
        <p className="font-orbitron text-[12px] font-bold uppercase tracking-[.16em] text-(--tx)">
          {formatWeekName(entry.week)} · <time dateTime={entry.end}>{formatWeekRange(entry.start, entry.end)}</time>
        </p>
        <Heading className={`leading-tight text-hi [overflow-wrap:anywhere] ${large ? "font-audiowide text-[clamp(24px,3.6vw,36px)]" : "text-[19px] font-semibold"}`}>
          {/* The whole poster is the link, one stop for keyboards. */}
          <Link href={`/news/${entry.week}`} className="text-inherit no-underline after:absolute after:inset-0 after:content-['']">
            {report.headline}
          </Link>
        </Heading>
        <p className="text-[13px] text-soft">
          By @{report.author} with {report.tool}
        </p>
      </div>
    </article>
  );
}

const SHOWN = 5;

function Row({ repo, item }: { repo: string; item: NewsItem }) {
  return (
    <li className="flex min-h-11 min-w-0 flex-wrap items-baseline gap-x-2.5 border-b border-line py-2.5 last:border-0">
      <a href={`https://github.com/OpenRAC/${repo}/issues/${item.number}`} className={`${LINK} inline-flex min-h-6 min-w-6 flex-none items-center font-semibold no-underline hover:underline`}>
        #{item.number}
      </a>
      <span className="min-w-0 text-text [overflow-wrap:anywhere]">{plainTitle(item.title)}</span>
      {item.author && <span className="text-[13px] text-dim">{item.author}</span>}
    </li>
  );
}

/** A list that shows its first few and folds the rest away: a busy project can have over a hundred. No script. */
export function ItemList({ repo, items }: { repo: string; items: readonly NewsItem[] }) {
  return (
    <>
      <ul>
        {items.slice(0, SHOWN).map((item) => (
          <Row key={item.number} repo={repo} item={item} />
        ))}
      </ul>
      {items.length > SHOWN && (
        <details className="group/more">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-amber group-open/more:hidden">Show all {items.length}</summary>
          <ul>
            {items.slice(SHOWN).map((item) => (
              <Row key={item.number} repo={repo} item={item} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 font-orbitron text-[17px] font-bold text-gold">{title}</h2>
      {children}
    </section>
  );
}
