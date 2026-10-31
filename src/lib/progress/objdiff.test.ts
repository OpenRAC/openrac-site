import { test } from "node:test";
import assert from "node:assert/strict";
import { parseObjdiff } from "./objdiff.ts";

test("parseObjdiff reads code, functions and data", () => {
  const p = parseObjdiff(
    { measures: { total_code: "3547932", matched_code: "3547708", total_functions: 4244, matched_functions: 4243, total_data: "12433372", matched_data: "5418333" } },
    "rac1us",
  );
  assert.deepEqual(p.code, { done: 3547708, total: 3547932 });
  assert.deepEqual(p.functions, { done: 4243, total: 4244 });
  assert.deepEqual(p.data, { done: 5418333, total: 12433372 });
});

test("parseObjdiff leaves data out when the report has none", () => {
  const p = parseObjdiff({ measures: { total_code: "100", matched_code: "10", total_functions: 4, matched_functions: 1 } }, "uya");
  assert.equal(p.data, undefined);
  assert.equal("data" in p, false);
});

test("parseObjdiff counts data with nothing matched yet as 0 %", () => {
  const p = parseObjdiff({ measures: { total_code: "100", matched_code: "10", total_functions: 4, matched_functions: 1, total_data: "383391" } }, "gc");
  assert.deepEqual(p.data, { done: 0, total: 383391 });
});

test("parseObjdiff ignores a data measure that does not add up", () => {
  const p = parseObjdiff({ measures: { total_code: "100", matched_code: "10", total_functions: 4, matched_functions: 1, total_data: "5", matched_data: "9" } }, "x");
  assert.equal(p.data, undefined);
});

test("parseObjdiff rejects a report without code", () => {
  assert.throws(() => parseObjdiff({ measures: {} }, "x"), /unexpected shape/);
});
