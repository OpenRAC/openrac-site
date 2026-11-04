import { Block, ItemList } from "@/components/news/parts";
import { groupItems, releaseUrl } from "@/lib/news/logic";
import type { NewsProject } from "@/lib/news/types";

/** Everything GitHub recorded for a project, sorted the way a player thinks of it. All of it is shown as plain text. */
export default function ProjectFacts({ project, period }: { project: NewsProject; period: "week" | "day" }) {
  const { repo } = project;
  // Opened and merged within the same period counts once, as merged: it is not still waiting.
  const merged = new Set(project.merged.map((x) => x.number));
  const waiting = project.opened.filter((x) => !merged.has(x.number));
  return (
    <div className="grid gap-7">
      {project.releases.length > 0 && (
        <Block title="Releases">
          <ul className="grid gap-1">
            {project.releases.map((r) => (
              <li key={r.tag} className="flex min-h-11 items-center">
                <a href={releaseUrl(repo, r.tag)} className="text-amber underline underline-offset-2">{r.name}</a>
              </li>
            ))}
          </ul>
        </Block>
      )}
      {groupItems(project.merged).map((group) => (
        <Block key={group.name} title={`${group.name} (${group.items.length})`}>
          <ItemList repo={repo} items={group.items} />
        </Block>
      ))}
      {waiting.length > 0 && <Block title={`Opened this ${period}, not merged by its end (${waiting.length})`}><ItemList repo={repo} items={waiting} /></Block>}
      {project.issuesOpened.length > 0 && <Block title={`Issues opened (${project.issuesOpened.length})`}><ItemList repo={repo} items={project.issuesOpened} /></Block>}
      {project.issuesClosed.length > 0 && <Block title={`Issues closed (${project.issuesClosed.length})`}><ItemList repo={repo} items={project.issuesClosed} /></Block>}
    </div>
  );
}
