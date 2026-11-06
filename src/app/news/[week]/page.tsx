import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageTransition from "@/components/layout/PageTransition";
import { accentStyle, gameOf, NoReport, ProjectCard, ReportSection, ReportText, Sources, WrittenBy } from "@/components/news/parts";
import Backdrop from "@/components/ui/Backdrop";
import { ldJson, newsWeekLd, siteUrl } from "@/lib/machine";
import { getNewsIndex, getNewsWeek } from "@/lib/news";
import { authorUrl, formatShortDay, formatWeekName, formatWeekRange, isActive, isNewsWeek, leadProject, neighbours, reportSources } from "@/lib/news/logic";
import { newsAlternates } from "@/lib/news/metadata";

// Built ahead from the news/ folder. An address not in it reaches the page, which answers with our own 404.
export async function generateStaticParams() {
  return ((await getNewsIndex())?.weeks ?? []).map((w) => ({ week: w.week }));
}

export async function generateMetadata(props: PageProps<"/news/[week]">): Promise<Metadata> {
  const { week } = await props.params;
  if (!isNewsWeek(week)) return { title: "News not found", robots: { index: false } };
  const data = await getNewsWeek(week);
  const url = `/news/${week}`;
  // Facts alone make a thin page: only weeks with a written report are offered to search engines.
  if (data?.report.status !== "ok") {
    const title = `${formatWeekName(week)} · News`;
    const description = `What happened across the OpenRAC projects in ${formatWeekName(week)}.`;
    return { title, description, robots: { index: false }, alternates: newsAlternates(url), openGraph: { title: `${title} · OpenRAC`, description, url, type: "website" }, twitter: { card: "summary_large_image", title: `${title} · OpenRAC`, description } };
  }
  const { title, description, author } = data.report.report;
  return {
    title,
    description,
    authors: [{ name: author, url: authorUrl(author) }],
    alternates: newsAlternates(url),
    openGraph: { title, description, url, type: "article", siteName: "OpenRAC", publishedTime: `${data.facts.end}T23:59:59Z`, authors: [authorUrl(author)], section: "News" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** One week: the conclusion first, then each project in the report's own order, with every claim linked. */
export default async function NewsWeekPage(props: PageProps<"/news/[week]">) {
  const { week } = await props.params;
  if (!isNewsWeek(week)) notFound();
  const index = await getNewsIndex();
  if (!index?.weeks.some((w) => w.week === week)) notFound();
  const data = await getNewsWeek(week);
  if (!data) throw new Error(`${week} could not be read`);

  const { facts, report: state } = data;
  const report = state.status === "ok" ? state.report : null;
  const known = facts.projects.map((p) => p.repo);
  const active = facts.projects.filter(isActive);
  // The report's order is the author's judgement of what matters most to players; projects it skips follow.
  const inReport = report ? Object.keys(report.projects) : [];
  const ordered = [...active].sort((a, b) => {
    const [x, y] = [inReport.indexOf(a.repo), inReport.indexOf(b.repo)];
    return (x < 0 ? inReport.length : x) - (y < 0 ? inReport.length : y);
  });
  const lead = leadProject(active);
  const game = gameOf(lead?.repo);
  const allWeeks = index.weeks.map((w) => w.week);
  const { older, newer } = neighbours(allWeeks, week);
  const { totals } = facts;
  return (
    <PageTransition>
      <main className="pb-12" style={accentStyle(lead?.repo)}>
        {report && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(newsWeekLd(siteUrl(), { ...report, end: facts.end })) }} />}
        <header className="relative isolate overflow-hidden border-b border-line">
          {game && <Backdrop src={game.image} fallback={game.fallbackImage} />}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/50" />
          <div className="relative mx-auto grid min-h-[clamp(260px,32vw,380px)] max-w-[820px] content-end gap-2.5 px-4 pb-7 pt-14">
            <p className="font-orbitron text-[12px] font-bold uppercase tracking-[.16em] text-(--tx)">
              {formatWeekName(week)} · <time dateTime={facts.end}>{formatWeekRange(facts.start, facts.end)}</time>
            </p>
            <h1 className="font-audiowide text-[clamp(26px,4.4vw,42px)] leading-[1.15] text-hi [overflow-wrap:anywhere]">{report ? report.headline.replace(/\.$/, "") : "What happened this week"}</h1>
            <p className="text-[14px] text-soft">
              {totals.commits.toLocaleString("en-GB")} commits landed · {totals.pullRequestsMerged.toLocaleString("en-GB")} pull requests merged · {totals.contributors.toLocaleString("en-GB")} contributors
            </p>
          </div>
        </header>

        <div className="mx-auto mt-7 grid max-w-[820px] gap-7 px-4">
          {report ? (
            <section aria-label="The week in brief" className="grid gap-3">
              <p className="text-[17px] leading-relaxed text-body [overflow-wrap:anywhere] sm:text-[18px]"><ReportText text={report.summary} known={known} /></p>
              <WrittenBy report={report} sources={reportSources(report, facts.projects).length} />
            </section>
          ) : (
            <NoReport state={state.status === "invalid" ? "invalid" : "none"} />
          )}

          <section aria-labelledby="projects" className="grid gap-5">
            <h2 id="projects" className="font-orbitron text-lg font-bold text-gold">{report ? "Project by project" : "Projects"}</h2>
            {ordered.length === 0 && <p className="text-soft">Nothing landed on the tracked projects this week.</p>}
            {ordered.map((p) => {
              const section = report?.projects[p.repo];
              return (
                <article key={p.repo} className="grid gap-3" style={accentStyle(p.repo)}>
                  <ProjectCard project={p} />
                  {section && <ReportSection section={section} known={known} repo={p.repo} />}
                  <p>
                    <Link href={`/news/${week}/${p.repo}`} className="inline-flex min-h-11 items-center text-[15px] text-amber underline underline-offset-2">
                      {section ? `Every change on ${p.title}` : `See what changed on ${p.title}`}: {p.merged.length} merged
                    </Link>
                  </p>
                </article>
              );
            })}
          </section>

          {report && <Sources report={report} projects={facts.projects} />}

          {facts.days.length > 0 && (
            <nav aria-label="This week's days" className="grid gap-2">
              <h2 className="font-orbitron text-[15px] font-bold text-gold">Day by day</h2>
              <ul className="flex flex-wrap gap-2">
                {facts.days.map((d) => (
                  <li key={d}><Link href={`/news/days/${d}`} className="btn btn-sm">{formatShortDay(d)}</Link></li>
                ))}
              </ul>
            </nav>
          )}

          <nav aria-label="Other weeks" className="flex flex-wrap justify-between gap-2.5">
            {older ? <Link href={`/news/${older}`} rel="prev" className="btn">‹ {formatWeekName(older)}</Link> : <span />}
            {newer && <Link href={`/news/${newer}`} rel="next" className="btn">{formatWeekName(newer)} ›</Link>}
          </nav>
        </div>
      </main>
    </PageTransition>
  );
}
