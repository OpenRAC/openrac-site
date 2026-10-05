import type { Progress } from "./types";

export interface GcReportMeasures {
  totalCode?: string | number;
  matchedCode?: string | number;
  total_code?: string | number;
  matched_code?: string | number;
  totalUnits?: string | number;
  completeUnits?: string | number;
  total_units?: string | number;
  complete_units?: string | number;
  totalFunctions?: string | number;
  matchedFunctions?: string | number;
  total_functions?: string | number;
  matched_functions?: string | number;
}

export interface ProgressScopeSection {
  name?: string;
  size?: number;
  flags?: number;
}

export interface ProgressScopeProgram {
  name?: string;
  sections?: ProgressScopeSection[];
}

export interface ProgressScope {
  programs?: ProgressScopeProgram[];
}

export interface GcProgressReport {
  g1?: {
    integrated_c_functions?: number;
    integrated_c_bytes?: number;
    matched?: boolean;
    bytes_compared?: number;
  };
  g3?: Array<{
    integrated_c_functions?: number;
    integrated_c_bytes?: number;
    level?: string;
  }>;
  integrated_code_bytes?: number;
  integrated_functions?: number;
  matched_candidate_bytes?: number;
  matched_candidate_functions?: number;
  decompiled_functions?: number;
  status?: string;
  measures?: GcReportMeasures;
}

/** Total executable code bytes across boot and 27 level overlays (SCUS_972.68 USA v1.01). */
export const GC_TOTAL_CODE_FALLBACK = 48_788_176;

/** Total PROGBITS sections / units across boot and 27 level overlays. */
export const GC_TOTAL_UNITS_FALLBACK = 603;

/**
 * Going Commando progress:
 * Either reads from an exported objdiff report (measures) or calculates from the
 * project's committed progress/report.json and config/progress-scope.json.
 */
export function parseGcReport(report: unknown, scope?: unknown): Progress {
  let r = report;
  if (typeof r === "string") {
    try {
      r = JSON.parse(r);
    } catch {
      throw new Error("gc report is not valid JSON");
    }
  }

  if (!r || typeof r !== "object") {
    throw new Error("gc report is not an object");
  }

  let s = scope;
  if (typeof s === "string") {
    try {
      s = JSON.parse(s);
    } catch {
      s = undefined;
    }
  }

  const typedReport = r as GcProgressReport;

  // Case 1: Standard objdiff report with measures (snake_case or camelCase)
  if (typedReport.measures && typeof typedReport.measures === "object") {
    const m = typedReport.measures;
    const n = (...keys: Array<keyof GcReportMeasures>): number => {
      for (const k of keys) {
        if (m[k] != null) return Number(m[k]);
      }
      return 0;
    };

    const doneCode = n("matched_code", "matchedCode");
    const totalCode = n("total_code", "totalCode");
    const completeUnits = n("complete_units", "completeUnits");
    const totalUnits = n("total_units", "totalUnits");
    const doneFuncs = n("matched_functions", "matchedFunctions") || completeUnits;
    const totalFuncs = n("total_functions", "totalFunctions") || totalUnits;

    if (
      ![doneFuncs, totalFuncs, doneCode, totalCode].every((v) => Number.isFinite(v) && v >= 0) ||
      totalFuncs <= 0 ||
      totalCode <= 0
    ) {
      throw new Error("gc report has an unexpected shape");
    }

    return {
      functions: { done: doneFuncs, total: totalFuncs },
      code: { done: doneCode, total: totalCode },
      source: "progress/report.json",
    };
  }

  // Case 2: rac2-decomp repository progress/report.json
  const hasRepoIndicators =
    typedReport.g1 != null ||
    typedReport.g3 != null ||
    typedReport.integrated_code_bytes != null ||
    typedReport.matched_candidate_bytes != null ||
    typedReport.integrated_functions != null ||
    typedReport.decompiled_functions != null;

  if (!hasRepoIndicators) {
    throw new Error("gc report has an unexpected shape");
  }

  const g1Bytes = Number(typedReport.g1?.integrated_c_bytes ?? 0);
  const g3Bytes = Array.isArray(typedReport.g3)
    ? typedReport.g3.reduce((sum, item) => sum + Number(item?.integrated_c_bytes ?? 0), 0)
    : 0;

  const doneCode = Number(
    typedReport.integrated_code_bytes ??
      (g1Bytes + g3Bytes > 0 ? g1Bytes + g3Bytes : typedReport.matched_candidate_bytes) ??
      0,
  );

  const g1Funcs = Number(typedReport.g1?.integrated_c_functions ?? 0);
  const g3Funcs = Array.isArray(typedReport.g3)
    ? typedReport.g3.reduce((sum, item) => sum + Number(item?.integrated_c_functions ?? 0), 0)
    : 0;

  const doneFuncs =
    g1Funcs + g3Funcs > 0
      ? g1Funcs + g3Funcs
      : Number(
          typedReport.integrated_functions ??
            typedReport.matched_candidate_functions ??
            typedReport.decompiled_functions ??
            0,
        );

  // Compute total code and total units from progress-scope if available
  let totalCode = 0;
  let totalUnits = 0;

  if (s && typeof s === "object" && Array.isArray((s as ProgressScope).programs)) {
    const programs = (s as ProgressScope).programs!;
    for (const prog of programs) {
      if (Array.isArray(prog.sections)) {
        for (const sec of prog.sections) {
          totalUnits += 1;
          if (Number(sec.flags ?? 0) & 4) {
            totalCode += Number(sec.size ?? 0);
          }
        }
      }
    }
  }

  if (totalCode <= 0) totalCode = GC_TOTAL_CODE_FALLBACK;
  if (totalUnits <= 0) totalUnits = GC_TOTAL_UNITS_FALLBACK;

  const totalFuncs = totalUnits;

  if (
    ![doneFuncs, totalFuncs, doneCode, totalCode].every((v) => Number.isFinite(v) && v >= 0) ||
    totalFuncs <= 0 ||
    totalCode <= 0
  ) {
    throw new Error("gc report has an unexpected shape");
  }

  return {
    functions: { done: doneFuncs, total: totalFuncs },
    code: { done: doneCode, total: totalCode },
    source: "progress/report.json",
  };
}
