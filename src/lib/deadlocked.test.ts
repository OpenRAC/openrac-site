import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDeadlockedReport } from "./deadlocked.ts";

const sampleReport = {
  measures: {
    fuzzy_match_percent: 0.0,
    total_code: "0",
    matched_code: "0",
    matched_code_percent: 0.0,
    total_functions: 0,
    matched_functions: 0,
    matched_functions_percent: 0.0,
    complete_code: "0",
    complete_code_percent: 0.0,
    total_units: 0,
    complete_units: 0,
  },
  units: [],
  version: 2,
};

const populatedReport = {
  measures: {
    fuzzy_match_percent: 2.5,
    total_code: "15420000",
    matched_code: "385500",
    matched_code_percent: 2.5,
    total_functions: 28500,
    matched_functions: 750,
    matched_functions_percent: 2.63,
    complete_code: "385500",
    complete_code_percent: 2.5,
    total_units: 140,
    complete_units: 4,
  },
  units: [],
  version: 2,
};

test("parseDeadlockedReport correctly parses initial objdiff report", () => {
  const p = parseDeadlockedReport(sampleReport);
  assert.equal(p.functions.done, 0);
  assert.equal(p.functions.total, 0);
  assert.equal(p.code.done, 0);
  assert.equal(p.code.total, 0);
  assert.equal(p.source, "progress/report.json");
  assert.equal(p.note, "Repository initialized · Analysis in progress");
});

test("parseDeadlockedReport correctly parses JSON string", () => {
  const p = parseDeadlockedReport(JSON.stringify(sampleReport));
  assert.equal(p.functions.done, 0);
  assert.equal(p.functions.total, 0);
});

test("parseDeadlockedReport correctly parses populated objdiff report", () => {
  const p = parseDeadlockedReport(populatedReport);
  assert.equal(p.functions.done, 750);
  assert.equal(p.functions.total, 28500);
  assert.equal(p.code.done, 385500);
  assert.equal(p.code.total, 15420000);
  assert.equal(p.note, "4 of 140 source files complete");
});

test("parseDeadlockedReport refuses invalid input", () => {
  assert.throws(() => parseDeadlockedReport("<html>404 Not Found</html>"), /not valid JSON/);
  assert.throws(() => parseDeadlockedReport(null), /not an object/);
  assert.throws(
    () =>
      parseDeadlockedReport({
        measures: {
          matched_functions: -1,
          total_functions: 100,
          matched_code: 50,
          total_code: 100,
        },
      }),
    /unexpected shape/,
  );
});
