import type { Progress } from "./types";

/**
 * Ratchet: Deadlocked publishes an objdiff progress report (progress/report.json):
 * https://raw.githubusercontent.com/Lynder063/rac-deadlocked-decomp/main/progress/report.json
 */
export interface DeadlockedObjdiffReport {
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

export function parseDeadlockedReport(report: unknown): Progress {
  let r = report;
  if (typeof r === "string") {
    try {
      r = JSON.parse(r);
    } catch {
      throw new Error("deadlocked report is not valid JSON");
    }
  }

  if (!r || typeof r !== "object") {
    throw new Error("deadlocked report is not an object");
  }

  const m = (r as DeadlockedObjdiffReport).measures;
  const n = (key: string): number => Number(m?.[key] ?? 0);

  const doneFuncs = n("matched_functions");
  const totalFuncs = n("total_functions");
  const doneCode = n("matched_code");
  const totalCode = n("total_code");
  const completeUnits = m?.complete_units != null ? Number(m.complete_units) : 0;
  const totalUnits = n("total_units");

  if (![doneFuncs, totalFuncs, doneCode, totalCode].every((v) => Number.isFinite(v) && v >= 0)) {
    throw new Error("deadlocked report has an unexpected shape");
  }

  const p: Progress = {
    functions: { done: doneFuncs, total: totalFuncs },
    code: { done: doneCode, total: totalCode },
    source: "progress/report.json",
  };

  if (totalUnits > 0) {
    p.note = `${completeUnits} of ${totalUnits} source files complete`;
  } else {
    p.note = "Repository initialized · Analysis in progress";
  }

  return p;
}
