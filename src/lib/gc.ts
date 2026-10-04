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
  verified_at?: string;
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
    const doneCount = m.matched_functions ?? m.matchedFunctions;
    const totalCount = m.total_functions ?? m.totalFunctions;
    const doneFuncs = doneCount == null ? null : Number(doneCount);
    const totalFuncs = totalCount == null ? null : Number(totalCount);

    if (
      ![doneCode, totalCode, completeUnits, totalUnits].every((v) => Number.isFinite(v) && v >= 0) ||
      ![doneFuncs, totalFuncs].every((v) => v == null || (Number.isSafeInteger(v) && v >= 0)) ||
      (totalFuncs != null && doneFuncs != null && doneFuncs > totalFuncs) ||
      completeUnits > totalUnits ||
      doneCode > totalCode ||
      totalCode <= 0
    ) {
      throw new Error("gc report has an unexpected shape");
    }

    const p: Progress = {
      functions: { done: doneFuncs, total: totalFuncs },
      code: { done: doneCode, total: totalCode },
      source: "progress/report.json",
    };

    if (totalUnits > 0) {
      p.note = `${completeUnits} of ${totalUnits} units complete`;
    }

    return p;
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

  const bootCount = typedReport.g1?.integrated_c_functions ??
    typedReport.integrated_functions ?? typedReport.matched_candidate_functions ??
    typedReport.decompiled_functions;
  const g1Funcs = Number(bootCount ?? 0);
  const g3Funcs = Array.isArray(typedReport.g3)
    ? typedReport.g3.reduce((sum, item) => sum + Number(item?.integrated_c_functions ?? 0), 0)
    : 0;

  const levelCounts = typedReport.g3?.map((item) => item.integrated_c_functions) ?? [];
  const hasLevelCounts = levelCounts.length > 0 && levelCounts.every((count) => count != null);
  const doneFuncs = bootCount != null && (!levelCounts.length || hasLevelCounts)
    ? g1Funcs + g3Funcs : null;

  // ELF sections define the byte denominator, not the total number of functions.
  let totalCode = 0;

  if (s && typeof s === "object" && Array.isArray((s as ProgressScope).programs)) {
    const programs = (s as ProgressScope).programs!;
    for (const prog of programs) {
      if (Array.isArray(prog.sections)) {
        for (const sec of prog.sections) {
          if (Number(sec.flags ?? 0) & 4) {
            totalCode += Number(sec.size ?? 0);
          }
        }
      }
    }
  }

  if (totalCode <= 0) totalCode = GC_TOTAL_CODE_FALLBACK;

  if (
    ![doneCode, totalCode].every((v) => Number.isFinite(v) && v >= 0) ||
    ![g1Funcs, ...levelCounts.filter((count) => count != null)].every((v) => Number.isSafeInteger(v) && v >= 0) ||
    doneCode > totalCode ||
    totalCode <= 0
  ) {
    throw new Error("gc report has an unexpected shape");
  }

  const details = [`${doneCode.toLocaleString("en-US")} / ${totalCode.toLocaleString("en-US")} code bytes integrated`];
  if (bootCount != null) details.push(`${g1Funcs.toLocaleString("en-US")} boot functions`);
  if (hasLevelCounts) details.push(`${g3Funcs.toLocaleString("en-US")} level placements`);
  if (typedReport.verified_at && Number.isFinite(Date.parse(typedReport.verified_at))) {
    details.push(`verified ${new Date(typedReport.verified_at).toISOString().slice(0, 10)}`);
  }

  return {
    functions: { done: doneFuncs, total: null },
    code: { done: doneCode, total: totalCode },
    note: details.join(" · "),
    source: "progress/report.json",
  };
}
