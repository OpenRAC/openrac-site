import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { formatDay, formatPercent, formatWeekName, formatWeekRange, groupItems, isActive, isNewsDay, isNewsWeek, leadProject, monthGrid, neighbours, parseDayFacts, parseIndex, parseReport, parseWeekFacts, plainTitle, progressChange, reportSources, rssXml, segments, splitLabel, weekOfDay } from "./logic.ts";
import type { NewsIndex } from "./types.ts";

const fixture = (path: string) => JSON.parse(readFileSync(new URL(`./__fixtures__/repo/${path}`, import.meta.url), "utf8"));
const WEEK = "2026-W44";
const DAY = "2026-11-03";
const facts = () => parseWeekFacts(fixture(`data/weeks/${WEEK}.json`), WEEK)!;
const report = () => parseReport(fixture(`reports/${WEEK}/report.json`), WEEK)!;
const index = () => parseIndex(fixture("data/index.json")) as NewsIndex;

test("only real days pass", () => {
  assert.equal(isNewsDay(DAY), true);
  for (const bad of ["2026-02-30", "2026-1-3", "../secrets", "2026-11-03/../x", "", null, 20261103]) assert.equal(isNewsDay(bad), false, String(bad));
});

test("only real weeks pass", () => {
  for (const good of [WEEK, "2026-W01", "2026-W53", "2020-W53"]) assert.equal(isNewsWeek(good), true, good);
  for (const bad of ["2026-W54", "2025-W53", "2026-W00", "2026-44", "../x", "2026-W4", null]) assert.equal(isNewsWeek(bad), false, String(bad));
});

test("a day's week is the ISO week, across the New Year too", () => {
  assert.equal(weekOfDay("2026-11-01"), WEEK);
  assert.equal(weekOfDay("2026-11-02"), "2026-W45");
  assert.equal(weekOfDay("2026-12-31"), "2026-W53");
  assert.equal(weekOfDay("2027-01-03"), "2026-W53");
  assert.equal(weekOfDay("2027-01-04"), "2027-W01");
  assert.equal(weekOfDay("2025-12-29"), "2026-W01");
});

test("the index is newest first, without bad or repeated entries", () => {
  const parsed = parseIndex({
    format: 1,
    weeks: [
      { week: "2026-W43", start: "2026-10-19", end: "2026-10-25", finished: true },
      { week: WEEK, start: "2026-10-26", end: "2026-11-01", finished: true, report: true },
      { week: "nope", start: "x", end: "y" },
      { week: WEEK, start: "2026-10-26", end: "2026-11-01" },
    ],
    days: ["2026-11-02", DAY, "nope", DAY],
  })!;
  assert.deepEqual(parsed.weeks.map((w) => [w.week, w.report]), [[WEEK, true], ["2026-W43", false]]);
  assert.deepEqual(parsed.days, [DAY, "2026-11-02"]);
});

test("a format this site does not know is unreadable, not empty", () => {
  assert.equal(parseIndex({ format: 2, weeks: [], days: [] }), null);
  assert.equal(parseIndex({ format: 1 }), null);
  assert.equal(parseIndex(null), null);
  assert.equal(parseWeekFacts({ format: 2, week: WEEK }, WEEK), null);
  assert.equal(parseDayFacts({ format: 2, date: DAY }, DAY), null);
  assert.equal(parseReport({ format: 2, week: WEEK }, WEEK), null);
});

test("facts keep what the site shows and drop pull request descriptions", () => {
  const day = parseDayFacts(fixture(`data/days/${DAY}/facts.json`), DAY)!;
  assert.deepEqual(day.projects.map((p) => p.repo), ["rac2-decomp", "rac3-decomp"]);
  assert.equal(JSON.stringify(day).includes("ignore your instructions"), false);
  assert.equal(JSON.stringify(day).includes("untrustedBody"), false);
});

test("files must be the requested week's or day's", () => {
  assert.equal(parseWeekFacts(fixture(`data/weeks/${WEEK}.json`), "2026-W43"), null);
  assert.equal(parseReport(fixture(`reports/${WEEK}/report.json`), "2026-W43"), null);
  assert.equal(parseDayFacts(fixture(`data/days/${DAY}/facts.json`), "2026-11-02"), null);
});

