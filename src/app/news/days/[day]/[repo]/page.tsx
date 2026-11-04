import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageTransition from "@/components/layout/PageTransition";
import { accentStyle, Block, githubLink, ProjectCard } from "@/components/news/parts";
import ProjectFacts from "@/components/news/ProjectFacts";
import { getNewsDay, getNewsIndex } from "@/lib/news";
import { commitUrl, formatDay, isActive, isNewsDay, plainTitle } from "@/lib/news/logic";
import { newsAlternates } from "@/lib/news/metadata";

// Built ahead from the news/ folder. An address not in it reaches the page, which answers with our own 404.
export async function generateStaticParams() {
  const days = await Promise.all(((await getNewsIndex())?.days ?? []).map((d) => getNewsDay(d)));
  return days.flatMap((f) => (f ? f.projects.map((p) => ({ day: f.date, repo: p.repo })) : []));
}

export async function generateMetadata(props: PageProps<"/news/days/[day]/[repo]">): Promise<Metadata> {
  const { day, repo } = await props.params;
  const project = isNewsDay(day) ? (await getNewsDay(day))?.projects.find((p) => p.repo === repo) : undefined;
  if (!project) return { title: "News not found", robots: { index: false } };
  return { title: `${project.title}, ${formatDay(day)} · News`, description: `What landed on ${project.title} on ${formatDay(day)}.`, robots: { index: false }, alternates: newsAlternates(`/news/days/${day}/${repo}`) };
}

/** One project on one day: everything GitHub recorded, down to each commit. */
export default async function NewsDayProjectPage(props: PageProps<"/news/days/[day]/[repo]">) {
  const { day, repo } = await props.params;
  if (!isNewsDay(day)) notFound();
  if (!(await getNewsIndex())?.days.includes(day)) notFound();
  const facts = await getNewsDay(day);
  if (!facts) throw new Error(`${day} could not be read`);
  const project = facts.projects.find((p) => p.repo === repo);
  if (!project) notFound();
  const others = facts.projects.filter((p) => isActive(p) && p.repo !== repo);
  const branches = project.branches.filter((b) => b.commits.length > 0);
  return (
    <PageTransition>
      <main className="mx-auto grid max-w-[820px] gap-6 px-4 pb-12 pt-8" style={accentStyle(repo)}>
        <p className="text-[14px]">
          <Link href={`/news/days/${day}`} className="inline-flex min-h-11 items-center text-amber underline underline-offset-2">‹ {formatDay(day)}</Link>
        </p>
        <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] leading-tight text-hi">{project.title}</h1>
        <ProjectCard project={project} />
        <ProjectFacts project={project} period="day" />
        {branches.length > 0 && (
          <Block title="Commits landed">
            {branches.map((b) => (
              <details key={b.name} className="mb-2 rounded-xl border border-line bg-panel px-4">
                <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-hi">{b.name}: {b.commits.length} {b.commits.length === 1 ? "commit" : "commits"}</summary>
                <ul>
                  {b.commits.map((c) => (
                    <li key={c.sha} className="flex min-h-11 min-w-0 flex-wrap items-baseline gap-x-2.5 border-b border-line py-2.5 last:border-0">
                      <a href={commitUrl(repo, c.sha)} className="inline-flex min-h-6 flex-none items-center font-mono text-[13px] text-amber underline underline-offset-2">{c.sha.slice(0, 7)}</a>
                      <span className="min-w-0 text-text [overflow-wrap:anywhere]">{plainTitle(c.title)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </Block>
        )}
        {!isActive(project) && <p className="text-soft">Nothing landed on this project this day.</p>}
        <p className="text-[14px]">{githubLink(repo)}</p>
        {others.length > 0 && (
          <nav aria-label="Other projects this day" className="flex flex-wrap gap-2">
            {others.map((p) => (
              <Link key={p.repo} href={`/news/days/${day}/${p.repo}`} className="btn btn-sm">{p.title}</Link>
            ))}
          </nav>
        )}
      </main>
    </PageTransition>
  );
}
