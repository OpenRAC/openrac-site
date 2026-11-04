import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageTransition from "@/components/layout/PageTransition";
import { accentStyle, githubLink, ProjectCard, ReportSection, WrittenBy } from "@/components/news/parts";
import ProjectFacts from "@/components/news/ProjectFacts";
import { getNewsIndex, getNewsWeek } from "@/lib/news";
import { formatWeekName, isActive, isNewsWeek } from "@/lib/news/logic";
import { newsAlternates } from "@/lib/news/metadata";

// Built ahead from the news/ folder. An address not in it reaches the page, which answers with our own 404.
export async function generateStaticParams() {
  const weeks = await Promise.all(((await getNewsIndex())?.weeks ?? []).map((w) => getNewsWeek(w.week)));
  return weeks.flatMap((w) => (w ? w.facts.projects.map((p) => ({ week: w.facts.week, repo: p.repo })) : []));
}

export async function generateMetadata(props: PageProps<"/news/[week]/[repo]">): Promise<Metadata> {
  const { week, repo } = await props.params;
  const project = isNewsWeek(week) ? (await getNewsWeek(week))?.facts.projects.find((p) => p.repo === repo) : undefined;
  // Kept out of search: the week's page is the one to find, and these repeat it project by project.
  if (!project) return { title: "News not found", robots: { index: false } };
  return { title: `${project.title}, ${formatWeekName(week)} · News`, description: `What changed on ${project.title} in ${formatWeekName(week)}.`, robots: { index: false }, alternates: newsAlternates(`/news/${week}/${repo}`) };
}

/** One project over one week: its part of the report, then everything GitHub recorded. */
export default async function NewsWeekProjectPage(props: PageProps<"/news/[week]/[repo]">) {
  const { week, repo } = await props.params;
  if (!isNewsWeek(week)) notFound();
  if (!(await getNewsIndex())?.weeks.some((w) => w.week === week)) notFound();
  const data = await getNewsWeek(week);
  if (!data) throw new Error(`${week} could not be read`);
  const project = data.facts.projects.find((p) => p.repo === repo);
  if (!project) notFound();

  const known = data.facts.projects.map((p) => p.repo);
  const report = data.report.status === "ok" ? data.report.report : null;
  const section = report?.projects[repo];
  const others = data.facts.projects.filter((p) => isActive(p) && p.repo !== repo);
  return (
    <PageTransition>
      <main className="mx-auto grid max-w-[820px] gap-6 px-4 pb-12 pt-8" style={accentStyle(repo)}>
        <p className="text-[14px]">
          <Link href={`/news/${week}`} className="inline-flex min-h-11 items-center text-amber underline underline-offset-2">‹ {formatWeekName(week)}</Link>
        </p>
        <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] leading-tight text-hi">{project.title}</h1>
        <ProjectCard project={project} />
        {section && report && (
          <section aria-label="This project's report" className="grid gap-3">
            <ReportSection section={section} known={known} repo={repo} />
            <WrittenBy report={report} />
          </section>
        )}
        <ProjectFacts project={project} period="week" />
        {!isActive(project) && <p className="text-soft">Nothing landed on this project this week.</p>}
        <p className="text-[14px]">{githubLink(repo)}</p>
        {others.length > 0 && (
          <nav aria-label="Other projects this week" className="flex flex-wrap gap-2">
            {others.map((p) => (
              <Link key={p.repo} href={`/news/${week}/${p.repo}`} className="btn btn-sm">{p.title}</Link>
            ))}
          </nav>
        )}
      </main>
    </PageTransition>
  );
}
