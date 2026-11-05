import { test } from "node:test";
import assert from "node:assert/strict";
import { byteRange, resolveImage } from "./images.ts";

test("resolveImage serves only the backdrops the cards ask for", () => {
  assert.deepEqual(resolveImage("rac1-bg.webp", "/data/img"), { file: "/data/img/rac1-bg.webp", type: "image/webp" });
  assert.equal(resolveImage("gc-bg.webp", "/d")?.file, "/d/gc-bg.webp");
  assert.equal(resolveImage("uya-bg.webp", "/d")?.file, "/d/uya-bg.webp");
  assert.equal(resolveImage("deadlocked-bg.webp", "/d")?.file, "/d/deadlocked-bg.webp");
  assert.equal(resolveImage("going-mobile-bg.webp", "/d")?.file, "/d/going-mobile-bg.webp");
  assert.equal(resolveImage("size-matters-bg.webp", "/d")?.file, "/d/size-matters-bg.webp");
  assert.equal(resolveImage("sac-bg.webp", "/d")?.file, "/d/sac-bg.webp");
});

test("resolveImage refuses anything else, including path tricks", () => {
  for (const n of ["", "other.webp", "../package.json", "..%2Fpackage.json", "rac1-bg.webp/../../etc/passwd", "/etc/passwd", "rac1-bg.webp\0.png", "RAC1-BG.WEBP", "rac1-bg.png"])
    assert.equal(resolveImage(n, "/data/img"), null, JSON.stringify(n));
});

test("resolveImage serves the home page's clips with their video types", () => {
  assert.deepEqual(resolveImage("hero-rac1-kerwan-1080.mp4", "/d"), { file: "/d/hero-rac1-kerwan-1080.mp4", type: "video/mp4" });
  assert.equal(resolveImage("hero-rac1-gaspar-1080.webm", "/d")?.type, "video/webm");
  assert.equal(resolveImage("hero-rac1-gaspar.webp", "/d")?.type, "image/webp");
  assert.equal(resolveImage("hero-rac1-gaspar-720.mp4", "/d"), null);
});

test("byteRange reads the ranges a video player asks for", () => {
  assert.deepEqual(byteRange("bytes=0-", 100), { start: 0, end: 99 });
  assert.deepEqual(byteRange("bytes=10-19", 100), { start: 10, end: 19 });
  assert.deepEqual(byteRange("bytes=90-500", 100), { start: 90, end: 99 });
  assert.deepEqual(byteRange("bytes=-10", 100), { start: 90, end: 99 });
  for (const h of [null, "", "bytes=-", "bytes=100-", "bytes=20-10", "items=0-1", "bytes=0-1,5-6"]) assert.equal(byteRange(h, 100), null, String(h));
});
