import type { Metadata } from "next";
import Link from "next/link";
import PageTransition from "@/components/layout/PageTransition";
import { Notice, ReportPoster } from "@/components/news/parts";
import SectionArt from "@/components/ui/SectionArt";
import { getNewsIndex, getNewsWeek } from "@/lib/news";
import { formatDay, formatWeekName, formatWeekRange, leadProject, NEWS_CONTRIBUTING } from "@/lib/news/logic";
import { newsAlternates } from "@/lib/news/metadata";

export const metadata: Metadata = {
  title: "News",
  description: "What happens across the OpenRAC projects, week by week, in reports written by named people.",
  alternates: newsAlternates("/news"),
};

const SHOWN_REPORTS = 13;

/** The written reports, newest first and largest; then the weeks still waiting for one, and today's facts. */
export default async function NewsPage() {
  const index = await getNewsIndex();
  const header = (
    <div className="mb-6 flex items-center gap-3 sm:gap-5">
      <SectionArt id="news" className="h-14 w-auto sm:h-16" />
      <div>
        <h1 className="font-audiowide text-[clamp(28px,4.4vw,42px)] leading-tight text-hi">News</h1>
        <p className="text-soft">What happens across the projects, week by week.</p>
      </div>
    </div>
  );
  if (!index) {
    return (
      <PageTransition>
        <main className="mx-auto max-w-[1080px] px-4 pb-12 pt-8">
          {header}
          <div className="grid gap-4">
            <Notice>There&apos;s no news here yet. Check back soon.</Notice>
          </div>
        </main>
      </PageTransition>
    );
  }
  const reportedWeeks = index.weeks.filter((w) => w.report).slice(0, SHOWN_REPORTS);
  const weeks = await Promise.all(reportedWeeks.map(async (entry) => ({ entry, data: await getNewsWeek(entry.week) })));
  const reports = weeks.flatMap(({ entry, data }) => (data?.report.status === "ok" ? [{ entry, report: data.report.report, lead: leadProject(data.facts.projects)?.repo }] : []));
  const [first, ...rest] = reports;
  const waiting = index.weeks.filter((w) => w.finished && !w.report);
  const newestDay = index.days[0];
  return (
    <PageTransition>
      <main className="mx-auto grid max-w-[1080px] gap-8 px-4 pb-12 pt-8">
        <div>
          {header}
          <div className="grid gap-4">
            {newestDay && <p className="text-[14px] text-dim">Updated weekly. Figures up to {formatDay(newestDay)}.</p>}
            {first ? <ReportPoster entry={first.entry} report={first.report} lead={first.lead} large /> : <p className="text-soft">No written reports yet. <a href={NEWS_CONTRIBUTING} className="text-amber underline underline-offset-2">Write the first one</a></p>}
          </div>
        </div>

        {rest.length > 0 && (
          <section aria-labelledby="earlier" className="grid gap-3">
            <h2 id="earlier" className="font-orbitron text-lg font-bold text-gold">Earlier reports</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {rest.map((r) => (
                <ReportPoster key={r.entry.week} entry={r.entry} report={r.report} lead={r.lead} heading="h3" />
              ))}
            </div>
          </section>
        )}

        <div className="grid items-start gap-5 sm:grid-cols-2">
          {newestDay && (
            <section aria-labelledby="facts" className="rounded-2xl border border-line bg-panel p-5">
              <h2 id="facts" className="mb-1 font-orbitron text-lg font-bold text-gold">Latest facts</h2>
              <p className="mb-3 text-soft">Collected from GitHub, day by day, before anyone writes them up.</p>
              <Link href={`/news/days/${newestDay}`} className="btn">{formatDay(newestDay)}</Link>
            </section>
          )}
          {waiting.length > 0 && (
            <section aria-labelledby="waiting" className="rounded-2xl border border-line bg-panel p-5">
              <h2 id="waiting" className="mb-1 font-orbitron text-lg font-bold text-gold">Waiting for a report</h2>
              <p className="mb-3 text-soft">People write these with their own AI tools. <a href={NEWS_CONTRIBUTING} className="text-amber underline underline-offset-2">Help write one</a></p>
              <ul className="grid gap-1">
                {waiting.slice(0, 5).map((w) => (
                  <li key={w.week}>
                    <Link href={`/news/${w.week}`} className="flex min-h-11 flex-wrap items-center gap-x-2 text-text underline underline-offset-2 hover:text-amber">
                      {formatWeekName(w.week)} <span className="text-[13px] text-dim">{formatWeekRange(w.start, w.end)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
