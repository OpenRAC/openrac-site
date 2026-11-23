import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLatestVideo, shortTitle } from "./feed.ts";

const entry = (id: string, title: string, link = `https://www.youtube.com/watch?v=${id}`) =>
  `<entry><id>yt:video:${id}</id><yt:videoId>${id}</yt:videoId><title>${title}</title><link rel="alternate" href="${link}"/><published>2026-11-18T12:50:31+00:00</published></entry>`;
const feed = (...entries: string[]) => `<feed><title>OpenRAC</title><published>2026-10-08T20:00:52+00:00</published>${entries.join("")}</feed>`;

test("parseLatestVideo takes the first entry and decodes its title", () => {
  const xml = feed(entry("cJ0FL0sn_NE", "Ratchet &amp; Clank PC Port — Devlog #10"), entry("qRN9WG7ZBpM", "Devlog #9"));
  assert.deepEqual(parseLatestVideo(xml), { id: "cJ0FL0sn_NE", title: "Ratchet & Clank PC Port — Devlog #10", published: "2026-11-18T12:50:31+00:00" });
});

test("parseLatestVideo skips Shorts and broken entries", () => {
  const xml = feed(entry("aaaaaaaaaaa", "A short", "https://www.youtube.com/shorts/aaaaaaaaaaa"), entry("bad", "Bad id"), entry("qRN9WG7ZBpM", "Devlog #9"));
  assert.equal(parseLatestVideo(xml)?.id, "qRN9WG7ZBpM");
});

test("parseLatestVideo gives null for an empty or broken feed", () => {
  for (const xml of ["", "<html>error</html>", feed()]) assert.equal(parseLatestVideo(xml), null);
});

test("shortTitle drops the series name", () => {
  assert.equal(shortTitle("Ratchet & Clank PC Port — Devlog #10 | OpenRAC v1.1.0"), "Devlog #10 | OpenRAC v1.1.0");
  assert.equal(shortTitle("Devlog #10"), "Devlog #10");
  assert.equal(shortTitle("Name — "), "Name — ");
});
