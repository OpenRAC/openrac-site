import { test } from "node:test";
import assert from "node:assert/strict";
import { homeLd, ldJson, llmsFullTxt, llmsTxt, postLd, progressJson } from "./machine.ts";
import { PROJECTS } from "./projects.ts";

const SITE = "https://openrac.dev";
const progress = {
  rac1: { functions: { done: 2974, total: 5109 }, code: { done: 838628, total: 3712808 }, source: "progress/report.json", stale: false },
  gc: { functions: { done: 5269, total: null }, code: { done: 308608, total: 48788176 }, source: "snapshot 2026-10-05", stale: true },
};
const post = { slug: "welcome", title: "Welcome", date: "2026-09-30", summary: "What this blog is for.", body: "## How we count\n\nText." };

test("progress.json lists every project with the shared measure", () => {
  const j = progressJson(progress);
  assert.equal(j.projects.length, PROJECTS.length);
  const rac1 = j.projects.find((p) => p.id === "rac1")!;
  assert.equal(rac1.repository, "https://github.com/OpenRAC/rac1-decomp");
  assert.equal(rac1.region, "PAL");
  assert.deepEqual(rac1.maintainers, ["Lynder063", "Veradictus"]);
  assert.equal(rac1.progress?.codePercent, 22.59);
  assert.equal(j.projects.find((p) => p.id === "gc")!.progress?.functions.total, null);
  assert.equal(j.projects.find((p) => p.id === "gc")!.progress?.snapshot, true);
  assert.equal(j.projects.find((p) => p.id === "deadlocked")!.phase, "research");
  assert.equal(j.projects.find((p) => p.id === "uya")!.progress, null); // not loaded: no invented numbers
});

test("llms.txt names every project, its numbers and the posts", () => {
  const t = llmsTxt(SITE, progress, [post]);
  assert.match(t, /^# OpenRAC\n\n> /);
  for (const p of PROJECTS) if (p.repo) assert.ok(t.includes(`https://github.com/${p.repo}`), p.id);
  assert.ok(t.includes("22.59% of code matched (838,628 of 3,712,808 bytes)."));
  assert.ok(t.includes("last known snapshot"));
  assert.ok(t.includes("research phase"));
  assert.ok(t.includes("Maintained by [@Lynder063](https://github.com/Lynder063), [@Veradictus](https://github.com/Veradictus)."));
  assert.ok(t.includes(`[Welcome](${SITE}/blog/welcome) (2026-09-30): What this blog is for.`));
});

test("llms-full.txt carries the FAQ and posts, with post headings nested under the post", () => {
  const t = llmsFullTxt(SITE, progress, [post], [["Is this a port?", "No."]]);
  assert.ok(t.includes("### Is this a port?\n\nNo."));
  assert.ok(t.includes("### Welcome\n\n"));
  assert.ok(t.includes("\n#### How we count\n"));
});

test("JSON-LD describes the projects and cannot close its script tag", () => {
  const home = homeLd(SITE);
  const list = home["@graph"][1] as { itemListElement: unknown[] };
  assert.equal(list.itemListElement.length, PROJECTS.filter((p) => p.repo).length);
  assert.equal(postLd(SITE, post).headline, "Welcome");
  assert.ok(!ldJson({ x: "</script><script>alert(1)</script>" }).includes("<"));
});
