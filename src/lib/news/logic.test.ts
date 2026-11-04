import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { formatDay, formatPercent, isActive, isNewsDay, monthGrid, neighbours, parseFacts, parseIndex, parseReport, progressChange, rssXml, segments } from "./logic.ts";

const fixture = (path: string) => JSON.parse(readFileSync(new URL(`./__fixtures__/data/${path}`, import.meta.url), "utf8"));
const DAY = "2026-11-03";

test("only real days pass", () => {
  assert.equal(isNewsDay(DAY), true);
  for (const bad of ["2026-02-30", "2026-1-3", "../secrets", "2026-11-03/../x", "", null, 20261103]) assert.equal(isNewsDay(bad), false, String(bad));
});

test("the day list is newest first, without bad or repeated days", () => {
  const days = parseIndex({ format: 1, days: [{ date: "2026-11-02", report: false }, { date: DAY, report: true }, { date: "nope" }, { date: DAY }, "x"] });
  assert.deepEqual(days, [{ date: DAY, report: true }, { date: "2026-11-02", report: false }]);
});

test("a format this site does not know gives nothing", () => {
  assert.deepEqual(parseIndex({ format: 2, days: [{ date: DAY }] }), []);
  assert.equal(parseFacts({ format: 2, date: DAY }, DAY), null);
  assert.equal(parseReport({ format: 2, date: DAY }, DAY), null);
  assert.deepEqual(parseIndex(null), []);
});

test("facts keep what the site shows and drop pull request descriptions", () => {
  const facts = parseFacts(fixture(`${DAY}/facts.json`), DAY)!;
  assert.equal(facts.totals.commits, 3);
  assert.deepEqual(facts.projects.map((p) => p.repo), ["OpenRAC", "rac2-decomp", "rac3-decomp"]);
  assert.equal(JSON.stringify(facts).includes("ignore your instructions"), false);
  assert.equal(JSON.stringify(facts).includes("untrustedBody"), false);
});

test("facts must be the requested day's", () => {
  assert.equal(parseFacts(fixture(`${DAY}/facts.json`), "2026-11-02"), null);
  assert.equal(parseReport(fixture(`${DAY}/report.json`), "2026-11-02"), null);
});

test("malformed entries are dropped, not fatal", () => {
  const facts = parseFacts(
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
  assert.deepEqual(facts.totals, { commits: 0, pullRequestsMerged: 0, pullRequestsOpened: 0, contributors: 0 });
  assert.equal(facts.projects.length, 1);
  const [p] = facts.projects;
  assert.equal(p.title, "game");
  assert.equal(p.commitCount, 0);
  assert.deepEqual(p.branches, [{ name: "main", commits: [{ sha: "abcdef1", title: "Commit", author: "", date: "" }] }]);
  assert.deepEqual(p.merged, [{ number: 3, title: "yes", author: "" }]);
  assert.equal(p.progress, null);
  assert.deepEqual(p.releases, [{ tag: "v1", name: "v1" }]);
});

test("a report must say who wrote it, with what", () => {
  const good = fixture(`${DAY}/report.json`);
  assert.equal(parseReport(good, DAY)!.tool, "Claude Code");
  for (const change of [{ author: "" }, { author: "<script>" }, { tool: "" }, { headline: "" }, { summary: 3 }]) {
    assert.equal(parseReport({ ...good, ...change }, DAY), null, JSON.stringify(change));
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

test("totals come through unchanged, and a project with no activity reads as inactive", () => {
  const facts = parseFacts(fixture(`${DAY}/facts.json`), DAY)!;
  assert.deepEqual(facts.totals, { commits: 3, pullRequestsMerged: 2, pullRequestsOpened: 1, contributors: 2 });
  assert.equal(isActive(facts.projects[2]), false);
  assert.equal(isActive(facts.projects[0]), true);
});

test("days are named in UTC", () => {
  assert.equal(formatDay(DAY), "Tuesday, 3 November 2026");
  assert.equal(formatDay("2026-11-01"), "Sunday, 1 November 2026");
});

test("neighbouring days skip the gaps", () => {
  const days = parseIndex(fixture("index.json"));
  assert.deepEqual(neighbours(days, "2026-11-02"), { newer: DAY, older: "2026-10-31" });
  assert.deepEqual(neighbours(days, DAY), { newer: undefined, older: "2026-11-02" });
  assert.deepEqual(neighbours(days, "2020-01-01"), {});
});

test("a month is Monday-first weeks, linked to the months around it", () => {
  const days = parseIndex(fixture("index.json"));
  const { weeks, previous, next } = monthGrid(days, DAY);
  // November 2026 starts on a Sunday, so six leading blanks.
  assert.equal(weeks[0].filter((c) => c === null).length, 6);
  assert.equal(weeks[0][6]!.dayOfMonth, 1);
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(weeks.flat().filter(Boolean).length, 30);
  assert.equal(previous, "2026-10-31");
  assert.equal(next, undefined);
  assert.equal(weeks.flat().find((c) => c?.date === DAY)!.news!.report, true);
  assert.equal(weeks.flat().find((c) => c?.date === "2026-11-04")!.news, undefined);
  assert.equal(monthGrid(days, "2026-10-31").next, DAY);
  assert.equal(monthGrid(days, "2026-10-31").previous, undefined);
});

test("the feed is escaped, and says who wrote each report", () => {
  const report = parseReport(fixture(`${DAY}/report.json`), DAY)!;
  const out = rssXml("https://openrac.dev", [{ ...report, headline: `A <b>"bold"</b> & \u0001 claim` }]);
  assert.match(out, /<title>A &lt;b&gt;&quot;bold&quot;&lt;\/b&gt; &amp;  claim<\/title>/);
  assert.match(out, /Written by Lynder063 with Claude Code/);
  assert.match(out, /<link>https:\/\/openrac\.dev\/news\/2026-11-03<\/link>/);
  assert.match(out, /<pubDate>Tue, 03 Nov 2026 23:59:59 GMT<\/pubDate>/);
});
