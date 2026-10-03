import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGmReadme, GM_TOTAL_CODE_BYTES } from "./gm.ts";

const SAMPLE_README = `# Ratchet & Clank: Going Mobile v1.1.0 — reconstructed Java source

This repository contains a readable Java reconstruction and the mapping/configuration used to reproduce the target class-file output.

## Verified output

The included ten-source set was freshly built and checked on 2026-10-03. The run produced **351/351 methods EXACT** and **10/10 class files byte-identical** to both the retail reference and the recorded production-v4 output.
`;

test("parseGmReadme parses README with exact matches correctly", () => {
  const p = parseGmReadme(SAMPLE_README);
  assert.equal(p.functions.done, 351);
  assert.equal(p.functions.total, 351);
  assert.equal(p.code.done, GM_TOTAL_CODE_BYTES);
  assert.equal(p.code.total, GM_TOTAL_CODE_BYTES);
  assert.equal(p.note, "10 of 10 class files byte-identical · 351/351 methods exact");
  assert.equal(p.source, "README.md");
});

test("parseGmReadme calculates partial matches proportionally", () => {
  const partial = "The run produced **100/200 methods EXACT** and **5/10 class files byte-identical**";
  const p = parseGmReadme(partial);
  assert.equal(p.functions.done, 100);
  assert.equal(p.functions.total, 200);
  assert.equal(p.code.done, Math.round(GM_TOTAL_CODE_BYTES * 0.5));
  assert.equal(p.code.total, GM_TOTAL_CODE_BYTES);
  assert.equal(p.note, "5 of 10 class files byte-identical · 100/200 methods exact");
});

test("parseGmReadme rejects empty or invalid text", () => {
  assert.throws(() => parseGmReadme(""), /empty or invalid/);
  assert.throws(() => parseGmReadme("Just some random text with no metrics"), /could not be parsed/);
});
