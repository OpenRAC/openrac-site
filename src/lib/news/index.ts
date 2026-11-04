import { isNextSignal } from "../mods/index.ts";
import { isNewsDay, parseFacts, parseIndex, parseReport } from "./logic.ts";
import type { NewsDay, NewsFacts, NewsReport } from "./types.ts";

/**
 * The news, read on the server from OpenRAC/openrac-news, so a new day appears without a deploy.
 * A failed read serves the last good copy this server holds; with none, callers get null and say so.
 * A report that does not exist yet is normal: most fresh days have only facts.
 */

const DEFAULT_SOURCE = "https://raw.githubusercontent.com/OpenRAC/openrac-news/main/data";
const REVALIDATE_SECONDS = 3600;
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 1_000_000;

const source = () => (process.env.NEWS_DATA_URL?.trim() || DEFAULT_SOURCE).replace(/\/$/, "");

type Read = { found: true; value: unknown } | { found: false };

/** One JSON file: found, missing (a real 404), or a throw for anything else. file: is for tests only. */
async function read(path: string): Promise<Read> {
  const url = `${source()}/${path}`;
  if (url.startsWith("file:")) {
    if (process.env.NODE_ENV !== "test" && !process.env.NEWS_ALLOW_FILE) throw new Error("file: is not allowed here");
    const { readFile } = await import("node:fs/promises");
    try {
      return { found: true, value: JSON.parse(await readFile(new URL(url), "utf8")) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return { found: false };
      throw e;
    }
  }
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) return { found: false };
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const body = await res.text();
  if (body.length > MAX_BYTES) throw new Error(`${url} is too large`);
  return { found: true, value: JSON.parse(body) };
}

let lastDays: NewsDay[] | null = null;
const lastDayData = new Map<string, { facts: NewsFacts; report: NewsReport | null }>();

/** Every day with a page, newest first; null when the list could not be read. */
export async function getNewsDays(): Promise<NewsDay[] | null> {
  try {
    const got = await read("index.json");
    if (got.found) {
      const days = parseIndex(got.value);
      if (days.length) lastDays = days;
      return lastDays ?? days;
    }
  } catch (e) {
    if (isNextSignal(e)) throw e;
    console.error("news: could not read the day list", e);
  }
  return lastDays;
}

/** One day's facts and report; null when they could not be read or the day is not a real one. */
export async function getNewsDay(day: string): Promise<{ facts: NewsFacts; report: NewsReport | null } | null> {
  if (!isNewsDay(day)) return null;
  try {
    const [facts, report] = await Promise.all([read(`${day}/facts.json`), read(`${day}/report.json`)]);
    const parsed = facts.found ? parseFacts(facts.value, day) : null;
    if (parsed) {
      const data = { facts: parsed, report: report.found ? parseReport(report.value, day) : null };
      lastDayData.set(day, data);
      return data;
    }
  } catch (e) {
    if (isNextSignal(e)) throw e;
    console.error(`news: could not read ${day}`, e);
  }
  return lastDayData.get(day) ?? null;
}

/** The newest written reports, newest first. Days that fail to load are left out. */
export async function getLatestReports(limit: number): Promise<NewsReport[]> {
  const days = (await getNewsDays()) ?? [];
  const loaded = await Promise.all(days.filter((d) => d.report).slice(0, limit).map((d) => getNewsDay(d.date)));
  return loaded.flatMap((d) => (d?.report ? [d.report] : []));
}
