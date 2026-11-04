import type { NewsCommit, NewsDay, NewsFacts, NewsItem, NewsMeasures, NewsProject, NewsRatio, NewsRelease, NewsReport, NewsReportSection, NewsSegment } from "./types.ts";

/**
 * Reading and shaping the news data. Everything here is pure. The data comes from another repository
 * and carries text from public GitHub, so it is parsed tolerantly into only the fields the site shows,
 * and never rendered as HTML. Pull request descriptions are in the files for report writers; they are
 * dropped here.
 */

export const NEWS_ORG = "OpenRAC";
export const NEWS_REPOSITORY = `https://github.com/${NEWS_ORG}/openrac-news`;
export const NEWS_CONTRIBUTING = `${NEWS_REPOSITORY}/blob/main/CONTRIBUTING.md`;
export const NEWS_ISSUES = `${NEWS_REPOSITORY}/issues`;

const FORMAT = 1;
const SAFE_REPO = /^[A-Za-z0-9._-]+$/;
const LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]*(\[bot\])?$/;
const SHA = /^[0-9a-f]{7,64}$/;

type Json = Record<string, unknown>;
const isObject = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);
const text = (x: unknown, max = 2000): string => (typeof x === "string" ? x.trim().slice(0, max) : "");
const count = (x: unknown): number => (typeof x === "number" && Number.isSafeInteger(x) && x >= 0 ? x : 0);
const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const compact = <T>(items: (T | null)[]): T[] => items.filter((x): x is T => x !== null);

/** A real calendar day written YYYY-MM-DD; nothing else may reach a URL or a page. */
export function isNewsDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsed = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
}

/** The list of days, newest first; empty when the file is not one this site can read. */
export function parseIndex(raw: unknown): NewsDay[] {
  if (!isObject(raw) || raw.format !== FORMAT) return [];
  const seen = new Set<string>();
  const days: NewsDay[] = [];
  for (const d of list(raw.days)) {
    if (!isObject(d) || !isNewsDay(d.date) || seen.has(d.date)) continue;
    seen.add(d.date);
    days.push({ date: d.date, report: d.report === true });
  }
  return days.sort((a, b) => b.date.localeCompare(a.date));
}

function parseRatio(x: unknown): NewsRatio | null {
  if (!isObject(x)) return null;
  const [done, total] = [count(x.done), count(x.total)];
  return total > 0 && done <= total ? { done, total } : null;
}

function parseMeasures(x: unknown): NewsMeasures | null {
  if (!isObject(x)) return null;
  const out: NewsMeasures = {};
  for (const name of ["code", "functions", "data"] as const) {
    const ratio = parseRatio(x[name]);
    if (ratio) out[name] = ratio;
  }
  return out.code ? out : null;
}

function parseItem(x: unknown): NewsItem | null {
  if (!isObject(x) || count(x.number) === 0) return null;
  const title = text(x.title, 300);
  return title ? { number: count(x.number), title, author: LOGIN.test(text(x.author)) ? text(x.author) : "" } : null;
}

function parseCommit(x: unknown): NewsCommit | null {
  if (!isObject(x) || !SHA.test(text(x.sha))) return null;
  return { sha: text(x.sha), title: text(x.title, 300) || "Commit", author: text(x.author, 80), date: text(x.date, 40) };
}

function parseRelease(x: unknown): NewsRelease | null {
  if (!isObject(x) || !text(x.tag, 120)) return null;
  return { tag: text(x.tag, 120), name: text(x.name, 200) || text(x.tag, 120) };
}

function parseProject(x: unknown): NewsProject | null {
  if (!isObject(x) || !SAFE_REPO.test(text(x.repo))) return null;
  const pulls = isObject(x.pullRequests) ? x.pullRequests : {};
  const issues = isObject(x.issues) ? x.issues : {};
  const items = (group: unknown) => compact(list(group).map(parseItem));
  const after = isObject(x.progress) ? parseMeasures(x.progress.after) : null;
  return {
    repo: text(x.repo),
    title: text(x.title, 120) || text(x.repo),
    commitCount: count(x.commitCount),
    branches: compact(
      list(x.branches).map((b) => (isObject(b) && text(b.name, 120) ? { name: text(b.name, 120), commits: compact(list(b.commits).map(parseCommit)) } : null)),
    ),
    merged: items(pulls.merged),
    opened: items(pulls.opened),
    issuesOpened: items(issues.opened),
    issuesClosed: items(issues.closed),
    releases: compact(list(x.releases).map(parseRelease)),
    progress: after && isObject(x.progress) ? { before: parseMeasures(x.progress.before), after } : null,
    contributors: list(x.contributors).map((c) => text(c, 80)).filter(Boolean),
  };
}

/** A day's facts, or null when the file is not those of this day. */
export function parseFacts(raw: unknown, day: string): NewsFacts | null {
  if (!isObject(raw) || raw.format !== FORMAT || raw.date !== day) return null;
  const totals = isObject(raw.totals) ? raw.totals : {};
  return {
    date: day,
    totals: {
      commits: count(totals.commits),
      pullRequestsMerged: count(totals.pullRequestsMerged),
      pullRequestsOpened: count(totals.pullRequestsOpened),
      contributors: count(totals.contributors),
    },
    projects: compact(list(raw.projects).map(parseProject)),
  };
}

