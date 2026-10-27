import type { CSSProperties } from "react";
import Section from "@/components/ui/Section";
import type { Commit } from "@/lib/activity";
import { PROJECTS, type ProjectId } from "@/lib/projects";

/** "3 h ago": how long ago a commit was made, rounded. */
const ago = (iso: string): string => {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
};

/** A project's tag in its own card colours, so the feed matches the cards. */
function tagStyle(id: ProjectId): CSSProperties {
  const t = PROJECTS.find((p) => p.id === id)!.theme;
  return {
    color: t.text2,
    borderColor: `color-mix(in srgb, ${t.border} 55%, transparent)`,
    background: `color-mix(in srgb, ${t.from} 45%, transparent)`,
  };
}

/** "Recent activity": the newest commits across every project (loaded on the server, see lib/activity). */
export default function Activity({ commits }: { commits: Commit[] }) {
  return (
    <Section id="activity" title="Recent activity" sub="The latest commits across the tracked projects, straight from GitHub.">
      {commits.length === 0 ? (
        <p className="text-dim">Could not load activity right now. See the repositories on GitHub.</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {commits.map((c) => (
            <li key={c.url} className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-xl border border-line bg-panel px-4 py-3">
              <span className="flex-none rounded-full border px-2.5 py-1 font-orbitron text-[11px] font-semibold tracking-wider" style={tagStyle(c.projectId)}>
                {c.project}
              </span>
              <a href={c.url} className="order-3 min-w-0 basis-full truncate text-text no-underline hover:text-amber sm:order-none sm:basis-0 sm:flex-1">{c.message}</a>
              <time dateTime={c.date} className="flex-none text-[13px] text-dim">{ago(c.date)}</time>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
