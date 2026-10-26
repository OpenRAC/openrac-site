import type { Progress } from "./types";

/**
 * Ratchet & Clank: Size Matters (PS2, NTSC-U) publishes no objdiff report. It publishes a scoped
 * progress snapshot instead:
 * https://github.com/OpenRAC/rac5-sm-decomp/blob/master/progress/status.json
 *
 * The snapshot has no qualified game-wide percentage yet (`overall_percent` is null), so the figure
 * the site shows is built from the three scopes the snapshot does measure: the boot `.text`, the
 * frontend's candidate code interval and the levels' optimistic masked-shape scenario. That is the
 * same arithmetic the project uses in its own `tools/bytematch_estimate.py` to publish the report
 * ByteMatch reads, so the site and ByteMatch always show the same number.
 */
export interface SmStatus {
  format?: string;
  target?: string;
  status?: string;
  /** Null while no qualified game-wide denominator exists; the project says so itself. */
  overall_percent?: number | null;
  bytematch_objdiff_ready?: boolean;
  boot?: {
    code_bytes?: number;
    accepted_c_bytes?: number;
    accepted_functions?: string[];
    scoped_code_percent?: number;
  };
  levels?: {
    placements?: Array<{
      module?: string;
      candidate_code_bytes_by_placement?: number;
      accepted_c_bytes?: number;
    }>;
    /** The shared level functions, counted once and not once per placement. */
    accepted_c_bytes_per_unique_source?: number;
    accepted_frontend_functions?: string[];
    accepted_shared_functions?: string[];
    accepted_level_body_unique_source_bytes?: number;
    accepted_level_body_unique_sources?: number;
  };
  optimistic_shape_scenario?: {
    masked_max_per_module_bytes?: number;
  };
}

/** The frontend overlay: its own scope, between the boot program and the levels. */
const FRONTEND_MODULE = "FRONTEND.REL";

/** The format the project's own tools write. Anything else is not read. */
const FORMAT = "rac5-scoped-progress-v1";

export function parseSmStatus(report: unknown): Progress {
  let r = report;
  if (typeof r === "string") {
    try {
      r = JSON.parse(r);
    } catch {
      throw new Error("sm status is not valid JSON");
    }
  }

  if (!r || typeof r !== "object") {
    throw new Error("sm status is not an object");
  }

  const s = r as SmStatus;
  if (s.format !== FORMAT) {
    throw new Error("sm status has an unexpected format");
  }

  const boot = s.boot;
  const levels = s.levels;
  const frontend = levels?.placements?.find((p) => p?.module === FRONTEND_MODULE);
  const shape = s.optimistic_shape_scenario;
  if (!boot || !levels || !frontend || !shape) {
    throw new Error("sm status has an unexpected shape");
  }

  const levelBodies = Number(levels.accepted_level_body_unique_source_bytes ?? 0);
  if (!Number.isFinite(levelBodies) || levelBodies < 0) {
    throw new Error("sm status has an unexpected shape");
  }

  // The three scopes the snapshot measures: what is done, and what there is to do.
  const scopes = [
    { done: Number(boot.accepted_c_bytes), total: Number(boot.code_bytes) },
    { done: Number(frontend.accepted_c_bytes), total: Number(frontend.candidate_code_bytes_by_placement) },
    {
      done: Number(levels.accepted_c_bytes_per_unique_source) + levelBodies,
      total: Number(shape.masked_max_per_module_bytes),
    },
  ];

  if (
    !scopes.every((x) => Number.isFinite(x.done) && Number.isFinite(x.total) && x.done >= 0 && x.total >= 0) ||
    scopes.some((x) => x.total <= 0 || x.done > x.total)
  ) {
    throw new Error("sm status has an unexpected shape");
  }

  const done = scopes.reduce((sum, x) => sum + x.done, 0);
  const total = scopes.reduce((sum, x) => sum + x.total, 0);

  // The functions accepted in the same scopes. The project publishes no total, so none is claimed.
  const lists = [boot.accepted_functions, levels.accepted_frontend_functions, levels.accepted_shared_functions];
  const listCount = lists.reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
  const levelBodySources = Number(levels.accepted_level_body_unique_sources ?? 0);
  const functions = listCount + (Number.isFinite(levelBodySources) && levelBodySources >= 0 ? levelBodySources : 0);

  return {
    functions: { done: functions, total: null },
    code: { done, total },
    source: "progress/status.json",
  };
}
