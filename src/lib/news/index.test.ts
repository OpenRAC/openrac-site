import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

const WEEK = "2026-W44";
const root = mkdtempSync(join(tmpdir(), "news-"));
cpSync(new URL("./__fixtures__/repo", import.meta.url), root, { recursive: true });
process.env.NEWS_DIR = root;
const quiet = console.error;

const { getLatestReports, getNewsDay, getNewsIndex, getNewsWeek } = await import("./index.ts");

before(() => {
  console.error = () => {};
});
after(() => {
  console.error = quiet;
  rmSync(root, { recursive: true, force: true });
});

const indexFile = join(root, "data/index.json");

test("only finished weeks count, and their days", async () => {
  const index = (await getNewsIndex())!;
  assert.ok(!index.weeks.some((w) => w.week === "2026-W46"));
  assert.ok(index.weeks.some((w) => w.week === WEEK));
});

test("whether a week has a report comes from the file, not the list", async () => {
  const index = (await getNewsIndex())!;
  assert.equal(index.weeks.find((w) => w.week === WEEK)?.report, true);
  assert.equal(index.weeks.find((w) => w.week === "2026-W43")?.report, false);
  mkdirSync(join(root, "reports/2026-W43"));
  writeFileSync(join(root, "reports/2026-W43/report.json"), "{}");
  assert.equal((await getNewsIndex())!.weeks.find((w) => w.week === "2026-W43")?.report, true);
  rmSync(join(root, "reports/2026-W43"), { recursive: true });
});

test("a good week reads whole", async () => {
  const week = await getNewsWeek(WEEK);
  assert.equal(week?.report.status, "ok");
  assert.equal((await getLatestReports(3)).length, 2);
  assert.equal((await getNewsDay("2026-11-03"))?.date, "2026-11-03");
});

test("no report yet and a broken report are told apart, and neither costs the facts", async () => {
  assert.equal((await getNewsWeek("2026-W43"))?.report.status, "none");
  const broken = await getNewsWeek("2026-W42");
  assert.equal(broken?.report.status, "invalid");
  assert.equal(broken?.facts.week, "2026-W42");
});

test("a report of the wrong shape, or one that cannot be read, is invalid", async () => {
  mkdirSync(join(root, "reports/2026-W45"));
  writeFileSync(join(root, "reports/2026-W45/report.json"), JSON.stringify({ format: 1, week: "2026-W45" }));
  assert.equal((await getNewsWeek("2026-W45"))?.report.status, "invalid");
  rmSync(join(root, "reports/2026-W45/report.json"));
  mkdirSync(join(root, "reports/2026-W45/report.json")); // a folder where the file should be: not simply missing
  assert.equal((await getNewsWeek("2026-W45"))?.report.status, "invalid");
});

test("bad addresses never reach the files", async () => {
  assert.equal(await getNewsWeek("../secrets"), null);
  assert.equal(await getNewsDay("../secrets"), null);
});

test("a day or week with no facts is null", async () => {
  assert.equal(await getNewsDay("2020-01-01"), null);
  assert.equal(await getNewsWeek("2020-W01"), null);
});

test("a data format from the future is no list, not a crash", async () => {
  writeFileSync(indexFile, JSON.stringify({ format: 2, weeks: [], days: [] }));
  assert.equal(await getNewsIndex(), null);
  assert.deepEqual(await getLatestReports(3), []);
});

test("no news folder at all is no list, not a crash", async () => {
  rmSync(join(root, "data"), { recursive: true });
  assert.equal(await getNewsIndex(), null);
  assert.deepEqual(await getLatestReports(3), []);
});