/** A day's written report, or null when there is none this site can show. A report must say who wrote it. */
export function parseReport(raw: unknown, day: string): NewsReport | null {
  if (!isObject(raw) || raw.format !== FORMAT || raw.date !== day) return null;
  const [author, tool, headline, summary] = [text(raw.author, 40), text(raw.tool, 40), text(raw.headline, 200), text(raw.summary, 2000)];
  if (!LOGIN.test(author) || !tool || !headline || !summary) return null;
  const projects: Record<string, NewsReportSection> = {};
  for (const [repo, s] of Object.entries(isObject(raw.projects) ? raw.projects : {})) {
    if (!SAFE_REPO.test(repo) || !isObject(s) || !text(s.headline, 200) || !text(s.summary, 1200)) continue;
    projects[repo] = { headline: text(s.headline, 200), summary: text(s.summary, 1200), highlights: list(s.highlights).map((h) => text(h, 500)).filter(Boolean) };
  }
  return { date: day, author, tool, headline, summary, projects };
}

export const githubUrl = (repo: string) => `https://github.com/${NEWS_ORG}/${repo}`;
/** GitHub sends an issue address on to the pull request when that is what the number is. */
export const itemUrl = (repo: string, number: number) => `${githubUrl(repo)}/issues/${number}`;
export const commitUrl = (repo: string, sha: string) => `${githubUrl(repo)}/commit/${sha}`;
export const releaseUrl = (repo: string, tag: string) => `${githubUrl(repo)}/releases/tag/${encodeURIComponent(tag)}`;
export const authorUrl = (login: string) => `https://github.com/${encodeURIComponent(login)}`;

const CITATION = /(?<![\w/#])([A-Za-z0-9._-]+)?#(\d+)\b/g;

/**
 * Report text in pieces, with citations as links. `OpenRAC#228` links when that project is tracked,
 * and a bare `#396` when `owner` says whose it is. Anything else stays plain text.
 */
export function segments(value: string, known: readonly string[], owner?: string): NewsSegment[] {
  const out: NewsSegment[] = [];
  let at = 0;
  for (const m of value.matchAll(CITATION)) {
    const repo = m[1] ?? owner;
    if (!repo || !known.includes(repo)) continue;
    if (m.index > at) out.push(value.slice(at, m.index));
    out.push({ label: m[0], href: itemUrl(repo, Number(m[2])) });
    at = m.index + m[0].length;
  }
  if (at < value.length) out.push(value.slice(at));
  return out;
}

export const newsPercent = ({ done, total }: NewsRatio) => (done / total) * 100;
export const formatPercent = (r: NewsRatio) => `${newsPercent(r).toFixed(2)}%`;

/** How far code matching moved over the day, in points, to two decimals; null when it stood still or is unknown. */
export function progressChange(p: NewsProject["progress"]): string | null {
  if (!p?.before?.code || !p.after.code) return null;
  const change = Number((newsPercent(p.after.code) - newsPercent(p.before.code)).toFixed(2));
  return change === 0 ? null : `${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(2)}`;
}

export const isActive = (p: NewsProject) => p.commitCount > 0 || p.merged.length + p.opened.length + p.issuesOpened.length + p.issuesClosed.length + p.releases.length > 0;

const LONG = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
export const formatDay = (day: string) => LONG.format(new Date(`${day}T00:00:00Z`));
export const formatMonth = (day: string) => MONTH.format(new Date(`${day}T00:00:00Z`));

/** The days next to one, in a list that is newest first. */
export function neighbours(days: readonly NewsDay[], day: string): { older?: string; newer?: string } {
  const i = days.findIndex((d) => d.date === day);
  return i < 0 ? {} : { newer: days[i - 1]?.date, older: days[i + 1]?.date };
}

export interface MonthCell {
  date: string;
  dayOfMonth: number;
  /** Present when the day has a page. */
  news?: NewsDay;
}

/** A month as Monday-first weeks (null pads the ends), with the newest day of the months before and after it. */
export function monthGrid(days: readonly NewsDay[], day: string): { weeks: (MonthCell | null)[][]; previous?: string; next?: string } {
  const [year, month] = day.split("-").map(Number);
  const prefix = day.slice(0, 7);
  const inMonth = new Map(days.filter((d) => d.date.startsWith(prefix)).map((d) => [d.date, d]));
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (MonthCell | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= length; d++) {
    const date = `${prefix}-${String(d).padStart(2, "0")}`;
    cells.push({ date, dayOfMonth: d, news: inMonth.get(date) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  // The oldest day after this month is in the next month that has news.
  const nextMonthDay = days.findLast((d) => d.date.slice(0, 7) > prefix)?.date;
  return {
    weeks,
    // `days` is newest first: the first day before this month is that month's newest.
    previous: days.find((d) => d.date.slice(0, 7) < prefix)?.date,
    next: nextMonthDay && days.find((d) => d.date.startsWith(nextMonthDay.slice(0, 7)))?.date,
  };
}

const xml = (value: string) =>
  value
    // Characters XML 1.0 cannot hold at all, not even escaped.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** The written reports as an RSS 2.0 feed, newest first. */
export function rssXml(site: string, reports: readonly NewsReport[]): string {
  const items = reports.map((r) => {
    const url = `${site}/news/${r.date}`;
    const text = `${r.summary} (Written by ${r.author} with ${r.tool} from public GitHub data.)`;
    return `    <item>
      <title>${xml(r.headline)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${new Date(`${r.date}T23:59:59Z`).toUTCString()}</pubDate>
      <description>${xml(text)}</description>
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OpenRAC News</title>
    <link>${xml(`${site}/news`)}</link>
    <atom:link href="${xml(`${site}/news.xml`)}" rel="self" type="application/rss+xml" />
    <description>What happens across the OpenRAC projects, day by day.</description>
    <language>en</language>
${items.join("\n")}
  </channel>
</rss>
`;
}
