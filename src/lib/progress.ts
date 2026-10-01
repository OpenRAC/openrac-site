import { unstable_cache } from "next/cache";
import { parseUyaReport } from "./uya";
import type { Progress } from "./types";
import type { ProjectId } from "./projects";

/** How long a fetched number may be reused before the server asks GitHub again. */
export const REVALIDATE_SECONDS = 600;

const RAW = "https://raw.githubusercontent.com";

async function get(url: string): Promise<Response> {
  // `no-store` on purpose: the RaC1 report is over 1 MB, too big for the fetch cache.
  // The small derived result is cached below instead.
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res;
}

/** Ratchet & Clank: read from the project's own objdiff progress report. */
async function loadRac1(): Promise<Progress> {
  const report = (await (await get(`${RAW}/Lynder063/rac1-decomp/main/progress/report.json`)).json()) as {
    measures?: Record<string, string | number>;
  };
  const m = report.measures;
  const n = (key: string): number => Number(m?.[key] ?? 0);
  const p: Progress = {
    functions: { done: n("matched_functions"), total: n("total_functions") },
    code: { done: n("matched_code"), total: n("total_code") },
    note: `${m?.complete_units != null ? Number(m.complete_units) : 0} of ${n("total_units")} source files complete`,
    source: "progress/report.json",
  };
  if (![p.functions.done, p.functions.total, p.code.done, p.code.total].every((v) => Number.isFinite(v) && v >= 0) || p.functions.total <= 0 || p.code.total <= 0) {
    throw new Error("rac1 report has an unexpected shape");
  }
  return p;
}

/** Up Your Arsenal: read from the project's own objdiff progress report. */
async function loadUya(): Promise<Progress> {
  const report = await (await get(`${RAW}/vetusmagnus/ratchet-uya-decomp/main/progress_report.json`)).json();
  return parseUyaReport(report);
}

const cached = {
  rac1: unstable_cache(loadRac1, ["progress-rac1"], { revalidate: REVALIDATE_SECONDS }),
  uya: unstable_cache(loadUya, ["progress-uya"], { revalidate: REVALIDATE_SECONDS }),
};

/** Last numbers known to be good. Used only if GitHub cannot be reached at all. */
const FALLBACK: Record<"rac1" | "uya", Progress> = {
  rac1: { functions: { done: 1777, total: 5111 }, code: { done: 323648, total: 3713628 }, source: "snapshot 2026-09-30" },
  uya: { functions: { done: 1292, total: 31316 }, code: { done: 164764, total: 12838776 }, note: "0 of 114 source files complete", source: "snapshot 2026-10-01" },
};

export interface ProjectProgress extends Progress {
  /** true when the live numbers could not be loaded and a snapshot is shown. */
  stale: boolean;
}

export async function getProgress(): Promise<Partial<Record<ProjectId, ProjectProgress>>> {
  const [rac1, uya] = await Promise.allSettled([cached.rac1(), cached.uya()]);
  const pick = (r: PromiseSettledResult<Progress>, fb: Progress): ProjectProgress =>
    r.status === "fulfilled" ? { ...r.value, stale: false } : { ...fb, stale: true };
  return { rac1: pick(rac1, FALLBACK.rac1), uya: pick(uya, FALLBACK.uya) };
}
