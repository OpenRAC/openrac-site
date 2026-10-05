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

/** Reads a plain objdiff progress report (the same file decomp.dev reads). */
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

/** Going Commando: read from the project's own progress report and scope. */
async function loadGc(): Promise<Progress> {
  const [reportRes, scopeRes] = await Promise.allSettled([
    get(`${RAW}/llesieur99/rac2-decomp/RAC2/progress/report.json`),
    get(`${RAW}/llesieur99/rac2-decomp/RAC2/config/progress-scope.json`),
  ]);
  if (reportRes.status !== "fulfilled") throw reportRes.reason;
  const report = await reportRes.value.json();
  const scope = scopeRes.status === "fulfilled" ? await scopeRes.value.json() : undefined;
  return parseGcReport(report, scope);
}

/** Up Your Arsenal: read from the project's own objdiff progress report. */
async function loadUya(): Promise<Progress> {
  const report = await (await get(`${RAW}/OpenRAC/rac3-uya-decomp/main/progress_report.json`)).json();
  return parseUyaReport(report);
}

/** Going Mobile: read from the project's verified README output. */
async function loadGm(): Promise<Progress> {
  const readme = await (await get(`${RAW}/Clank700/going-mobile-decomp/main/README.md`)).text();
  return parseGmReadme(readme);
}

const cached = {
  rac1: unstable_cache(loadRac1, ["progress-rac1"], { revalidate: REVALIDATE_SECONDS }),
  gc: unstable_cache(loadGc, ["progress-gc"], { revalidate: REVALIDATE_SECONDS }),
  uya: unstable_cache(loadUya, ["progress-uya"], { revalidate: REVALIDATE_SECONDS }),
  deadlocked: unstable_cache(loadDeadlocked, ["progress-deadlocked"], { revalidate: REVALIDATE_SECONDS }),
  gm: unstable_cache(loadGm, ["progress-gm"], { revalidate: REVALIDATE_SECONDS }),
};

/** Last numbers known to be good. Used only if GitHub cannot be reached at all. */
const FALLBACK: Record<ProjectId, Progress> = {
  rac1: { functions: { done: 2974, total: 5109 }, code: { done: 838628, total: 3712808 }, source: "snapshot 2026-10-05" },
  gc: { functions: { done: 5269, total: null }, code: { done: 308608, total: 48788176 }, source: "snapshot 2026-10-05" },
  uya: { functions: { done: 1292, total: 31316 }, code: { done: 164764, total: 12838776 }, source: "snapshot 2026-10-05" },
  deadlocked: { functions: { done: 243, total: 15056 }, code: { done: 26572, total: 5175440 }, source: "snapshot 2026-10-05" },
  gm: { functions: { done: 351, total: 351 }, code: { done: 545639, total: 545639 }, source: "snapshot 2026-10-05" },
};

export interface ProjectProgress extends Progress {
  /** true when the live numbers could not be loaded and a snapshot is shown. */
  stale: boolean;
}

export async function getProgress(): Promise<Partial<Record<ProjectId, ProjectProgress>>> {
  const [rac1, gc, uya, deadlocked, gm] = await Promise.allSettled([
    cached.rac1(),
    cached.gc(),
    cached.uya(),
    cached.deadlocked(),
    cached.gm(),
  ]);
  const pick = (r: PromiseSettledResult<Progress>, fb: Progress): ProjectProgress =>
    r.status === "fulfilled" ? { ...r.value, stale: false } : { ...fb, stale: true };
  return {
    rac1: pick(rac1, FALLBACK.rac1),
    gc: pick(gc, FALLBACK.gc),
    uya: pick(uya, FALLBACK.uya),
    deadlocked: pick(deadlocked, FALLBACK.deadlocked),
    gm: pick(gm, FALLBACK.gm),
  };
}
