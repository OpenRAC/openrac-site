import type { Progress } from "./types";

/**
 * Up Your Arsenal publishes an objdiff progress report (progress_report.json):
 * https://raw.githubusercontent.com/vetusmagnus/ratchet-uya-decomp/refs/heads/main/progress_report.json
 */
export interface ObjdiffReport {
  measures?: Record<string, string | number>;
  categories?: Array<{
    id?: string;
    name?: string;
    measures?: Record<string, string | number>;
  }>;
  units?: Array<{
    name?: string;
    measures?: Record<string, string | number>;
  }>;
  version?: number;
}

export function parseUyaReport(report: unknown): Progress {
  let r = report;
  if (typeof r === "string") {
    try {
      r = JSON.parse(r);
    } catch {
      throw new Error("uya report is not valid JSON");
    }
  }

  if (!r || typeof r !== "object") {
    throw new Error("uya report is not an object");
  }

  const m = (r as ObjdiffReport).measures;
  const n = (key: string): number => Number(m?.[key] ?? 0);

  const doneFuncs = n("matched_functions");
  const totalFuncs = n("total_functions");
  const doneCode = n("matched_code");
  const totalCode = n("total_code");
  const completeUnits = m?.complete_units != null ? Number(m.complete_units) : 0;
  const totalUnits = n("total_units");

  if (
    ![doneFuncs, totalFuncs, doneCode, totalCode].every((v) => Number.isFinite(v) && v >= 0) ||
    totalFuncs <= 0 ||
    totalCode <= 0
  ) {
    throw new Error("uya report has an unexpected shape");
  }

  const p: Progress = {
    functions: { done: doneFuncs, total: totalFuncs },
    code: { done: doneCode, total: totalCode },
    source: "progress_report.json",
  };

  if (totalUnits > 0) {
    p.note = `${completeUnits} of ${totalUnits} source files complete`;
  }

  return p;
}
