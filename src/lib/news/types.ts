/** The news as the site shows it: only the fields it displays, read from the news/ folder (format 1). */

export interface NewsWeekEntry {
  week: string;
  start: string;
  end: string;
  finished: boolean;
  report: boolean;
}

export interface NewsIndex {
  weeks: NewsWeekEntry[];
  /** Days with facts, newest first. */
  days: string[];
}

export interface NewsRatio {
  done: number;
  total: number;
}

export type NewsMeasures = Partial<Record<"code" | "functions" | "data", NewsRatio>>;

export interface NewsCommit {
  sha: string;
  title: string;
  author: string;
  date: string;
}

export interface NewsItem {
  number: number;
  title: string;
  author: string;
}

export interface NewsRelease {
  tag: string;
  name: string;
}

export type NewsProgress = { before: NewsMeasures | null; after: NewsMeasures } | null;

export interface NewsProject {
  repo: string;
  title: string;
  commitCount: number;
  /** Only in a day's facts; a week adds them up. */
  branches: { name: string; commits: NewsCommit[] }[];
  merged: NewsItem[];
  opened: NewsItem[];
  issuesOpened: NewsItem[];
  issuesClosed: NewsItem[];
  releases: NewsRelease[];
  progress: NewsProgress;
  contributors: string[];
}

export interface NewsTotals {
  commits: number;
  pullRequestsMerged: number;
  pullRequestsOpened: number;
  contributors: number;
}

export interface NewsDayFacts {
  date: string;
  totals: NewsTotals;
  projects: NewsProject[];
}

export interface NewsWeekFacts {
  week: string;
  start: string;
  end: string;
  /** The week's days that have facts, oldest first. */
  days: string[];
  totals: NewsTotals;
  projects: NewsProject[];
}

export interface NewsReportSection {
  headline: string;
  summary: string;
  highlights: string[];
}

export interface NewsReport {
  week: string;
  author: string;
  tool: string;
  /** For search results and link previews; see news/AGENTS.md. */
  title: string;
  description: string;
  headline: string;
  summary: string;
  projects: Record<string, NewsReportSection>;
}

/** Why a week does or does not show a report: "invalid" must not look like "none", or visitors would be asked to write one that exists. */
export type NewsReportState = { status: "ok"; report: NewsReport } | { status: "none" } | { status: "invalid" };

/** A piece of report text: plain words, or a citation turned into a link. */
export type NewsSegment = string | { label: string; href: string };

export interface NewsSource {
  repo: string;
  number: number;
  title: string;
  href: string;
}
