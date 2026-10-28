import { objdiffData, type Progress } from "./types.ts";

/** A plain objdiff progress report (the same file ByteMatch reads): its code, functions and, when present, data. */
export function parseObjdiff(report: unknown, name: string): Progress {
  const m = (report as { measures?: Record<string, string | number> } | null)?.measures;
  const n = (key: string): number => Number(m?.[key] ?? 0);
  const [doneFuncs, totalFuncs, doneCode, totalCode] = [n("matched_functions"), n("total_functions"), n("matched_code"), n("total_code")];
  if (![doneFuncs, totalFuncs, doneCode, totalCode].every((v) => Number.isFinite(v) && v >= 0) || totalFuncs <= 0 || totalCode <= 0) {
    throw new Error(`${name} report has an unexpected shape`);
  }
  const data = objdiffData(m);
  return {
    functions: { done: doneFuncs, total: totalFuncs },
    code: { done: doneCode, total: totalCode },
    ...(data && { data }),
    source: "progress/report.json",
  };
}
