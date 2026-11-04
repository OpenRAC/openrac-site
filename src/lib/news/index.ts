import { Breaker } from "../mods/guard.ts";
import { FetchError, isNextSignal, withRetry } from "../mods/index.ts";
import { isMediaName, isNewsDay, isNewsWeek, parseDayFacts, parseIndex, parseReport, parseWeekFacts } from "./logic.ts";
import type { NewsDayFacts, NewsIndex, NewsReportState, NewsWeekFacts } from "./types.ts";

/**
 * The news, read on the server from OpenRAC/openrac-news, so a new week appears without a deploy.
 *
 * What can go wrong is kept apart, so a page can say what actually happened:
 * - a failed read serves the last good copy this server holds, marked `stale`; with none, callers get null;
 * - a report that does not exist yet is normal, and is not the same as one that could not be read
 *   or that is broken (see NewsReportState), and neither costs the page its facts;
 * - a dead source fails fast through a circuit breaker, so it cannot hold up the home page.
 * Next's own signals pass through untouched.
 */

const DEFAULT_SOURCE = "https://raw.githubusercontent.com/OpenRAC/openrac-news/main";
const REVALIDATE_SECONDS = 3600;
const TIMEOUT_MS = 6_000;
const MAX_JSON_BYTES = 1_000_000;
export const NEWS_MEDIA_MAX_BYTES = 1_000_000;

const breaker = new Breaker();
const source = () => (process.env.NEWS_SOURCE_URL?.trim() || DEFAULT_SOURCE).replace(/\/$/, "");

type Read = { found: true; value: unknown } | { found: false };

const fileAllowed = () => process.env.NODE_ENV === "test" || !!process.env.NEWS_ALLOW_FILE;

