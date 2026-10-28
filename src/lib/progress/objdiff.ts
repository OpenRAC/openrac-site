import type { Progress, Ratio } from "./types.ts";

/** The objdiff measures this site reads; every count may come as a number or as a string. */
type Measures = Partial<Record<"matched_code" | "total_code" | "matched_functions" | "total_functions" | "matched_data" | "total_data", string | number>>;

/**
 * The data measure of an objdiff report (`matched_data` of `total_data`), or undefined when the report
 * has none: older objdiff versions and projects that do not split data out leave both keys away.
 * A measure that does not add up is dropped too, so it can never take the code figure down with it.
 */
export function objdiffData(m: Measures | undefined): Ratio | undefined {
  if (m?.total_data == null) return undefined;
  const [done, total] = [Number(m.matched_data ?? 0), Number(m.total_data)];
  if (![done, total].every((v) => Number.isFinite(v) && v >= 0) || done > total || total <= 0) return undefined;
  return { done, total };
}

/** A plain objdiff progress report (the same file ByteMatch reads): its code, functions and, when present, data. */
export function parseObjdiff(report: unknown, name: string): Progress {
  const m = (report as { measures?: Measures } | null)?.measures;
  const n = (key: keyof Measures): number => Number(m?.[key] ?? 0);
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
