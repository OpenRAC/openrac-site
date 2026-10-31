import { Breaker } from "./guard.ts";
import { isNextSignal } from "./index.ts";

/**
 * A mod's comments: the latest few of its GitHub Discussion (one per mod, in the index repository),
 * read on the server and shown as plain text on its page. No comment script runs in visitors'
 * browsers; commenting happens on GitHub, which also moderates. Reading needs the server's
 * GITHUB_TOKEN (GitHub's GraphQL API has no anonymous access); without one, the page only links there.
 */

export interface Comment {
  author: string;
  avatar?: string;
  body: string;
  created: string;
  url: string;
}

export interface Discussion {
  url: string;
  total: number;
  comments: Comment[];
}

const QUERY = `query($owner:String!,$name:String!,$n:Int!){repository(owner:$owner,name:$name){discussion(number:$n){url comments(last:5){totalCount nodes{url createdAt body isMinimized author{login avatarUrl}}}}}}`;
const CACHE_MS = 600_000;
const cache = new Map<string, { at: number; value: Discussion | null }>();
const breaker = new Breaker();

export type GraphQL = (query: string, variables: Record<string, unknown>) => Promise<unknown>;

const github: GraphQL = async (query, variables) => {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    // Not `no-store`: on a static page that makes Next treat the page as dynamic. Kept fresh by our own cache below.
    signal: AbortSignal.timeout(8_000),
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`graphql ${res.status}`);
  return res.json();
};

type Raw = { data?: { repository?: { discussion?: { url: string; comments: { totalCount: number; nodes: { url: string; createdAt: string; body: string; isMinimized: boolean; author: { login: string; avatarUrl: string } | null }[] } } | null } | null } };

/** Shapes GitHub's answer; hidden (minimized) comments and deleted authors' comments are left out. */
export function toDiscussion(raw: unknown): Discussion | null {
  const d = (raw as Raw)?.data?.repository?.discussion;
  if (!d) return null;
  return {
    url: d.url,
    total: d.comments.totalCount,
    comments: d.comments.nodes
      .filter((c) => !c.isMinimized && c.author)
      .reverse()
      .map((c) => ({ author: c.author!.login, avatar: /^https:\/\/avatars\.githubusercontent\.com\/u\//.test(c.author!.avatarUrl) ? c.author!.avatarUrl : undefined, body: c.body.slice(0, 4000), created: c.createdAt, url: c.url })),
  };
}

/** The discussion of a mod, or null when there is none, no token, or GitHub fails (the page then links only). */
export async function getDiscussion(indexSource: string, n: number | undefined, query: GraphQL = github, now = Date.now()): Promise<Discussion | null> {
  const repo = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/.exec(indexSource);
  if (!n || !repo || (query === github && !process.env.GITHUB_TOKEN)) return null;
  const key = `${indexSource}#${n}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.value;
  if (!breaker.allow(now)) return hit?.value ?? null;
  try {
    const value = toDiscussion(await query(QUERY, { owner: repo[1], name: repo[2], n }));
    breaker.success();
    cache.set(key, { at: now, value });
    return value;
  } catch (e) {
    if (isNextSignal(e)) throw e;
    breaker.failure(now);
    return hit?.value ?? null;
  }
}
