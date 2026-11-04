import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";

// The loader keeps state on purpose (the last good copy, the breaker), so these run in order, each building on the last.
const WEEK = "2026-W44";
const root = mkdtempSync(join(tmpdir(), "news-"));
cpSync(new URL("./__fixtures__/repo", import.meta.url), root, { recursive: true });
process.env.NEWS_SOURCE_URL = pathToFileURL(root).href;
process.env.NEWS_ALLOW_FILE = "1";
const quiet = console.error;

const { getLatestReports, getNewsDay, getNewsIndex, getNewsWeek, readNewsMedia } = await import("./index.ts");

before(() => {
  console.error = () => {};
});
after(() => {
  console.error = quiet;
  rmSync(root, { recursive: true, force: true });
});

const index = join(root, "data/index.json");
const report = join(root, `reports/${WEEK}/report.json`);

test("a good source reads as fresh", async () => {
  assert.equal((await getNewsIndex())?.stale, false);
  const week = await getNewsWeek(WEEK);
  assert.equal(week?.report.status, "ok");
  assert.equal(week?.stale, false);
  assert.equal((await getLatestReports(3))?.length, 2);
  assert.equal((await getNewsDay("2026-11-03"))?.stale, false);
});

test("no report yet is normal, and a broken one is not the same thing", async () => {
  assert.equal((await getNewsWeek("2026-W43"))?.report.status, "none");
  const broken = await getNewsWeek("2026-W42");
  assert.equal(broken?.report.status, "invalid");
  assert.equal(broken?.facts.week, "2026-W42"); // and it costs the page nothing else
});

test("a report that parses but has the wrong shape is invalid too", async () => {
  mkdirSync(join(root, "reports/2026-W45"));
  writeFileSync(join(root, "reports/2026-W45/report.json"), JSON.stringify({ format: 1, week: "2026-W45" }));
  assert.equal((await getNewsWeek("2026-W45"))?.report.status, "invalid");
});

test("a report that cannot be read keeps its last copy, marked stale, and the facts still show", async () => {
  rmSync(report);
  mkdirSync(report); // reading a folder as a file: the read fails, and it is not a 404
  const week = await getNewsWeek(WEEK);
  assert.equal(week?.report.status, "ok");
  assert.equal(week?.stale, true);
  assert.equal(week?.facts.week, WEEK);
});

test("a report never read before says unavailable, not missing", async () => {
  mkdirSync(join(root, "reports/2026-W43"));
  mkdirSync(join(root, "reports/2026-W43/report.json"));
  assert.equal((await getNewsWeek("2026-W43"))?.report.status, "unavailable");
});

test("a format from the future is a failed read, not an empty list: the last copy stays", async () => {
  writeFileSync(index, JSON.stringify({ format: 2, weeks: [], days: [] }));
  const got = await getNewsIndex();
  assert.equal(got?.stale, true);
  assert.ok(got?.index.weeks.length);
});

test("a missing index serves the last copy too", async () => {
  rmSync(index);
  assert.equal((await getNewsIndex())?.stale, true);
});

test("a day that fails serves its last copy, and one never read gives null", async () => {
  rmSync(join(root, "data/days"), { recursive: true });
  assert.equal((await getNewsDay("2026-11-03"))?.stale, true);
  assert.equal(await getNewsDay("2026-11-02"), null);
});

test("bad addresses never reach the source", async () => {
  assert.equal(await getNewsWeek("../secrets"), null);
  assert.equal(await getNewsDay("../secrets"), null);
  assert.equal(await readNewsMedia(WEEK, "../../data/index.json"), null);
  assert.equal(await readNewsMedia("../x", "a.png"), null);
});

test("a picture too large is not served", async () => {
  writeFileSync(join(root, `reports/${WEEK}/media/menu.png`), Buffer.alloc(1_000_001));
  assert.equal(await readNewsMedia(WEEK, "menu.png"), null);
  assert.ok(await readNewsMedia(WEEK, "unlisted.png")); // the route, not this, checks the report lists it
});

test("over the network: 404 is missing, a server error fails, and a dead source trips the breaker", async () => {
  const real = globalThis.fetch;
  process.env.NEWS_SOURCE_URL = "https://news.example";
  let calls = 0;
  let respond: () => Response = () => new Response("nope", { status: 404 });
  globalThis.fetch = (async () => {
    calls++;
    return respond();
  }) as typeof fetch;
  try {
    assert.equal((await getNewsWeek("2026-W40")), null);
    respond = () => new Response("{ broken", { status: 200 });
    assert.equal((await getNewsWeek("2026-W39")), null);
    // A broken file says the source is up. Now it goes down: retried, then the breaker stops asking.
    respond = () => new Response("down", { status: 503 });
    for (let i = 0; i < 6; i++) await getNewsDay("2026-10-01");
    const before = calls;
    await getNewsDay("2026-10-01");
    assert.equal(calls, before, "an open breaker makes no request");
    assert.equal(await getLatestReports(1).then((r) => Array.isArray(r) || r === null), true);
  } finally {
    globalThis.fetch = real;
    process.env.NEWS_SOURCE_URL = pathToFileURL(root).href;
  }
});
