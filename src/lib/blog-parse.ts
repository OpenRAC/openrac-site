/** Pure helpers for blog posts (no file access, so they are easy to test). */

export interface PostMeta {
  slug: string;
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  summary: string;
  tags: string[];
  author?: string;
  /** Drafts are visible in `npm run dev` and hidden in production builds. */
  draft: boolean;
}

export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Rough reading time at 200 words per minute, at least one minute. */
export function readingMinutes(markdown: string): number {
  const words = markdown.replace(/```[\s\S]*?```/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Validates front matter; the error names the file so a bad post is easy to find. */
export function toMeta(slug: string, data: Record<string, unknown>): PostMeta {
  const fail = (why: string): never => {
    throw new Error(`content/blog/${slug}.md: ${why}`);
  };
  if (!SLUG.test(slug)) fail("file name must be lowercase words joined by dashes, e.g. my-post.md");

  const title = str(data.title) || fail("front matter needs a `title`");
  const summary = str(data.summary) || fail("front matter needs a `summary`");

  // YAML turns an unquoted 2026-09-30 into a Date.
  const raw = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : str(data.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) fail("front matter needs a `date` like 2026-09-30");

  const tags = Array.isArray(data.tags) ? data.tags.map(str).filter(Boolean) : [];
  return { slug, title, summary, date: raw, tags, author: str(data.author) || undefined, draft: data.draft === true };
}

export const byNewest = (a: PostMeta, b: PostMeta): number => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug);

export const xmlEscape = (s: string): string =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] as string);
