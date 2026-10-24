import { unstable_cache } from "next/cache";
import { parseSmStatus } from "./sm";
import { parseGcReport } from "./gc";
import { parseGmReadme } from "./gm";
import { parseSacBodies, parseSacReport } from "./sac";
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
const loadDeadlocked = () => loadObjdiff(`${RAW}/OpenRAC/rac4-decomp/main/progress/report.json`, "deadlocked");

/** Going Commando: read the project's own progress report, including its measured scope. */
async function loadGc(): Promise<Progress> {
  const report = await (await get(`${RAW}/OpenRAC/rac2-gc-decomp/master/progress/report.json`)).json();
  return parseGcReport(report);
}

/** Up Your Arsenal (PAL): read the project's own objdiff progress report. */
const loadUya = () => loadObjdiff(`${RAW}/OpenRAC/rac3-decomp/master/progress/report.json`, "uya");

/** Going Mobile: read from the project's verified README output. */
async function loadGm(): Promise<Progress> {
  const readme = await (await get(`${RAW}/Clank700/going-mobile-decomp/main/README.md`)).text();
  return parseGmReadme(readme);
}

/** Size Matters (PS2, NTSC-U): read the project's own scoped progress snapshot. */
async function loadSm(): Promise<Progress> {
  const status = await (await get(`${RAW}/OpenRAC/rac5-sm-decomp/master/progress/status.json`)).json();
  return parseSmStatus(status);
}

/** Secret Agent Clank (PS2, NTSC-U): read from placement tables and candidate summaries. */
async function loadSac(): Promise<Progress> {
  try {
    const res = await get(`${RAW}/OpenRAC/rac-sac-decomp/main/progress/report.json`);
    return parseSacReport(await res.json());
  } catch {
    // Report file does not exist yet; fall through
  }
  try {
    const res = await get(`${RAW}/OpenRAC/rac-sac-decomp/main/progress/status.json`);
    return parseSacReport(await res.json());
  } catch {
    // Status file does not exist yet; fall through
  }

  const [levelsBodiesRes, bootBodiesRes, levelsSummaryRes, bootSummaryRes] = await Promise.all([
    get(`${RAW}/OpenRAC/rac-sac-decomp/main/config/levels/bodies.tsv`),
    get(`${RAW}/OpenRAC/rac-sac-decomp/main/config/boot/bodies.tsv`),
    get(`${RAW}/OpenRAC/rac-sac-decomp/main/config/levels/function_inventory_summary.json`),
    get(`${RAW}/OpenRAC/rac-sac-decomp/main/config/boot/summary.json`),
  ]);
  const [levelsBodies, bootBodies, levelsSummary, bootSummary] = await Promise.all([
    levelsBodiesRes.text(),
    bootBodiesRes.text(),
    levelsSummaryRes.json(),
    bootSummaryRes.json(),
  ]);
  return parseSacBodies(levelsBodies, bootBodies, levelsSummary, bootSummary);
}

const cached = {
  rac1: unstable_cache(loadRac1, ["progress-rac1"], { revalidate: REVALIDATE_SECONDS }),
  gc: unstable_cache(loadGc, ["progress-gc"], { revalidate: REVALIDATE_SECONDS }),
  uya: unstable_cache(loadUya, ["progress-uya"], { revalidate: REVALIDATE_SECONDS }),
  deadlocked: unstable_cache(loadDeadlocked, ["progress-deadlocked"], { revalidate: REVALIDATE_SECONDS }),
  gm: unstable_cache(loadGm, ["progress-gm"], { revalidate: REVALIDATE_SECONDS }),
  sm: unstable_cache(loadSm, ["progress-sm"], { revalidate: REVALIDATE_SECONDS }),
  sac: unstable_cache(loadSac, ["progress-sac"], { revalidate: REVALIDATE_SECONDS }),
};

/** Last numbers known to be good. Used only if GitHub cannot be reached at all. */
const FALLBACK: Record<ProjectId, Progress> = {
  rac1: { functions: { done: 5089, total: 5120 }, code: { done: 3656816, total: 3713416 }, source: "snapshot 2026-10-24" },
  gc: { functions: { done: 4351, total: 8601 }, code: { done: 776368, total: 5529148 }, source: "snapshot 2026-10-24" },
  uya: { functions: { done: 5807, total: 16164 }, code: { done: 657780, total: 7546948 }, source: "snapshot 2026-10-24" },
  deadlocked: { functions: { done: 3598, total: 18085 }, code: { done: 262428, total: 5782424 }, source: "snapshot 2026-10-24" },
  gm: { functions: { done: 351, total: 351 }, code: { done: 545639, total: 545639 }, source: "snapshot 2026-10-24" },
  sm: { functions: { done: 647, total: null }, code: { done: 87784, total: 6418204 }, source: "snapshot 2026-10-24" },
  sac: { functions: { done: 395, total: null }, code: { done: 31104, total: 7192780 }, source: "snapshot 2026-10-24" },
};

export interface ProjectProgress extends Progress {
  /** true when the live numbers could not be loaded and a snapshot is shown. */
  stale: boolean;
}

export async function getProgress(): Promise<Partial<Record<ProjectId, ProjectProgress>>> {
  const [rac1, gc, uya, deadlocked, gm, sm, sac] = await Promise.allSettled([
    cached.rac1(),
    cached.gc(),
    cached.uya(),
    cached.deadlocked(),
    cached.gm(),
    cached.sm(),
    cached.sac(),
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
    sac: pick(sac, FALLBACK.sac),
  };
}
