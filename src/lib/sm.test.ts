import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSmStatus } from "./sm.ts";
import { percent } from "./types.ts";

/** The shape of the project's own progress/status.json, with its real numbers. */
const sampleStatus = {
  format: "rac5-scoped-progress-v1",
  target: "SCUS_976.15",
  status: "partial_verified",
  overall_percent: null,
  bytematch_objdiff_ready: false,
  boot: {
    code_bytes: 498900,
    accepted_c_bytes: 87228,
    accepted_functions: ["MEMCARD_Idle__Fv", "MC_SetError__Fi"],
    scoped_code_percent: 17.48406494,
  },
  levels: {
    placements: [
      { module: "FRONTEND.REL", candidate_code_bytes_by_placement: 162944, accepted_c_bytes: 476 },
      { module: "LEVEL_01.REL", candidate_code_bytes_by_placement: 2027776, accepted_c_bytes: 80 },
    ],
    accepted_c_bytes_per_unique_source: 80,
    accepted_frontend_functions: ["func_00002F80"],
    accepted_shared_functions: ["func_00000100", "func_shared_zero_buffer"],
    accepted_level_body_unique_source_bytes: 530536,
    accepted_level_body_unique_sources: 8884,
  },
  optimistic_shape_scenario: { masked_max_per_module_bytes: 5756360 },
};

const legacySampleStatus = {
  ...sampleStatus,
  levels: {
    placements: sampleStatus.levels.placements,
    accepted_c_bytes_per_unique_source: 80,
    accepted_frontend_functions: ["func_00002F80"],
    accepted_shared_functions: ["func_00000100", "func_shared_zero_buffer"],
  },
};

test("parseSmStatus counts the three scopes the snapshot measures", () => {
  const p = parseSmStatus(sampleStatus);
  // 87,228 boot + 476 frontend + 80 shared level functions + 530,536 accepted level bodies.
  assert.equal(p.code.done, 618320);
  // 498,900 boot .text + 162,944 frontend + 5,756,360 optimistic level shapes.
  assert.equal(p.code.total, 6418204);
  assert.equal(p.source, "progress/status.json");

  // Legacy snapshot without accepted level bodies
  const pLegacy = parseSmStatus(legacySampleStatus);
  assert.equal(pLegacy.code.done, 87784);
  assert.equal(pLegacy.code.total, 6418204);
});

test("the Size Matters percentage is the one ByteMatch shows", () => {
  const p = parseSmStatus(sampleStatus);
  assert.equal(percent(p.code).toFixed(2), "9.63");

  const pLegacy = parseSmStatus(legacySampleStatus);
  assert.equal(percent(pLegacy.code).toFixed(2), "1.37");
});

test("parseSmStatus counts the accepted functions and claims no total", () => {
  const p = parseSmStatus(sampleStatus);
  assert.deepEqual(p.functions, { done: 8889, total: null });

  const pLegacy = parseSmStatus(legacySampleStatus);
  assert.deepEqual(pLegacy.functions, { done: 5, total: null });
});

test("parseSmStatus correctly parses JSON string", () => {
  const p = parseSmStatus(JSON.stringify(sampleStatus));
  assert.equal(p.code.done, 618320);
  assert.equal(p.code.total, 6418204);
});

test("parseSmStatus refuses input it does not understand", () => {
  assert.throws(() => parseSmStatus("<html>404 Not Found</html>"), /not valid JSON/);
  assert.throws(() => parseSmStatus(null), /not an object/);
  assert.throws(() => parseSmStatus({}), /unexpected format/);
  assert.throws(() => parseSmStatus({ ...sampleStatus, format: "something-else" }), /unexpected format/);
});

test("an incomplete snapshot cannot produce a misleading number", () => {
  assert.throws(() => parseSmStatus({ ...sampleStatus, boot: undefined }), /unexpected shape/);
  assert.throws(() => parseSmStatus({ ...sampleStatus, levels: undefined }), /unexpected shape/);
  assert.throws(() => parseSmStatus({ ...sampleStatus, optimistic_shape_scenario: undefined }), /unexpected shape/);
  assert.throws(
    () => parseSmStatus({ ...sampleStatus, boot: { code_bytes: 498900, accepted_c_bytes: 999999 } }),
    /unexpected shape/,
  );
  assert.throws(
    () => parseSmStatus({ ...sampleStatus, boot: { code_bytes: 0, accepted_c_bytes: 0 } }),
    /unexpected shape/,
  );
  assert.throws(
    () => parseSmStatus({ ...sampleStatus, boot: { code_bytes: 498900, accepted_c_bytes: -1 } }),
    /unexpected shape/,
  );
});
