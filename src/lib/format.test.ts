import { test } from "node:test";
import assert from "node:assert/strict";
import { formatSize } from "./format.ts";

test("formatSize picks the unit by size", () => {
  assert.equal(formatSize(512), "512 bytes");
  assert.equal(formatSize(31_104), "31.1 KB");
  assert.equal(formatSize(545_639), "545.6 KB");
  assert.equal(formatSize(2_445_608), "2.45 MB");
  assert.equal(formatSize(5_525_916), "5.53 MB");
});
