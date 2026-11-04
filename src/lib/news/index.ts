import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { isNewsDay, isNewsWeek, parseDayFacts, parseIndex, parseReport, parseWeekFacts } from "./logic.ts";
import type { NewsDayFacts, NewsIndex, NewsReport, NewsReportState, NewsWeekFacts } from "./types.ts";

/**
 * The news, read from the `news/` folder of this repository, which goes into the image at each build:
 * new news appears with the next deploy. A file that is missing or broken is logged and left out, and
 * a broken report never costs a week its facts. See news/README.md for where the files come from.
 */

// Not traced: Next would otherwise copy the whole project into the server bundle. The Containerfile copies the news itself.
const root = () => process.env.NEWS_DIR?.trim() || join(/* turbopackIgnore: true */ process.cwd(), "news");

type Read = { found: true; value: unknown } | { found: false } | { found: true; broken: true };

async function read(path: string): Promise<Read> {
  let text: string;
  try {
    text = await readFile(/* turbopackIgnore: true */ join(root(), path), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { found: false };
    logFailure(path, e);
    return { found: true, broken: true };
  }
  try {
    return { found: true, value: JSON.parse(text) };
  } catch (e) {
    logFailure(path, e);
    return { found: true, broken: true };
  }
}

const logFailure = (what: string, e: unknown) => {
  console.error(JSON.stringify({ level: "error", code: "news_read_failed", what, error: e instanceof Error ? e.message : String(e) }));
};

const parsed = <T>(got: Read, parse: (value: unknown) => T | null, what: string): T | null => {
  if (!got.found || "broken" in got) return null;
  const value = parse(got.value);
  if (!value) logFailure(what, new Error("unreadable format"));
  return value;
};

/**
 * The finished weeks and their days, newest first; null when there is no list to read. Whether a week has a
 * report comes from the file itself, because merging a report does not touch the generated list.
 */
export async function getNewsIndex(): Promise<NewsIndex | null> {
  const index = parsed(await read("data/index.json"), parseIndex, "index");
  if (!index) return null;
  const weeks = index.weeks.filter((w) => w.finished);
  const lastDay = weeks[0]?.end ?? "";
  const reports = await Promise.all(weeks.map((w) => stat(/* turbopackIgnore: true */ join(root(), "reports", w.week, "report.json")).then(() => true, () => false)));
  return { weeks: weeks.map((w, i) => ({ ...w, report: reports[i] })), days: index.days.filter((d) => d <= lastDay) };
}

async function reportState(week: string): Promise<NewsReportState> {
  const got = await read(`reports/${week}/report.json`);
  if (!got.found) return { status: "none" };
  const report = parsed(got, (value) => parseReport(value, week), `report ${week}`);
  return report ? { status: "ok", report } : { status: "invalid" };
}

/** One week's facts and report state; null when its facts cannot be read. */
export async function getNewsWeek(week: string): Promise<{ facts: NewsWeekFacts; report: NewsReportState } | null> {
  if (!isNewsWeek(week)) return null;
  const [got, report] = await Promise.all([read(`data/weeks/${week}.json`), reportState(week)]);
  const facts = parsed(got, (value) => parseWeekFacts(value, week), `week ${week}`);
  return facts && { facts, report };
}

/** One day's facts; null when they cannot be read. */
export async function getNewsDay(day: string): Promise<NewsDayFacts | null> {
  if (!isNewsDay(day)) return null;
  return parsed(await read(`data/days/${day}/facts.json`), (value) => parseDayFacts(value, day), `day ${day}`);
}

/** The newest written reports, with their facts. */
export async function getLatestReports(limit: number): Promise<{ report: NewsReport; facts: NewsWeekFacts }[]> {
  const index = await getNewsIndex();
  const weeks = await Promise.all((index?.weeks ?? []).filter((w) => w.report).slice(0, limit).map((w) => getNewsWeek(w.week)));
  return weeks.flatMap((w) => (w?.report.status === "ok" ? [{ report: w.report.report, facts: w.facts }] : []));
}
