import { PROJECTS, type ProjectId } from "./projects";

/** One commit in the "Recent activity" feed. */
export interface Commit {
  project: string;
  projectId: ProjectId;
  message: string;
  date: string;
  url: string;
}

interface GithubCommit {
  html_url: string;
  commit: { message: string; author: { date: string } };
}

/** Trailer lines that are never a commit's title. */
const SKIP_LINE = /^(signed-off-by|co-authored-by)/i;

/** First meaningful line of a commit message. */
export function commitTitle(message: string): string {
  return (
    message
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l && !SKIP_LINE.test(l)) ?? "Commit"
  );
}

/** The last commits read per repository, kept by the running server: a refresh that fails (the
 * API's rate limit, a timeout) shows them again instead of an empty feed. */
const lastCommits = new Map<string, Commit[]>();

/** Latest commits of every tracked project, newest first. Empty if GitHub has never answered. */
export async function getActivity(limit = 8): Promise<Commit[]> {
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  // Optional, only raises the rate limit. Never sent to the browser.
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const lists = await Promise.all(
    PROJECTS.filter((p) => p.repo).map(async (p) => {
      try {
        const res = await fetch(`https://api.github.com/repos/${p.repo}/commits?per_page=6`, {
          headers,
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return lastCommits.get(p.repo!) ?? [];
        const commits = (await res.json()) as GithubCommit[];
        const list = commits.map<Commit>((c) => ({
          project: p.tag ?? p.name,
          projectId: p.id,
          message: commitTitle(c.commit.message),
          date: c.commit.author.date,
          url: c.html_url,
        }));
        lastCommits.set(p.repo!, list);
        return list;
      } catch {
        return lastCommits.get(p.repo!) ?? [];
      }
    }),
  );
  return lists.flat().sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, limit);
}
