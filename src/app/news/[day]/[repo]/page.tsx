import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import PageTransition from "@/components/layout/PageTransition";
import { ProgressLine, ReportText, WrittenBy } from "@/components/news/parts";
import { getNewsDay, getNewsDays } from "@/lib/news";
import { commitUrl, formatDay, githubUrl, isActive, isNewsDay, itemUrl, releaseUrl } from "@/lib/news/logic";
import { newsAlternates } from "@/lib/news/metadata";
import type { NewsItem } from "@/lib/news/types";

export const revalidate = 3600;

export async function generateMetadata(props: PageProps<"/news/[day]/[repo]">): Promise<Metadata> {
  const { day, repo } = await props.params;
  const project = isNewsDay(day) ? (await getNewsDay(day))?.facts.projects.find((p) => p.repo === repo) : undefined;
  // Kept out of search: the day's page is the one to find, and these repeat it project by project.
  if (!project) return { title: "News not found", robots: { index: false } };
  return { title: `${project.title}, ${formatDay(day)} · News`, description: `What happened on ${project.title} on ${formatDay(day)}.`, robots: { index: false }, alternates: newsAlternates(`/news/${day}/${repo}`) };
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 font-orbitron text-lg font-bold text-gold">{title}</h2>
      {children}
    </section>
  );
}

const ROW = "flex min-h-11 min-w-0 flex-wrap items-baseline gap-x-2.5 border-b border-line py-2.5 last:border-0";

function Items({ repo, items }: { repo: string; items: NewsItem[] }) {
  return (
    <ul>
      {items.map((x) => (
        <li key={x.number} className={ROW}>
          <a href={itemUrl(repo, x.number)} className="flex-none font-semibold text-amber no-underline hover:underline">#{x.number}</a>
          <span className="min-w-0 break-words text-text">{x.title}</span>
          {x.author && <span className="text-[13px] text-dim">{x.author}</span>}
        </li>
      ))}
    </ul>
  );
}

/** One project on one day: its part of the report, then everything GitHub recorded. All text here is shown as text. */
export default async function NewsProjectPage(props: PageProps<"/news/[day]/[repo]">) {
  const { day, repo } = await props.params;
  if (!isNewsDay(day)) notFound();
  const days = await getNewsDays();
  if (!days) throw new Error("The list of days could not be read");
  if (!days.some((d) => d.date === day)) notFound();
  const data = await getNewsDay(day);
  if (!data) throw new Error(`${day} could not be read`);
  const project = data.facts.projects.find((p) => p.repo === repo);
  if (!project) notFound();

  const known = data.facts.projects.map((p) => p.repo);
  const section = data.report?.projects[repo];
  const others = data.facts.projects.filter((p) => isActive(p) && p.repo !== repo);
  const hasCommits = project.branches.some((b) => b.commits.length > 0);

  return (
    <PageTransition>
      <main className="mx-auto max-w-[820px] px-4 pb-12 pt-8">
        <p className="mb-2 text-[14px]">
          <Link href={`/news/${day}`} className="text-amber no-underline hover:underline">‹ {formatDay(day)}</Link>
        </p>
        <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] leading-tight text-hi">{project.title}</h1>
        <p className="mt-1 text-[14px] text-dim">
          <a href={githubUrl(repo)} className="text-soft hover:text-amber">{repo} on GitHub</a>
        </p>

        <div className="mt-6 grid gap-8">
          {section && data.report && (
            <section aria-label="This project's report">
              <h2 className="mb-2 font-semibold text-hi sm:text-lg">{section.headline}</h2>
              <p className="leading-relaxed text-body"><ReportText text={section.summary} known={known} owner={repo} /></p>
              {section.highlights.length > 0 && (
                <ul className="mt-3 grid list-disc gap-1.5 pl-5 leading-relaxed text-body marker:text-amber">
                  {section.highlights.map((line, i) => (
                    <li key={i}><ReportText text={line} known={known} owner={repo} /></li>
                  ))}
                </ul>
              )}
              <WrittenBy report={data.report} />
            </section>
          )}
          {project.progress && (
            <div className="rounded-xl border border-line bg-panel px-4 py-3.5">
              <ProgressLine progress={project.progress} />
            </div>
          )}
          {project.releases.length > 0 && (
            <Block title="Releases">
              <ul>
                {project.releases.map((r) => (
                  <li key={r.tag} className={ROW}><a href={releaseUrl(repo, r.tag)} className="text-amber no-underline hover:underline">{r.name}</a></li>
                ))}
              </ul>
            </Block>
          )}
          {project.merged.length > 0 && <Block title="Pull requests merged"><Items repo={repo} items={project.merged} /></Block>}
          {project.opened.length > 0 && <Block title="Pull requests opened"><Items repo={repo} items={project.opened} /></Block>}
          {project.issuesOpened.length > 0 && <Block title="Issues opened"><Items repo={repo} items={project.issuesOpened} /></Block>}
          {project.issuesClosed.length > 0 && <Block title="Issues closed"><Items repo={repo} items={project.issuesClosed} /></Block>}
          {hasCommits && (
            <Block title="Commits landed">
              {project.branches.filter((b) => b.commits.length > 0).map((b) => (
                <details key={b.name} className="mb-2 rounded-xl border border-line bg-panel px-4">
                  <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-hi">{b.name}: {b.commits.length} {b.commits.length === 1 ? "commit" : "commits"}</summary>
                  <ul>
                    {b.commits.map((c) => (
                      <li key={c.sha} className={ROW}>
                        <a href={commitUrl(repo, c.sha)} className="flex-none font-mono text-[13px] text-amber no-underline hover:underline">{c.sha.slice(0, 7)}</a>
                        <span className="min-w-0 break-words text-text">{c.title}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </Block>
          )}
          {!isActive(project) && <p className="text-dim">Nothing landed on this project this day.</p>}
          {others.length > 0 && (
            <nav aria-label="Other projects this day" className="flex flex-wrap gap-2">
              {others.map((p) => (
                <Link key={p.repo} href={`/news/${day}/${p.repo}`} className="btn">{p.title}</Link>
              ))}
            </nav>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
