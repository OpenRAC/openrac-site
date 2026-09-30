import { test } from "node:test";
import assert from "node:assert/strict";
import { byNewest, readingMinutes, toMeta, xmlEscape } from "./blog-parse.ts";

const ok = { title: "Hello", summary: "A post", date: "2026-09-30" };

test("toMeta accepts valid front matter and normalises it", () => {
  const m = toMeta("hello-world", { ...ok, tags: ["news", " ", "progress"], author: " Me " });
  assert.deepEqual(m, { slug: "hello-world", title: "Hello", summary: "A post", date: "2026-09-30", tags: ["news", "progress"], author: "Me", draft: false });
});

test("toMeta turns a YAML date into an ISO string", () => {
  assert.equal(toMeta("a", { ...ok, date: new Date("2026-01-02T00:00:00Z") }).date, "2026-01-02");
});

test("toMeta names the file when something is wrong", () => {
  assert.throws(() => toMeta("Bad Name", ok), /content\/blog\/Bad Name\.md: file name/);
  assert.throws(() => toMeta("a", { ...ok, title: "" }), /needs a `title`/);
  assert.throws(() => toMeta("a", { ...ok, summary: undefined }), /needs a `summary`/);
  assert.throws(() => toMeta("a", { ...ok, date: "yesterday" }), /needs a `date`/);
  assert.throws(() => toMeta("a", { ...ok, date: "2026-13-45" }), /needs a `date`/);
});

test("drafts are flagged only by an explicit true", () => {
  assert.equal(toMeta("a", { ...ok, draft: true }).draft, true);
  assert.equal(toMeta("a", { ...ok, draft: "yes" }).draft, false);
});

test("readingMinutes ignores code blocks and is at least one", () => {
  assert.equal(readingMinutes("short"), 1);
  assert.equal(readingMinutes("word ".repeat(600)), 3);
  assert.equal(readingMinutes("```\n" + "code ".repeat(2000) + "\n```\nhi"), 1);
});

test("byNewest sorts by date, newest first", () => {
  const p = (slug: string, date: string) => toMeta(slug, { ...ok, date });
  const sorted = [p("a", "2026-01-01"), p("b", "2026-03-01"), p("c", "2026-02-01")].sort(byNewest).map((x) => x.slug);
  assert.deepEqual(sorted, ["b", "c", "a"]);
});

test("xmlEscape escapes markup characters", () => {
  assert.equal(xmlEscape(`Tom & "Jerry" <b>'x'</b>`), "Tom &amp; &quot;Jerry&quot; &lt;b&gt;&apos;x&apos;&lt;/b&gt;");
});
