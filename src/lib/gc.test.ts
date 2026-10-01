import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGcReport, GC_TOTAL_CODE_FALLBACK, GC_TOTAL_UNITS_FALLBACK } from "./gc.ts";

const sampleRepositoryReport = {
  verified_at: "2026-10-01T18:51:29.877133+00:00",
  target: "SCUS_972.68",
  g1: {
    matched: true,
    bytes_compared: 2521763,
    segments: 2,
    integrated_c_functions: 26,
    integrated_c_bytes: 1076,
  },
  g3: [
    { level: "0_aranos_tutorial", integrated_c_functions: 15, integrated_c_bytes: 900 },
    { level: "1_oozla", integrated_c_functions: 15, integrated_c_bytes: 900 },
  ],
  decompiled_functions: 26,
  integrated_functions: 26,
  integrated_code_bytes: 2876,
};

const sampleObjdiffReport = {
  version: 2,
  measures: {
    totalCode: "48788176",
    matchedCode: "25312",
    totalUnits: 603,
    completeUnits: 427,
  },
};

const sampleObjdiffSnakeCase = {
  version: 2,
  measures: {
    total_code: "48788176",
    matched_code: "25312",
    total_functions: 603,
    matched_functions: 427,
    total_units: 603,
    complete_units: 427,
  },
};

test("parseGcReport parses repository progress/report.json with default fallback scope", () => {
  const p = parseGcReport(sampleRepositoryReport);
  assert.equal(p.code.done, 2876);
  assert.equal(p.code.total, GC_TOTAL_CODE_FALLBACK);
  assert.equal(p.functions.done, 56); // 26 + 15 + 15
  assert.equal(p.functions.total, GC_TOTAL_UNITS_FALLBACK);
  assert.equal(p.note, `56 of ${GC_TOTAL_UNITS_FALLBACK} units complete`);
  assert.equal(p.source, "progress/report.json");
});

test("parseGcReport computes total code and units dynamically when scope is provided", () => {
  const scope = {
    programs: [
      {
        name: "boot",
        sections: [
          { name: ".text", size: 1000, flags: 6 }, // flags & 4 is code
          { name: ".data", size: 500, flags: 2 },  // not code
        ],
      },
      {
        name: "level1",
        sections: [
          { name: ".text", size: 2000, flags: 7 }, // code
        ],
      },
    ],
  };
  const p = parseGcReport(sampleRepositoryReport, scope);
  assert.equal(p.code.done, 2876);
  assert.equal(p.code.total, 3000);
  assert.equal(p.functions.done, 56);
  assert.equal(p.functions.total, 3);
  assert.equal(p.note, "56 of 3 units complete");
});

test("parseGcReport correctly parses objdiff v2 camelCase measures", () => {
  const p = parseGcReport(sampleObjdiffReport);
  assert.equal(p.code.done, 25312);
  assert.equal(p.code.total, 48788176);
  assert.equal(p.functions.done, 427);
  assert.equal(p.functions.total, 603);
  assert.equal(p.note, "427 of 603 units complete");
});

test("parseGcReport correctly parses objdiff snake_case measures", () => {
  const p = parseGcReport(sampleObjdiffSnakeCase);
  assert.equal(p.code.done, 25312);
  assert.equal(p.code.total, 48788176);
  assert.equal(p.functions.done, 427);
  assert.equal(p.functions.total, 603);
  assert.equal(p.note, "427 of 603 units complete");
});

test("parseGcReport correctly parses JSON string", () => {
  const p = parseGcReport(JSON.stringify(sampleObjdiffReport));
  assert.equal(p.code.done, 25312);
  assert.equal(p.code.total, 48788176);
});

test("parseGcReport handles full rac2-decomp report values accurately", () => {
  // Simulating the exact values from llesieur99/rac2-decomp at RAC2
  const fullReport = {
    verified_at: "2026-10-01T18:51:29.877133+00:00",
    target: "SCUS_972.68",
    g1: {
      matched: true,
      bytes_compared: 2521763,
      segments: 2,
      integrated_c_functions: 26,
      integrated_c_bytes: 1076,
    },
    g3: Array.from({ length: 27 }, (_, i) => ({
      level: `level_${i}`,
      integrated_c_functions: [3, 5, 12, 20].includes(i) ? 14 : 15,
      integrated_c_bytes: [3, 5, 12, 20].includes(i) ? 884 : 900,
    })),
    decompiled_functions: 26,
    integrated_functions: 26,
    integrated_code_bytes: 25312,
  };

  const p = parseGcReport(fullReport);
  assert.equal(p.code.done, 25312);
  assert.equal(p.code.total, 48788176);
  assert.equal(p.functions.done, 427); // 26 + (25*15 + 2*14 = 401) = 427
  assert.equal(p.functions.total, 603);
  assert.equal(p.note, "427 of 603 units complete");
  assert.equal(p.source, "progress/report.json");
});

test("parseGcReport rejects invalid input", () => {
  assert.throws(() => parseGcReport("not valid json"), /not valid JSON/);
  assert.throws(() => parseGcReport(null), /not an object/);
  assert.throws(() => parseGcReport({}), /unexpected shape/);
  assert.throws(
    () =>
      parseGcReport({
        measures: {
          matched_code: -1,
          total_code: 100,
        },
      }),
    /unexpected shape/,
  );
  assert.throws(
    () =>
      parseGcReport({
        measures: {
          matched_code: 0,
          total_code: 0,
        },
      }),
    /unexpected shape/,
  );
});