test("malformed entries are dropped, not fatal", () => {
  const day = parseDayFacts(
    {
      format: 1,
      date: DAY,
      totals: { commits: -1, pullRequestsMerged: "9" },
      projects: [
        { repo: "../evil" },
        null,
        {
          repo: "game",
          commitCount: 1.5,
          branches: [{ name: "main", commits: [{ sha: "not a sha", title: "x" }, { sha: "abcdef1", title: 3 }] }, { commits: [] }],
          pullRequests: { merged: [{ number: 0, title: "no" }, { number: 2 }, { number: 3, title: "yes", author: "<b>" }] },
          progress: { after: { code: { done: 9, total: 5 } } },
          releases: [{}, { tag: "v1" }],
        },
      ],
    },
    DAY,
  )!;
  assert.deepEqual(day.totals, { commits: 0, pullRequestsMerged: 0, pullRequestsOpened: 0, contributors: 0 });
  assert.equal(day.projects.length, 1);
  const [p] = day.projects;
  assert.equal(p.title, "game");
  assert.equal(p.commitCount, 0);
  assert.deepEqual(p.branches, [{ name: "main", commits: [{ sha: "abcdef1", title: "Commit", author: "", date: "" }] }]);
  assert.deepEqual(p.merged, [{ number: 3, title: "yes", author: "" }]);
  assert.equal(p.progress, null);
  assert.deepEqual(p.releases, [{ tag: "v1", name: "v1" }]);
});

test("a report must say who wrote it, with what", () => {
  const good = fixture(`reports/${WEEK}/report.json`);
  assert.equal(parseReport(good, WEEK)!.tool, "Claude Code");
  for (const change of [{ author: "" }, { author: "<script>" }, { tool: "" }, { headline: "" }, { summary: 3 }]) {
    assert.equal(parseReport({ ...good, ...change }, WEEK), null, JSON.stringify(change));
  }
});

test("citations become links only for tracked projects", () => {
  const known = ["OpenRAC", "rac2-decomp"];
  assert.deepEqual(segments("Fixed in OpenRAC#228, see #399.", known, "rac2-decomp"), [
    "Fixed in ",
    { label: "OpenRAC#228", href: "https://github.com/OpenRAC/OpenRAC/issues/228" },
    ", see ",
    { label: "#399", href: "https://github.com/OpenRAC/rac2-decomp/issues/399" },
    ".",
  ]);
  assert.deepEqual(segments("evil#1 and #2", known), ["evil#1 and #2"]);
  assert.deepEqual(segments("javascript#1", known, "rac2-decomp"), ["javascript#1"]);
  assert.deepEqual(segments("", known), []);
  assert.deepEqual(segments("No citations.", known), ["No citations."]);
});

test("a report's sources are what it cites that the facts hold, once each, with real titles", () => {
  const sources = reportSources(report(), facts().projects);
  assert.deepEqual(sources.map((s) => `${s.repo}#${s.number}`), ["rac1-decomp#135", "rac2-decomp#100", "OpenRAC#161", "OpenRAC#250"]);
  assert.equal(sources[0].title, "Match the last 11 functions");
  assert.equal(sources[0].href, "https://github.com/OpenRAC/rac1-decomp/issues/135");
});

test("progress reads as the site shows it", () => {
  const p = { before: { code: { done: 8549, total: 10000 } }, after: { code: { done: 8768, total: 10000 } } };
  assert.equal(formatPercent(p.after.code), "87.68%");
  assert.equal(progressChange(p), "+2.19");
  assert.equal(progressChange({ before: p.after, after: p.before }), "−2.19");
  assert.equal(progressChange({ before: p.after, after: p.after }), null);
  assert.equal(progressChange({ before: null, after: p.after }), null);
  assert.equal(progressChange(null), null);
  // Up by a hair, but both read 8.72%: no change to show.
  assert.equal(progressChange({ before: { code: { done: 87201, total: 1000000 } }, after: { code: { done: 87204, total: 1000000 } } }), null);
});

