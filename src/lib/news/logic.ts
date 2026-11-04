import type { NewsCommit, NewsDayFacts, NewsIndex, NewsItem, NewsMeasures, NewsProgress, NewsProject, NewsRatio, NewsRelease, NewsReport, NewsReportSection, NewsSegment, NewsSource, NewsTotals, NewsWeekEntry, NewsWeekFacts } from "./types.ts";

/**
 * Reading and shaping the news data. Everything here is pure. The data comes from another repository
 * and carries text from public GitHub, so it is parsed tolerantly into only the fields the site shows,
 * and never rendered as HTML. Pull request descriptions are in the files for report writers; they are
 * dropped here.
 */

export const NEWS_ORG = "OpenRAC";
export const NEWS_FOLDER = `https://github.com/${NEWS_ORG}/openrac-site/tree/main/news`;
export const NEWS_CONTRIBUTING = `https://github.com/${NEWS_ORG}/openrac-site/blob/main/news/CONTRIBUTING.md`;
export const NEWS_ISSUES = `https://github.com/${NEWS_ORG}/openrac-site/issues`;

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

/** An ISO week written 2026-W44, in the range that year really has. */
export function isNewsWeek(week: unknown): week is string {
  if (typeof week !== "string") return false;
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!m) return false;
  // 28 December is always in a year's last week.
  const number = Number(m[2]);
  return number >= 1 && number <= Number(weekOfDay(`${m[1]}-12-28`).slice(6));
}

