import type { Progress } from "./types";

/**
 * Ratchet & Clank: Secret Agent Clank (PS2, NTSC-U) tracks proved body placements
 * across the 31 level modules and the boot executable.
 *
 * Like Size Matters (rac5-sm-decomp), the 31 level modules share the game engine
 * across overlays. To avoid counting the shared engine 31 times (which produces an
 * inflated ~70 MB figure on a console with 32 MB RAM), the candidate code scope
 * uses the deduplicated relocation-masked candidate bytes across the levels plus
 * the boot executable, and unique source bytes for the matched numerator.
 */
export function parseSacBodies(
  levelsBodiesTsv: string,
  bootBodiesTsv: string,
  levelsSummary?: unknown,
  bootSummary?: unknown,
): Progress {
  const sources = new Map<string, number>();

  for (const text of [levelsBodiesTsv, bootBodiesTsv]) {
    if (!text || typeof text !== "string") continue;
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("module\t")) continue;
      const parts = trimmed.split("\t");
      if (parts.length >= 4) {
        const size = parseInt(parts[2], 10);
        const source = parts[3];
        if (!Number.isNaN(size) && size > 0 && !sources.has(source)) {
          sources.set(source, size);
        }
      }
    }
  }

  let doneBytes = 0;
  for (const size of sources.values()) {
    doneBytes += size;
  }

  const parseJson = (val: unknown) => {
    if (!val) return null;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return null;
      }
    }
    return typeof val === "object" ? val : null;
  };

  const ls = parseJson(levelsSummary) as { relocation_masked_candidate_bytes?: number } | null;
  const bs = parseJson(bootSummary) as { bounded_candidate_body_bytes?: number; text_bytes?: number } | null;

  const levelsTotal = Number(ls?.relocation_masked_candidate_bytes ?? 6628908);
  const bootTotal = Number(bs?.text_bytes ?? bs?.bounded_candidate_body_bytes ?? 650932);
  const totalBytes = levelsTotal + bootTotal;

  if (doneBytes <= 0 || totalBytes <= 0) {
    throw new Error("sac progress could not be computed");
  }

  return {
    functions: { done: sources.size, total: null },
    code: { done: doneBytes, total: totalBytes },
    source: "config/levels/bodies.tsv",
  };
}

export function parseSacReport(report: unknown): Progress {
  let r = report;
  if (typeof r === "string") {
    try {
      r = JSON.parse(r);
    } catch {
      throw new Error("sac report is not valid JSON");
    }
  }
  if (!r || typeof r !== "object") throw new Error("sac report is not an object");
  const s = r as {
    measures?: Record<string, string | number>;
    functions?: { done?: number; total?: number; matched?: number };
    code?: { done?: number; total?: number; matched?: number };
    bytes_by_placement?: number;
    bytes_by_source_and_module?: number;
    candidate_code_bytes_by_placement?: number;
    relocation_masked_candidate_bytes?: number;
    boot_candidate_bytes?: number;
    sources?: number;
  };

  if (s.measures && typeof s.measures === "object") {
    const m = s.measures;
    const n = (val: string | number | undefined): number => (val != null ? Number(val) : 0);
    const doneCode = n(m.matched_code ?? m.matchedCode);
    const totalCode = n(m.total_code ?? m.totalCode);
    const doneFuncs =
      m.matched_functions != null
        ? Number(m.matched_functions)
        : m.matchedFunctions != null
          ? Number(m.matchedFunctions)
          : null;
    const totalFuncs =
      m.total_functions != null
        ? Number(m.total_functions)
        : m.totalFunctions != null
          ? Number(m.totalFunctions)
          : null;

    if (
      ![doneCode, totalCode].every((v) => Number.isFinite(v) && v >= 0) ||
      ![doneFuncs, totalFuncs].every((v) => v == null || (Number.isSafeInteger(v) && v >= 0)) ||
      (totalFuncs != null && doneFuncs != null && doneFuncs > totalFuncs) ||
      doneCode > totalCode ||
      totalCode <= 0
    ) {
      throw new Error("sac report has an unexpected shape");
    }

    return {
      functions: { done: doneFuncs, total: totalFuncs },
      code: { done: doneCode, total: totalCode },
      source: "progress/report.json",
    };
  }

  if (s.code?.total && s.code.total > 0) {
    return {
      functions: {
        done: s.functions?.done ?? s.functions?.matched ?? null,
        total: s.functions?.total ?? null,
      },
      code: {
        done: s.code.done ?? s.code.matched ?? 0,
        total: s.code.total,
      },
      source: "progress/report.json",
    };
  }

  if (s.relocation_masked_candidate_bytes !== undefined || s.bytes_by_placement !== undefined) {
    const done = Number(s.bytes_by_source_and_module ?? s.bytes_by_placement ?? 31104);
    const total = Number((s.relocation_masked_candidate_bytes ?? 6628908) + (s.boot_candidate_bytes ?? 650932));
    return {
      functions: { done: s.sources ? Number(s.sources) : null, total: null },
      code: { done, total },
      source: "progress/status.json",
    };
  }

  throw new Error("sac report has an unexpected shape");
}
