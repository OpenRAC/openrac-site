import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageTransition from "@/components/layout/PageTransition";
import DayCalendar from "@/components/news/DayCalendar";
import { ProjectCard } from "@/components/news/parts";
import { getNewsDay, getNewsIndex } from "@/lib/news";
import { formatDay, formatWeekName, isActive, isNewsDay, neighbours, weekOfDay } from "@/lib/news/logic";
import { newsAlternates } from "@/lib/news/metadata";

// Built ahead from the news/ folder. An address not in it reaches the page, which answers with our own 404.
export async function generateStaticParams() {
  return ((await getNewsIndex())?.days ?? []).map((day) => ({ day }));
}

export async function generateMetadata(props: PageProps<"/news/days/[day]">): Promise<Metadata> {
  const { day } = await props.params;
  if (!isNewsDay(day)) return { title: "News not found", robots: { index: false } };
  // Facts alone make a thin page: the weekly reports are what search engines are offered.
  return { title: `${formatDay(day)} · News`, description: `What landed across the OpenRAC projects on ${formatDay(day)}.`, robots: { index: false }, alternates: newsAlternates(`/news/days/${day}`) };
}

/** One day's facts from GitHub, with no report: those are written by the week. */
export default async function NewsDayPage(props: PageProps<"/news/days/[day]">) {
  const { day } = await props.params;
  if (!isNewsDay(day)) notFound();
  const index = await getNewsIndex();
  if (!index?.days.includes(day)) notFound();
  const { days, weeks } = index;
  const facts = await getNewsDay(day);
  if (!facts) throw new Error(`${day} could not be read`);

  const active = facts.projects.filter(isActive);
  const { older, newer } = neighbours(days, day);
  const week = weekOfDay(day);
  const hasWeek = weeks.some((w) => w.week === week);
  return (
    <PageTransition>
      <main className="mx-auto max-w-[1080px] px-4 pb-12 pt-8">
        <p className="mb-1 text-[14px]">{hasWeek && <Link href={`/news/${week}`} className="inline-flex min-h-11 items-center text-amber underline underline-offset-2">‹ {formatWeekName(week)}</Link>}</p>
        <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] leading-tight text-hi">{formatDay(day)}</h1>
        <p className="mt-1.5 text-soft">The day&apos;s facts from GitHub: {facts.totals.commits} commits landed, {facts.totals.pullRequestsMerged} pull requests merged, {facts.totals.contributors} contributors.</p>
        <div className="mt-6 grid items-start gap-8 min-[821px]:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-5">
            {active.length === 0 ? (
              <p className="text-soft">Nothing landed on the tracked projects this day.</p>
            ) : (
              <ul className="grid gap-3">
                {active.map((p) => (
                  <li key={p.repo}>
                    <ProjectCard project={p} href={`/news/days/${day}/${p.repo}`}>
                      <span className="text-[14px] text-soft">{p.commitCount} {p.commitCount === 1 ? "commit" : "commits"} · {p.merged.length} merged · {p.opened.length} opened</span>
                    </ProjectCard>
                  </li>
                ))}
              </ul>
            )}
            <nav aria-label="Other days" className="flex flex-wrap justify-between gap-2.5">
              {older ? <Link href={`/news/days/${older}`} rel="prev" className="btn">‹ {formatDay(older)}</Link> : <span />}
              {newer && <Link href={`/news/days/${newer}`} rel="next" className="btn">{formatDay(newer)} ›</Link>}
            </nav>
          </div>
          <aside className="min-[821px]:sticky min-[821px]:top-[66px]">
            <DayCalendar days={days} day={day} />
          </aside>
        </div>
      </main>
    </PageTransition>
  );
}