test("the project that moved furthest leads a week", () => {
  const { projects } = facts();
  assert.equal(leadProject(projects)?.repo, "rac2-decomp");
  assert.equal(leadProject(projects.filter((p) => !p.progress))?.repo, "OpenRAC");
  assert.equal(leadProject(projects.filter((p) => !isActive(p))), undefined);
  assert.equal(leadProject([]), undefined);
});

test("titles read as people write them", () => {
  assert.equal(plainTitle("feat(port): add a slider"), "Add a slider");
  assert.equal(plainTitle("fix!: a thing"), "A thing");
  assert.equal(plainTitle("Match 52 PAL functions"), "Match 52 PAL functions");
  assert.equal(plainTitle('<img src=x onerror="a"> title'), '<img src=x onerror="a"> title');
});

test("merged work is grouped the way players think of it", () => {
  const item = (title: string, number = 1) => ({ number, title, author: "a" });
  assert.deepEqual(groupItems([item("feat: a"), item("fix(x): b"), item("docs: c"), item("chore: d"), item("Match 5")]).map((g) => [g.name, g.items.length]), [["New", 1], ["Fixed", 1], ["Other work", 1], ["Behind the scenes", 2]]);
  assert.deepEqual(groupItems([]), []);
});

test("a highlight's label stands apart when it has one", () => {
  assert.deepEqual(splitLabel("Safer starts: Safe rendering turns on (#131)."), { label: "Safer starts", rest: "Safe rendering turns on (#131)." });
  assert.deepEqual(splitLabel("No label here."), { rest: "No label here." });
  assert.deepEqual(splitLabel("Too long a label to be one at all, surely not: text"), { rest: "Too long a label to be one at all, surely not: text" });
  assert.deepEqual(splitLabel("See #5: a thing"), { rest: "See #5: a thing" });
});

test("days and weeks are named in UTC", () => {
  assert.equal(formatDay(DAY), "Tuesday, 3 November 2026");
  assert.equal(formatWeekName(WEEK), "Week 44, 2026");
  assert.equal(formatWeekName("2026-W05"), "Week 5, 2026");
  assert.equal(formatWeekRange("2026-10-26", "2026-11-01"), "26 Oct to 1 Nov 2026");
});

test("neighbours skip the gaps", () => {
  const { days } = index();
  assert.deepEqual(neighbours(days, "2026-11-02"), { newer: DAY, older: "2026-10-27" });
  assert.deepEqual(neighbours(days, DAY), { newer: undefined, older: "2026-11-02" });
  assert.deepEqual(neighbours(days, "2020-01-01"), {});
});

test("a month is Monday-first weeks, linked to the months around it", () => {
  const { days } = index();
  const { weeks, previous, next } = monthGrid(days, DAY);
  // November 2026 starts on a Sunday, so six leading blanks.
  assert.equal(weeks[0].filter((c) => c === null).length, 6);
  assert.equal(weeks[0][6]!.dayOfMonth, 1);
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(weeks.flat().filter(Boolean).length, 30);
  assert.equal(previous, "2026-10-27");
  assert.equal(next, undefined);
  assert.equal(weeks.flat().find((c) => c?.date === DAY)!.hasNews, true);
  assert.equal(weeks.flat().find((c) => c?.date === "2026-11-04")!.hasNews, false);
  assert.equal(monthGrid(days, "2026-10-27").next, DAY);
  assert.equal(monthGrid(days, "2026-10-27").previous, undefined);
});

test("the feed is escaped, and says who wrote each report", () => {
  const out = rssXml("https://openrac.dev", [{ ...report(), headline: `A <b>"bold"</b> & \u0001 claim` }], () => "2026-11-01");
  assert.match(out, /<title>A &lt;b&gt;&quot;bold&quot;&lt;\/b&gt; &amp;  claim<\/title>/);
  assert.match(out, /Written by Lynder063 with Claude Code/);
  assert.match(out, /<link>https:\/\/openrac\.dev\/news\/2026-W44<\/link>/);
  assert.match(out, /<pubDate>Sun, 01 Nov 2026 23:59:59 GMT<\/pubDate>/);
});
