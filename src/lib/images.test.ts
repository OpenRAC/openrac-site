import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveImage } from "./images.ts";

test("resolveImage serves only the backdrops the cards ask for", () => {
  assert.deepEqual(resolveImage("rac1-bg.webp", "/data/img"), { file: "/data/img/rac1-bg.webp", type: "image/webp" });
  assert.equal(resolveImage("gc-bg.webp", "/d")?.file, "/d/gc-bg.webp");
});

test("resolveImage refuses anything else, including path tricks", () => {
  for (const n of ["", "other.webp", "../package.json", "..%2Fpackage.json", "rac1-bg.webp/../../etc/passwd", "/etc/passwd", "rac1-bg.webp\0.png", "RAC1-BG.WEBP", "rac1-bg.png"])
    assert.equal(resolveImage(n, "/data/img"), null, JSON.stringify(n));
});
