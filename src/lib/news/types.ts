/** The news as the site shows it: only the fields it displays, read from OpenRAC/openrac-news (format 1). */

export interface NewsDay {
  date: string;
  report: boolean;
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

export interface NewsProject {
  repo: string;
  title: string;
  commitCount: number;
  branches: { name: string; commits: NewsCommit[] }[];
  merged: NewsItem[];
  opened: NewsItem[];
  issuesOpened: NewsItem[];
  issuesClosed: NewsItem[];
  releases: NewsRelease[];
  progress: { before: NewsMeasures | null; after: NewsMeasures } | null;
  contributors: string[];
}

export interface NewsTotals {
  commits: number;
  pullRequestsMerged: number;
  pullRequestsOpened: number;
  contributors: number;
}

export interface NewsFacts {
  date: string;
  totals: NewsTotals;
  projects: NewsProject[];
}

export interface NewsReportSection {
  headline: string;
  summary: string;
  highlights: string[];
}

export interface NewsReport {
  date: string;
  author: string;
  tool: string;
  headline: string;
  summary: string;
  projects: Record<string, NewsReportSection>;
}

/** A piece of report text: plain words, or a citation turned into a link. */
export type NewsSegment = string | { label: string; href: string };
