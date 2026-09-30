import { unstable_cache } from "next/cache";
import { computeUya } from "./uya";
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
  const n = (key: string): number => Number(m?.[key]);
  const p: Progress = {
    functions: { done: n("matched_functions"), total: n("total_functions") },
    code: { done: n("matched_code"), total: n("total_code") },
    note: `${n("complete_units")} of ${n("total_units")} source files complete`,
    source: "progress/report.json",
  };
  if (![p.functions.done, p.functions.total, p.code.done, p.code.total].every((v) => Number.isFinite(v) && v >= 0) || p.functions.total <= 0 || p.code.total <= 0) {
    throw new Error("rac1 report has an unexpected shape");
  }
  return p;
}

/** Up Your Arsenal: derived from its sources, see ./uya.ts. */
async function loadUya(): Promise<Progress> {
  const base = `${RAW}/vetusmagnus/ratchet-uya-decomp/HEAD`;
  const [textC, tsv] = await Promise.all([
    get(`${base}/src/text.c`).then((r) => r.text()),
    get(`${base}/tools/remaining_functions.tsv`).then((r) => r.text()),
  ]);
  const p = computeUya(textC, tsv);
  if (!p) throw new Error("uya sources did not parse");
  return p;
}

const cached = {
  rac1: unstable_cache(loadRac1, ["progress-rac1"], { revalidate: REVALIDATE_SECONDS }),
  uya: unstable_cache(loadUya, ["progress-uya"], { revalidate: REVALIDATE_SECONDS }),
};

/** Last numbers known to be good. Used only if GitHub cannot be reached at all. */
const FALLBACK: Record<"rac1" | "uya", Progress> = {
  rac1: { functions: { done: 1777, total: 5111 }, code: { done: 323648, total: 3713628 }, source: "snapshot 2026-09-30" },
  uya: { functions: { done: 1202, total: 1867 }, code: { done: 155968, total: 458404 }, note: "833 in C, 369 verified hand-written assembly", source: "snapshot 2026-09-30" },
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
