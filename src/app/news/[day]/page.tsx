import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageTransition from "@/components/layout/PageTransition";
import DayCalendar from "@/components/news/DayCalendar";
import { ProgressLine, projectStyle, ReportText, WrittenBy } from "@/components/news/parts";
import { ldJson, newsDayLd, siteUrl } from "@/lib/machine";
import { getNewsDay, getNewsDays } from "@/lib/news";
import { formatDay, isActive, isNewsDay, neighbours, NEWS_CONTRIBUTING } from "@/lib/news/logic";
import { newsAlternates } from "@/lib/news/metadata";

// A report can arrive any time after its day, so days are rebuilt in the background like the day list.
export const revalidate = 3600;

export async function generateStaticParams() {
  // An unreachable source gives no pages here, never a failed build: they render on demand instead.
  return ((await getNewsDays()) ?? []).slice(0, 30).map((d) => ({ day: d.date }));
}

export async function generateMetadata(props: PageProps<"/news/[day]">): Promise<Metadata> {
  const { day } = await props.params;
  if (!isNewsDay(day)) return { title: "News not found", robots: { index: false } };
  const data = await getNewsDay(day);
  const title = `${formatDay(day)} · News`;
  // Facts alone make a thin page: only days with a written report are offered to search engines.
  if (!data?.report) return { title, description: `What happened across the OpenRAC projects on ${formatDay(day)}.`, robots: { index: false }, alternates: newsAlternates(`/news/${day}`) };
  return {
    title,
    description: data.report.headline,
    alternates: newsAlternates(`/news/${day}`),
    openGraph: { title: data.report.headline, description: data.report.summary.slice(0, 200), url: `/news/${day}`, type: "article", publishedTime: `${day}T23:59:59Z` },
  };
}

const TOTALS = [
  ["commits", "Commits landed"],
  ["pullRequestsMerged", "Pull requests merged"],
  ["pullRequestsOpened", "Pull requests opened"],
  ["contributors", "Contributors"],
] as const;

/** One day across every project: the written report when there is one, and always the facts. */
export default async function NewsDayPage(props: PageProps<"/news/[day]">) {
  const { day } = await props.params;
  if (!isNewsDay(day)) notFound();
  const days = await getNewsDays();
  if (!days) throw new Error("The list of days could not be read");
  if (!days.some((d) => d.date === day)) notFound();
  const data = await getNewsDay(day);
  if (!data) throw new Error(`${day} could not be read`);

  const { facts, report } = data;
  const known = facts.projects.map((p) => p.repo);
  const active = facts.projects.filter(isActive);
  const { older, newer } = neighbours(days, day);

  return (
    <PageTransition>
      <main className="mx-auto max-w-[1080px] px-4 pb-12 pt-8">
        {report && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(newsDayLd(siteUrl(), report)) }} />}
        <p className="mb-2 font-orbitron text-[12px] font-bold uppercase tracking-[.2em] text-amber">
          <time dateTime={day}>{formatDay(day)}</time>
        </p>
        <h1 className="max-w-[820px] font-audiowide text-[clamp(26px,4vw,38px)] leading-tight text-hi">{report ? report.headline : "What happened this day"}</h1>
        <div className="mt-6 grid items-start gap-8 min-[821px]:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid min-w-0 gap-8">
            {report ? (
              <section aria-label="The day in brief">
                <p className="max-w-[720px] text-[16px] leading-relaxed text-body sm:text-[17px]"><ReportText text={report.summary} known={known} /></p>
                <WrittenBy report={report} />
              </section>
            ) : (
              <p className="max-w-[720px] rounded-xl border border-line bg-panel px-4 py-3 text-soft">
                No written report yet. These are the day&apos;s facts from GitHub.{" "}
                <a href={NEWS_CONTRIBUTING} className="text-amber underline underline-offset-2">Help write it</a>
              </p>
            )}

            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {TOTALS.map(([key, label]) => (
                <div key={key} className="rounded-xl border border-line bg-panel px-4 py-3">
                  <dd className="font-audiowide text-[24px] text-hi">{facts.totals[key].toLocaleString("en-GB")}</dd>
                  <dt className="text-[13px] leading-snug text-dim">{label}</dt>
                </div>
              ))}
            </dl>

            <section aria-labelledby="projects-heading">
              <h2 id="projects-heading" className="mb-3 font-orbitron text-lg font-bold text-gold">Projects</h2>
              {active.length === 0 ? (
                <p className="text-dim">Nothing landed on the tracked projects this day.</p>
              ) : (
                <ul className="grid gap-2.5">
                  {active.map((p) => {
                    const section = report?.projects[p.repo];
                    return (
                      <li key={p.repo}>
                        <Link href={`/news/${day}/${p.repo}`} className="grid gap-2.5 rounded-xl border border-line bg-panel px-4 py-3.5 no-underline transition-colors hover:border-amber">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-line px-2.5 py-1 font-orbitron text-[11px] font-semibold tracking-wider text-gold" style={projectStyle(p.repo)}>{p.title}</span>
                            <span className="text-[13px] text-dim">{p.commitCount} {p.commitCount === 1 ? "commit" : "commits"} · {p.merged.length} merged · {p.opened.length} opened</span>
                          </span>
                          {section && <span className="font-semibold text-hi">{section.headline}</span>}
                          {p.progress && <ProgressLine progress={p.progress} />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <nav aria-label="Other days" className="flex flex-wrap justify-between gap-2.5">
              {older ? <Link href={`/news/${older}`} rel="prev" className="btn">‹ {formatDay(older)}</Link> : <span />}
              {newer && <Link href={`/news/${newer}`} rel="next" className="btn">{formatDay(newer)} ›</Link>}
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
