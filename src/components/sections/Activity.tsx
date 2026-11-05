import type { CSSProperties } from "react";
import Section from "./HomeSection";
import styles from "./Home.module.css";
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
        <ul className={styles.activityList}>
          {commits.map((c) => (
            <li key={c.url} className={styles.activityRow}>
              <span className={styles.activityTag} style={tagStyle(c.projectId)}>
                {c.project}
              </span>
              <a href={c.url}>{c.message}</a>
              <time dateTime={c.date}>{ago(c.date)}</time>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