/** One JSON file: found, missing (a real 404), or a throw for anything else. file: is for tests only. */
async function read(path: string): Promise<Read> {
  const url = `${source()}/${path}`;
  if (url.startsWith("file:")) {
    if (!fileAllowed()) throw new FetchError("http");
    const { readFile } = await import("node:fs/promises");
    try {
      return { found: true, value: JSON.parse(await readFile(new URL(url), "utf8")) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return { found: false };
      throw new FetchError(e instanceof SyntaxError ? "parse" : "http");
    }
  }
  if (!breaker.allow()) throw new FetchError("timeout");
  try {
    const got = await withRetry(async (): Promise<Read> => {
      let res: Response;
      try {
        res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      } catch (e) {
        if (isNextSignal(e)) throw e;
        throw new FetchError("timeout");
      }
      if (res.status === 404) return { found: false };
      if (!res.ok) throw new FetchError(res.status === 429 || res.status >= 500 ? "timeout" : "http");
      const body = await res.text();
      if (body.length > MAX_JSON_BYTES) throw new FetchError("parse");
      try {
        return { found: true, value: JSON.parse(body) };
      } catch {
        throw new FetchError("parse");
      }
    }, 1);
    breaker.success();
    return got;
  } catch (e) {
    if (isNextSignal(e)) throw e;
    // A broken file says the source is up; only an unreachable source should trip the breaker.
    if (e instanceof FetchError && e.kind === "parse") breaker.success();
    else breaker.failure();
    throw e;
  }
}

const logFailure = (what: string, e: unknown) => {
  if (isNextSignal(e)) throw e;
  console.error(JSON.stringify({ level: "error", code: "news_read_failed", what, error: e instanceof Error ? e.message : String(e) }));
};

let lastIndex: NewsIndex | null = null;

/** The list of weeks and days; null only when it could not be read and this server has no earlier copy. */
export async function getNewsIndex(): Promise<{ index: NewsIndex; stale: boolean } | null> {
  try {
    const got = await read("data/index.json");
    // A format this site cannot read is a failure like any other, not "there is no news".
    const index = got.found ? parseIndex(got.value) : null;
    if (index) {
      lastIndex = index;
      return { index, stale: false };
    }
    logFailure("index", new Error(got.found ? "unreadable format" : "missing"));
  } catch (e) {
    logFailure("index", e);
  }
  return lastIndex && { index: lastIndex, stale: true };
}

const lastWeeks = new Map<string, NewsWeekFacts>();
const lastReports = new Map<string, NewsReportState>();

async function reportState(week: string): Promise<{ state: NewsReportState; stale: boolean }> {
  try {
    const got = await read(`reports/${week}/report.json`);
    if (!got.found) return { state: { status: "none" }, stale: false };
    const report = parseReport(got.value, week);
    if (!report) {
      logFailure(`report ${week}`, new Error("invalid report"));
      return { state: { status: "invalid" }, stale: false };
    }
    const state: NewsReportState = { status: "ok", report };
    lastReports.set(week, state);
    return { state, stale: false };
  } catch (e) {
    logFailure(`report ${week}`, e);
    // A report that was read but is not valid JSON is broken, not unreachable: GitHub will not fix it by itself.
    if (e instanceof FetchError && e.kind === "parse") return { state: { status: "invalid" }, stale: false };
    const last = lastReports.get(week);
    return last ? { state: last, stale: true } : { state: { status: "unavailable" }, stale: false };
  }
}

/** One week's facts and report state; null when the facts could not be read at all. */
export async function getNewsWeek(week: string): Promise<{ facts: NewsWeekFacts; report: NewsReportState; stale: boolean } | null> {
  if (!isNewsWeek(week)) return null;
  const [factsResult, report] = await Promise.all([
    read(`data/weeks/${week}.json`).then(
      (got) => (got.found ? parseWeekFacts(got.value, week) : null),
      (e) => {
        logFailure(`week ${week}`, e);
        return null;
      },
    ),
    reportState(week),
  ]);
  if (factsResult) {
    lastWeeks.set(week, factsResult);
    return { facts: factsResult, report: report.state, stale: report.stale };
  }
  const last = lastWeeks.get(week);
  return last ? { facts: last, report: report.state, stale: true } : null;
}

const lastDays = new Map<string, NewsDayFacts>();

/** One day's facts; null when they could not be read at all. */
export async function getNewsDay(day: string): Promise<{ facts: NewsDayFacts; stale: boolean } | null> {
  if (!isNewsDay(day)) return null;
  try {
    const got = await read(`data/days/${day}/facts.json`);
    const facts = got.found ? parseDayFacts(got.value, day) : null;
    if (facts) {
      lastDays.set(day, facts);
      return { facts, stale: false };
    }
  } catch (e) {
    logFailure(`day ${day}`, e);
  }
  const last = lastDays.get(day);
  return last ? { facts: last, stale: true } : null;
}

/** The newest written reports, with their facts. Null when the list of weeks could not be read: not the same as no reports. */
export async function getLatestReports(limit: number) {
  const index = await getNewsIndex();
  if (!index) return null;
  const weeks = await Promise.all(index.index.weeks.filter((w) => w.report).slice(0, limit).map((w) => getNewsWeek(w.week)));
  return weeks.flatMap((w) => (w?.report.status === "ok" ? [{ report: w.report.report, facts: w.facts }] : []));
}

/** A picture's bytes, capped, from a report's folder; null for anything but a found file of allowed size. */
export async function readNewsMedia(week: string, name: string): Promise<Uint8Array | null> {
  if (!isNewsWeek(week) || !isMediaName(name)) return null;
  const url = `${source()}/reports/${week}/media/${name}`;
  if (url.startsWith("file:")) {
    if (!fileAllowed()) return null;
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(new URL(url)).catch(() => null);
    return bytes && bytes.byteLength <= NEWS_MEDIA_MAX_BYTES ? new Uint8Array(bytes) : null;
  }
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res?.ok || Number(res.headers.get("content-length") ?? 0) > NEWS_MEDIA_MAX_BYTES) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  return bytes.byteLength <= NEWS_MEDIA_MAX_BYTES ? bytes : null;
}
