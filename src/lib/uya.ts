import type { Progress } from "./types";

/**
 * Up Your Arsenal publishes no machine-readable progress report, so the numbers
 * are derived from the repository itself (vetusmagnus/ratchet-uya-decomp):
 *
 *  - `src/text.c` lists every function exactly once, as one of
 *      C definition        -> decompiled and matching
 *      ASM_FUNC / LINKER_REMNANT -> verified against retail, written as assembly
 *      INCLUDE_ASM         -> not done yet
 *  - `tools/remaining_functions.tsv` gives the size of every not-done function.
 *  - The size of `.text` is fixed by the retail binary.
 *
 * "Done" counts C and verified assembly together, the way objdiff does, which is also
 * the headline figure of the project's own README. The C-only count is shown
 * separately.
 */

/** .text of frontbin.elf: file offsets 0x1a8a80 .. 0x218924 (frontbin.splat.yaml). */
export const UYA_TEXT_BYTES = 0x218924 - 0x1a8a80;

const COMMENTS = /\/\*[\s\S]*?\*\//g;
const C_DEFINITION =
  /^[A-Za-z_][^\n;=(){}]*?\b(func_[0-9A-Fa-f]{8})\s*\((?:[^()]|\([^()]*\))*\)\s*(?:[A-Za-z_][^;{}()]*;\s*)*\{/gm;
const INCLUDE_ASM = /^[ \t]*INCLUDE_ASM\s*\(\s*"[^"]*"\s*,\s*(func_[0-9A-Fa-f]{8})\s*\)/gm;
const VERIFIED_ASM = /^[ \t]*(?:ASM_FUNC|LINKER_REMNANT)\s*\(/gm;

/** Sizes (in bytes) of the functions listed in remaining_functions.tsv. */
export function parseSizes(tsv: string): Map<string, number> {
  const sizes = new Map<string, number>();
  const lines = tsv.split(/\r?\n/);
  const header = (lines.shift() ?? "").split("\t");
  const fn = header.indexOf("function");
  const sz = header.indexOf("size");
  if (fn < 0 || sz < 0) return sizes;
  for (const line of lines) {
    const cols = line.split("\t");
    const size = Number.parseInt(cols[sz] ?? "", 16);
    if (cols[fn] && Number.isFinite(size)) sizes.set(cols[fn], size);
  }
  return sizes;
}

/** Returns null when the files do not look the way this parser expects. */
export function computeUya(textC: string, remainingTsv: string): Progress | null {
  const src = textC.replace(COMMENTS, "");
  const cFunctions = new Set([...src.matchAll(C_DEFINITION)].map((m) => m[1]));
  const remaining = new Set([...src.matchAll(INCLUDE_ASM)].map((m) => m[1]));
  const verifiedAsm = [...src.matchAll(VERIFIED_ASM)].length;

  const total = cFunctions.size + remaining.size + verifiedAsm;
  // A sanity check: a parser that finds almost nothing is worse than a stale number.
  if (cFunctions.size < 100 || remaining.size < 1 || total < 1000) return null;

  const sizes = parseSizes(remainingTsv);
  let remainingBytes = 0;
  for (const name of remaining) remainingBytes += sizes.get(name) ?? 0;
  if (remainingBytes <= 0 || remainingBytes > UYA_TEXT_BYTES) return null;

  return {
    functions: { done: cFunctions.size + verifiedAsm, total },
    code: { done: UYA_TEXT_BYTES - remainingBytes, total: UYA_TEXT_BYTES },
    note: `${cFunctions.size.toLocaleString("en-US")} in C, ${verifiedAsm.toLocaleString("en-US")} verified hand-written assembly`,
    source: "src/text.c and tools/remaining_functions.tsv",
  };
}
