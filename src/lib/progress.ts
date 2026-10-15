import { unstable_cache } from "next/cache";
import { parseUyaReport } from "./uya";
import { parseGcReport } from "./gc";
import { parseGmReadme } from "./gm";
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

/** Reads a plain objdiff progress report (the same file ByteMatch reads). */
async function loadObjdiff(url: string, name: string): Promise<Progress> {
  const report = (await (await get(url)).json()) as { measures?: Record<string, string | number> };
  const m = report.measures;
  const n = (key: string): number => Number(m?.[key] ?? 0);
  const [doneFuncs, totalFuncs, doneCode, totalCode] = [n("matched_functions"), n("total_functions"), n("matched_code"), n("total_code")];
  if (![doneFuncs, totalFuncs, doneCode, totalCode].every((v) => Number.isFinite(v) && v >= 0) || totalFuncs <= 0 || totalCode <= 0) {
    throw new Error(`${name} report has an unexpected shape`);
  }
  return {
    functions: { done: doneFuncs, total: totalFuncs },
    code: { done: doneCode, total: totalCode },
    source: "progress/report.json",
  };
}

/** Ratchet & Clank (PAL): read from the project's own objdiff progress report. */
const loadRac1 = () => loadObjdiff(`${RAW}/OpenRAC/rac1-decomp/main/progress/report.json`, "rac1");

/** Ratchet: Deadlocked (NTSC-U): read from the project's own objdiff progress report. */
const loadDeadlocked = () => loadObjdiff(`${RAW}/OpenRAC/rac-deadlocked-decomp/main/progress/report.json`, "deadlocked");

/** Going Commando: read the project's own progress report, including its measured scope. */
async function loadGc(): Promise<Progress> {
  const report = await (await get(`${RAW}/OpenRAC/rac2-gc-decomp/master/progress/report.json`)).json();
  return parseGcReport(report);
}

/** Up Your Arsenal: its CI publishes an objdiff artifact; ByteMatch serves it as JSON. */
async function loadUya(): Promise<Progress> {
  const report = await (await get("https://bytematch.dev/OpenRAC/rac3-uya-decomp.json")).json();
  return parseUyaReport(report);
}

/** Going Mobile: read from the project's verified README output. */
async function loadGm(): Promise<Progress> {
  const readme = await (await get(`${RAW}/Clank700/going-mobile-decomp/main/README.md`)).text();
  return parseGmReadme(readme);
}

/** Size Matters (PS2, NTSC-U): read from the project's own objdiff progress report when published. */
const loadSm = () => loadObjdiff(`${RAW}/OpenRAC/rac5-sm-decomp/master/progress/report.json`, "sm");

const cached = {
  rac1: unstable_cache(loadRac1, ["progress-rac1"], { revalidate: REVALIDATE_SECONDS }),
  gc: unstable_cache(loadGc, ["progress-gc"], { revalidate: REVALIDATE_SECONDS }),
  uya: unstable_cache(loadUya, ["progress-uya"], { revalidate: REVALIDATE_SECONDS }),
  deadlocked: unstable_cache(loadDeadlocked, ["progress-deadlocked"], { revalidate: REVALIDATE_SECONDS }),
  gm: unstable_cache(loadGm, ["progress-gm"], { revalidate: REVALIDATE_SECONDS }),
  sm: unstable_cache(loadSm, ["progress-sm"], { revalidate: REVALIDATE_SECONDS }),
};

/** Last numbers known to be good. Used only if GitHub cannot be reached at all. */
const FALLBACK: Record<ProjectId, Progress> = {
  rac1: { functions: { done: 2974, total: 5109 }, code: { done: 838628, total: 3712808 }, source: "snapshot 2026-10-05" },
  gc: { functions: { done: 2941, total: 9100 }, code: { done: 318088, total: 5533600 }, source: "snapshot 2026-10-14" },
  uya: { functions: { done: 4496, total: 31400 }, code: { done: 894864, total: 12838884 }, source: "snapshot 2026-10-14" },
  deadlocked: { functions: { done: 243, total: 15056 }, code: { done: 26572, total: 5175440 }, source: "snapshot 2026-10-05" },
  gm: { functions: { done: 351, total: 351 }, code: { done: 545639, total: 545639 }, source: "snapshot 2026-10-05" },
  sm: { functions: { done: null, total: null }, code: { done: 0, total: 498900 }, source: "snapshot 2026-10-15" },
};

export interface ProjectProgress extends Progress {
  /** true when the live numbers could not be loaded and a snapshot is shown. */
  stale: boolean;
}

export async function getProgress(): Promise<Partial<Record<ProjectId, ProjectProgress>>> {
  const [rac1, gc, uya, deadlocked, gm, sm] = await Promise.allSettled([
    cached.rac1(),
    cached.gc(),
    cached.uya(),
    cached.deadlocked(),
    cached.gm(),
    cached.sm(),
  ]);
  const pick = (r: PromiseSettledResult<Progress>, fb: Progress): ProjectProgress =>
    r.status === "fulfilled" ? { ...r.value, stale: false } : { ...fb, stale: true };
  return {
    rac1: pick(rac1, FALLBACK.rac1),
    gc: pick(gc, FALLBACK.gc),
    uya: pick(uya, FALLBACK.uya),
    deadlocked: pick(deadlocked, FALLBACK.deadlocked),
    gm: pick(gm, FALLBACK.gm),
    sm: pick(sm, FALLBACK.sm),
  };
}