/** The ISO week a day falls in. Around New Year its year can differ from the day's. */
export function weekOfDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const weekday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - weekday + 3); // that week's Thursday decides its year
  const year = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const number = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${year}-W${String(number).padStart(2, "0")}`;
}

/** The list of weeks and days, newest first; null when the file is not one this site can read. */
export function parseIndex(raw: unknown): NewsIndex | null {
  if (!isObject(raw) || raw.format !== FORMAT || !Array.isArray(raw.weeks) || !Array.isArray(raw.days)) return null;
  const seen = new Set<string>();
  const weeks: NewsWeekEntry[] = [];
  for (const w of raw.weeks) {
    if (!isObject(w) || !isNewsWeek(w.week) || seen.has(w.week) || !isNewsDay(w.start) || !isNewsDay(w.end)) continue;
    seen.add(w.week);
    weeks.push({ week: w.week, start: w.start, end: w.end, finished: w.finished === true, report: w.report === true });
  }
  const days = [...new Set(raw.days.filter(isNewsDay))];
  return { weeks: weeks.sort((a, b) => b.start.localeCompare(a.start)), days: days.sort((a, b) => b.localeCompare(a)) };
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

function parseTotals(raw: unknown): NewsTotals {
  const totals = isObject(raw) ? raw : {};
  return {
    commits: count(totals.commits),
    pullRequestsMerged: count(totals.pullRequestsMerged),
    pullRequestsOpened: count(totals.pullRequestsOpened),
    contributors: count(totals.contributors),
  };
}

/** A day's facts, or null when the file is not those of this day. */
export function parseDayFacts(raw: unknown, day: string): NewsDayFacts | null {
  if (!isObject(raw) || raw.format !== FORMAT || raw.date !== day) return null;
  return { date: day, totals: parseTotals(raw.totals), projects: compact(list(raw.projects).map(parseProject)) };
}

/** A week's facts, or null when the file is not those of this week. */
export function parseWeekFacts(raw: unknown, week: string): NewsWeekFacts | null {
  if (!isObject(raw) || raw.format !== FORMAT || raw.week !== week || !isNewsDay(raw.start) || !isNewsDay(raw.end)) return null;
  return { week, start: raw.start, end: raw.end, days: list(raw.days).filter(isNewsDay), totals: parseTotals(raw.totals), projects: compact(list(raw.projects).map(parseProject)) };
}

/** A week's written report, or null when it is not one this site can show. A report must say who wrote it. */
export function parseReport(raw: unknown, week: string): NewsReport | null {
  if (!isObject(raw) || raw.format !== FORMAT || raw.week !== week) return null;
  const [author, tool, headline, summary] = [text(raw.author, 40), text(raw.tool, 40), text(raw.headline, 200), text(raw.summary, 2000)];
  if (!LOGIN.test(author) || !tool || !headline || !summary) return null;
  const projects: Record<string, NewsReportSection> = {};
  for (const [repo, s] of Object.entries(isObject(raw.projects) ? raw.projects : {})) {
    if (!SAFE_REPO.test(repo) || !isObject(s) || !text(s.headline, 200) || !text(s.summary, 1200)) continue;
    projects[repo] = { headline: text(s.headline, 200), summary: text(s.summary, 1200), highlights: list(s.highlights).map((h) => text(h, 500)).filter(Boolean) };
  }
  return { week, author, tool, headline, summary, projects };
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

/** How far code matching moved, between the two-decimal figures people see; null when those read the same or are unknown. */
export function progressChange(p: NewsProgress): string | null {
  const change = progressGain(p);
  return change === null ? null : `${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(2)}`;
}

/** The same change as a number, for comparing projects. */
export function progressGain(p: NewsProgress): number | null {
  if (!p?.before?.code || !p.after.code) return null;
  const shown = (r: NewsRatio) => Number(newsPercent(r).toFixed(2));
  const change = Number((shown(p.after.code) - shown(p.before.code)).toFixed(2));
  return change === 0 ? null : change;
}

export const isActive = (p: NewsProject) => p.commitCount > 0 || p.merged.length + p.opened.length + p.issuesOpened.length + p.issuesClosed.length + p.releases.length > 0;

/** The project that moved furthest, whose art leads a week's page; the first active one when none moved. */
export function leadProject(projects: readonly NewsProject[]): NewsProject | undefined {
  const moved = projects.filter((p) => (progressGain(p.progress) ?? 0) > 0);
  if (moved.length) return moved.reduce((best, p) => (progressGain(p.progress)! > progressGain(best.progress)! ? p : best));
  return projects.find(isActive);
}

const COMMIT_PREFIX = /^([a-z]+)(?:\([^)]*\))?!?:\s*/i;

/** A pull request's title without "feat(port): ", starting with a capital: how people would write it. */
export function plainTitle(title: string): string {
  const rest = title.replace(COMMIT_PREFIX, "");
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : title;
}

export type ItemGroupName = "New" | "Fixed" | "Other work" | "Behind the scenes";

/** Merged work sorted the way a player thinks of it, from the title's own prefix. Empty groups are left out. */
export function groupItems(items: readonly NewsItem[]): { name: ItemGroupName; items: NewsItem[] }[] {
  const groups: Record<ItemGroupName, NewsItem[]> = { New: [], Fixed: [], "Other work": [], "Behind the scenes": [] };
  for (const item of items) {
    const kind = COMMIT_PREFIX.exec(item.title)?.[1].toLowerCase();
    if (kind === "feat") groups.New.push(item);
    else if (kind === "fix") groups.Fixed.push(item);
    else if (kind) groups["Behind the scenes"].push(item);
    else groups["Other work"].push(item);
  }
  return (Object.keys(groups) as ItemGroupName[]).filter((name) => groups[name].length).map((name) => ({ name, items: groups[name] }));
}

/** "Label: sentence" as its two parts, so the label can stand out; no label when the text does not open with a short one. */
export function splitLabel(line: string): { label?: string; rest: string } {
  const m = /^([^:#]{1,32}):\s+([\s\S]+)$/.exec(line);
  return m ? { label: m[1], rest: m[2] } : { rest: line };
}

/** Everything a report cites, with its real title from the facts: a reader can check each claim. In order of first mention. */
export function reportSources(report: NewsReport, projects: readonly NewsProject[]): NewsSource[] {
  const byRepo = new Map(projects.map((p) => [p.repo, p]));
  const found = new Map<string, NewsSource>();
  const scan = (value: string, owner?: string) => {
    for (const m of value.matchAll(CITATION)) {
      const repo = m[1] ?? owner;
      const project = repo ? byRepo.get(repo) : undefined;
      if (!repo || !project) continue;
      const number = Number(m[2]);
      const item = [...project.merged, ...project.opened, ...project.issuesOpened, ...project.issuesClosed].find((x) => x.number === number);
      const key = `${repo}#${number}`;
      if (item && !found.has(key)) found.set(key, { repo, number, title: plainTitle(item.title), href: itemUrl(repo, number) });
    }
  };
  scan(report.headline);
  scan(report.summary);
  for (const [repo, s] of Object.entries(report.projects)) {
    scan(s.headline, repo);
    scan(s.summary, repo);
    s.highlights.forEach((line) => scan(line, repo));
  }
  return [...found.values()];
}

