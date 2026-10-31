/**
 * Progress of every project, read on the server from the projects' own repositories on GitHub.
 * Most publish an objdiff report (the same file ByteMatch reads); the others publish their own
 * format, parsed in this folder (objdiff.ts, gc.ts, gm.ts, sm.ts, sac.ts, each with tests).
 */
import { unstable_cache } from "next/cache";
import { parseSmStatus } from "./sm";
import { parseGcReport } from "./gc";
import { parseGmReadme } from "./gm";
import { parseObjdiff } from "./objdiff";
import { parseSacBodies, parseSacReport } from "./sac";
import type { Progress } from "./types";
import type { ProjectId } from "@/lib/projects";

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
const loadObjdiff = async (url: string, name: string): Promise<Progress> => parseObjdiff(await (await get(url)).json(), name);

/** Ratchet & Clank (PAL): read from the project's own objdiff progress report. */
const loadRac1 = () => loadObjdiff(`${RAW}/OpenRAC/rac1-decomp/main/progress/report.json`, "rac1");

/** Ratchet & Clank (NTSC-U), Lombyte: its objdiff report, published on the repository's `progress` branch (what ByteMatch reads). */
const loadRac1Us = () => loadObjdiff(`${RAW}/lombyte-project/Lombyte/progress/report.json`, "rac1us");

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
    // no report yet: try the next source
  }
  try {
    const res = await get(`${RAW}/OpenRAC/rac-sac-decomp/main/progress/status.json`);
    return parseSacReport(await res.json());
  } catch {
    // no status file yet: build the numbers from the placement tables
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

/** Where each project's numbers come from. Adding a title: add its loader here and a snapshot below. */
const LOADERS: Partial<Record<ProjectId, () => Promise<Progress>>> = {
  rac1: loadRac1,
  rac1us: loadRac1Us,
  gc: loadGc,
  uya: loadUya,
  deadlocked: loadDeadlocked,
  gm: loadGm,
  sm: loadSm,
  sac: loadSac,
};

const IDS = Object.keys(LOADERS) as ProjectId[];

/** Each loader wrapped in Next's data cache: GitHub is asked at most once per REVALIDATE_SECONDS. */
const cached = Object.fromEntries(
  IDS.map((id) => [id, unstable_cache(LOADERS[id]!, [`progress-${id}`], { revalidate: REVALIDATE_SECONDS })]),
) as Record<ProjectId, () => Promise<Progress>>;

/** Last numbers known to be good. Used only if GitHub cannot be reached at all. */
const FALLBACK: Partial<Record<ProjectId, Progress>> = {
  rac1: { functions: { done: 5116, total: 5116 }, code: { done: 3713096, total: 3713096 }, data: { done: 3984, total: 699072 }, source: "snapshot 2026-10-28" },
  rac1us: { functions: { done: 4243, total: 4244 }, code: { done: 3547708, total: 3547932 }, data: { done: 5418333, total: 12433372 }, source: "snapshot 2026-10-28" },
  gc: { functions: { done: 5623, total: 8584 }, code: { done: 2488920, total: 5525916 }, data: { done: 0, total: 383391 }, source: "snapshot 2026-10-28" },
  uya: { functions: { done: 5807, total: 16164 }, code: { done: 657780, total: 7546948 }, source: "snapshot 2026-10-24" },
  deadlocked: { functions: { done: 3598, total: 18085 }, code: { done: 262428, total: 5782424 }, source: "snapshot 2026-10-24" },
  gm: { functions: { done: 351, total: 351 }, code: { done: 545639, total: 545639 }, source: "snapshot 2026-10-24" },
  sm: { functions: { done: 9531, total: null }, code: { done: 618320, total: 6418204 }, source: "snapshot 2026-10-26" },
  sac: { functions: { done: 395, total: 427 }, code: { done: 31104, total: 7279840 }, source: "snapshot 2026-10-26" },
};

export interface ProjectProgress extends Progress {
  /** true when the live numbers could not be loaded and a snapshot is shown. */
  stale: boolean;
}

/** Progress of every project: live where GitHub answers, otherwise the last snapshot, marked stale. */
export async function getProgress(): Promise<Partial<Record<ProjectId, ProjectProgress>>> {
  const results = await Promise.allSettled(IDS.map((id) => cached[id]()));
  const out: Partial<Record<ProjectId, ProjectProgress>> = {};
  IDS.forEach((id, i) => {
    const r = results[i];
    const snapshot = FALLBACK[id];
    if (r.status === "fulfilled") out[id] = { ...r.value, stale: false };
    else if (snapshot) out[id] = { ...snapshot, stale: true };
  });
  return out;
}
