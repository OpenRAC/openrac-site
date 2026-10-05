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
  // `no-store` on purpose: the RaC1 reports are over 1 MB, too big for the fetch cache.
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
  const p: Progress = {
    functions: { done: n("matched_functions"), total: n("total_functions") },
    code: { done: n("matched_code"), total: n("total_code") },
    source: "progress/report.json",
  };
  if (![p.functions.done, p.functions.total, p.code.done, p.code.total].every((v) => Number.isFinite(v) && v >= 0) || p.functions.total <= 0 || p.code.total <= 0) {
    throw new Error(`${name} report has an unexpected shape`);
  }
  return p;
}

/** Ratchet & Clank (PAL): read from the project's own objdiff progress report. */
const loadRac1 = () => loadObjdiff(`${RAW}/OpenRAC/rac1-decomp/main/progress/report.json`, "rac1");

/** Ratchet & Clank (NTSC-U), Lombyte: CI publishes its objdiff report on the `progress` branch. */
const loadLombyte = () => loadObjdiff(`${RAW}/lombyte-project/Lombyte/progress/report.json`, "lombyte");

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
  const report = await (await get(`${RAW}/vetusmagnus/ratchet-uya-decomp/main/progress_report.json`)).json();
  return parseUyaReport(report);
}

/** Going Mobile: read from the project's verified README output. */
async function loadGm(): Promise<Progress> {
  const readme = await (await get(`${RAW}/Clank700/going-mobile-decomp/main/README.md`)).text();
  return parseGmReadme(readme);
}

const cached = {
  rac1: unstable_cache(loadRac1, ["progress-rac1"], { revalidate: REVALIDATE_SECONDS }),
  lombyte: unstable_cache(loadLombyte, ["progress-lombyte"], { revalidate: REVALIDATE_SECONDS }),
  gc: unstable_cache(loadGc, ["progress-gc"], { revalidate: REVALIDATE_SECONDS }),
  uya: unstable_cache(loadUya, ["progress-uya"], { revalidate: REVALIDATE_SECONDS }),
  gm: unstable_cache(loadGm, ["progress-gm"], { revalidate: REVALIDATE_SECONDS }),
};

/** Last numbers known to be good. Used only if GitHub cannot be reached at all. */
const FALLBACK: Record<ProjectId, Progress> = {
  rac1: { functions: { done: 2974, total: 5109 }, code: { done: 838628, total: 3712808 }, source: "snapshot 2026-10-05" },
  lombyte: { functions: { done: 2658, total: 4107 }, code: { done: 796784, total: 3493132 }, source: "snapshot 2026-10-05" },
  gc: { functions: { done: 181, total: 603 }, code: { done: 308608, total: 48788176 }, source: "snapshot 2026-10-05" },
  uya: { functions: { done: 1292, total: 31316 }, code: { done: 164764, total: 12838776 }, source: "snapshot 2026-10-05" },
  gm: { functions: { done: 351, total: 351 }, code: { done: 545639, total: 545639 }, source: "snapshot 2026-10-05" },
};

export interface ProjectProgress extends Progress {
  /** true when the live numbers could not be loaded and a snapshot is shown. */
  stale: boolean;
}

export async function getProgress(): Promise<Partial<Record<ProjectId, ProjectProgress>>> {
  const [rac1, lombyte, gc, uya, gm] = await Promise.allSettled([
    cached.rac1(),
    cached.lombyte(),
    cached.gc(),
    cached.uya(),
    cached.gm(),
  ]);
  const pick = (r: PromiseSettledResult<Progress>, fb: Progress): ProjectProgress =>
    r.status === "fulfilled" ? { ...r.value, stale: false } : { ...fb, stale: true };
  return {
    rac1: pick(rac1, FALLBACK.rac1),
    lombyte: pick(lombyte, FALLBACK.lombyte),
    gc: pick(gc, FALLBACK.gc),
    uya: pick(uya, FALLBACK.uya),
    gm: pick(gm, FALLBACK.gm),
  };
}