const LONG = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const SHORT_DAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" });
const at = (day: string) => new Date(`${day}T00:00:00Z`);
export const formatDay = (day: string) => LONG.format(at(day));
export const formatMonth = (day: string) => MONTH.format(at(day));
export const formatShortDay = (day: string) => SHORT_DAY.format(at(day));

/** "26 Oct to 1 Nov 2026". */
export const formatWeekRange = (start: string, end: string) => `${DAY_MONTH.format(at(start))} to ${DAY_MONTH.format(at(end))} ${end.slice(0, 4)}`;
/** "Week 44, 2026". */
export const formatWeekName = (week: string) => `Week ${Number(week.slice(6))}, ${week.slice(0, 4)}`;

/** The items next to one, in a list that is newest first. */
export function neighbours<T>(list: readonly T[], item: T): { older?: T; newer?: T } {
  const i = list.indexOf(item);
  return i < 0 ? {} : { newer: list[i - 1], older: list[i + 1] };
}

export interface MonthCell {
  date: string;
  dayOfMonth: number;
  /** The day has a page. */
  hasNews: boolean;
}

/** A month as Monday-first weeks (null pads the ends), with the newest day of the months before and after it. */
export function monthGrid(days: readonly string[], day: string): { weeks: (MonthCell | null)[][]; previous?: string; next?: string } {
  const [year, month] = day.split("-").map(Number);
  const prefix = day.slice(0, 7);
  const here = new Set(days.filter((d) => d.startsWith(prefix)));
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (MonthCell | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= length; d++) {
    const date = `${prefix}-${String(d).padStart(2, "0")}`;
    cells.push({ date, dayOfMonth: d, hasNews: here.has(date) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  // The oldest day after this month is in the next month that has news.
  const later = days.findLast((d) => d.slice(0, 7) > prefix);
  return {
    weeks,
    // `days` is newest first: the first day before this month is that month's newest.
    previous: days.find((d) => d.slice(0, 7) < prefix),
    next: later && days.find((d) => d.startsWith(later.slice(0, 7))),
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

/** The written reports as an RSS 2.0 feed, newest first; `end` gives a week's last day. */
export function rssXml(site: string, reports: readonly NewsReport[], end: (week: string) => string): string {
  const items = reports.map((r) => {
    const url = `${site}/news/${r.week}`;
    const text = `${r.summary} (Written by ${r.author} with ${r.tool} from public GitHub data.)`;
    return `    <item>
      <title>${xml(r.headline)}</title>
      <link>${xml(url)}</link>
      <guid isPermaLink="true">${xml(url)}</guid>
      <pubDate>${new Date(`${end(r.week)}T23:59:59Z`).toUTCString()}</pubDate>
      <description>${xml(text)}</description>
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OpenRAC News</title>
    <link>${xml(`${site}/news`)}</link>
    <atom:link href="${xml(`${site}/news.xml`)}" rel="self" type="application/rss+xml" />
    <description>What happens across the OpenRAC projects, week by week.</description>
    <language>en</language>
${items.join("\n")}
  </channel>
</rss>
`;
}
