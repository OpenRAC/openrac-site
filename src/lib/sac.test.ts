import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSacBodies, parseSacReport } from "./sac.ts";

test("parseSacBodies calculates unique proved body sources and deduplicated candidate scope", () => {
  const levelsTsv = "module\toffset\tsize\tsource\nFE.REL\t0x001000\t100\tsrc/levels/bodies/func_a.c\nLEVEL1.REL\t0x002000\t100\tsrc/levels/bodies/func_a.c\n";
  const bootTsv = "module\toffset\tsize\tsource\nSCUS_976.23\t0x00100280\t50\tsrc/boot/bodies/func_b.c\n";
  const levelsSummary = { relocation_masked_candidate_bytes: 1000 };
  const bootSummary = { bounded_candidate_body_bytes: 500 };

  const p = parseSacBodies(levelsTsv, bootTsv, levelsSummary, bootSummary);
  assert.equal(p.code.done, 150); // func_a (100) counted once + func_b (50)
  assert.equal(p.code.total, 1500); // 1000 + 500
  assert.equal(p.functions.done, 2); // 2 unique sources
  assert.equal(p.functions.total, null);
  assert.equal(p.source, "config/levels/bodies.tsv");
});

test("parseSacReport handles objdiff v2 report measures", () => {
  const report = {
    version: 2,
    measures: {
      fuzzy_match_percent: 0.42726213762939846,
      total_code: "7279840",
      matched_code: "31104",
      matched_code_percent: 0.42726213762939846,
      total_functions: 427,
      matched_functions: 395,
      matched_functions_percent: 92.50585480093677,
    },
  };
  const p = parseSacReport(report);
  assert.equal(p.code.done, 31104);
  assert.equal(p.code.total, 7279840);
  assert.equal(p.functions.done, 395);
  assert.equal(p.functions.total, 427);
  assert.equal(p.source, "progress/report.json");
});

test("parseSacReport handles status and report shapes", () => {
  const report = {
    functions: { done: 10, total: 100 },
    code: { done: 500, total: 2000 },
  };
  const p = parseSacReport(report);
  assert.equal(p.code.done, 500);
  assert.equal(p.code.total, 2000);
  assert.equal(p.functions.done, 10);
  assert.equal(p.functions.total, 100);

  const status = {
    bytes_by_source_and_module: 31104,
    relocation_masked_candidate_bytes: 6628908,
    boot_candidate_bytes: 563872,
    sources: 395,
  };
  const p2 = parseSacReport(status);
  assert.equal(p2.code.done, 31104);
  assert.equal(p2.code.total, 7192780);
  assert.equal(p2.functions.done, 395);
  assert.equal(p2.functions.total, null);
});

test("parseSacBodies rejects invalid or empty input", () => {
  assert.throws(() => parseSacBodies("", ""), /sac progress could not be computed/);
});
