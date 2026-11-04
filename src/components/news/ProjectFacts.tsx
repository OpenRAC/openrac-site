import { Block, ItemList } from "@/components/news/parts";
import { groupItems, releaseUrl } from "@/lib/news/logic";
import type { NewsProject } from "@/lib/news/types";

/** Everything GitHub recorded for a project, sorted the way a player thinks of it. All of it is shown as plain text. */
export default function ProjectFacts({ project }: { project: NewsProject }) {
  const { repo } = project;
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
      {project.opened.length > 0 && <Block title={`Proposed, not merged yet (${project.opened.length})`}><ItemList repo={repo} items={project.opened} /></Block>}
      {project.issuesOpened.length > 0 && <Block title={`Issues opened (${project.issuesOpened.length})`}><ItemList repo={repo} items={project.issuesOpened} /></Block>}
      {project.issuesClosed.length > 0 && <Block title={`Issues closed (${project.issuesClosed.length})`}><ItemList repo={repo} items={project.issuesClosed} /></Block>}
    </div>
  );
}
