import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUyaReport } from "./uya.ts";

const sampleReport = {
  measures: {
    fuzzy_match_percent: 1.283331,
    total_code: "12838776",
    matched_code: "164764",
    matched_code_percent: 1.283331,
    total_data: "9092235",
    matched_data: "3280",
    matched_data_percent: 0.03607474,
    total_functions: 31316,
    matched_functions: 1292,
    matched_functions_percent: 4.1256866,
    total_units: 114,
  },
  units: [],
  version: 2,
};

test("parseUyaReport correctly parses valid objdiff report object", () => {
  const p = parseUyaReport(sampleReport);
  assert.equal(p.functions.done, 1292);
  assert.equal(p.functions.total, 31316);
  assert.equal(p.code.done, 164764);
  assert.equal(p.code.total, 12838776);
  assert.equal(p.source, "decomp.dev");
});

test("parseUyaReport correctly parses JSON string", () => {
  const p = parseUyaReport(JSON.stringify(sampleReport));
  assert.equal(p.functions.done, 1292);
  assert.equal(p.functions.total, 31316);
  assert.equal(p.code.done, 164764);
  assert.equal(p.code.total, 12838776);
});

test("parseUyaReport refuses input it does not understand", () => {
  assert.throws(() => parseUyaReport("<html>404 Not Found</html>"), /not valid JSON/);
  assert.throws(() => parseUyaReport(null), /not an object/);
  assert.throws(() => parseUyaReport({}), /unexpected shape/);
  assert.throws(
    () =>
      parseUyaReport({
        measures: {
          matched_functions: -1,
          total_functions: 100,
          matched_code: 50,
          total_code: 100,
        },
      }),
    /unexpected shape/,
  );
  assert.throws(
    () =>
      parseUyaReport({
        measures: {
          matched_functions: 0,
          total_functions: 0,
          matched_code: 0,
          total_code: 0,
        },
      }),
    /unexpected shape/,
  );
});
