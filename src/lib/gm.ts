import type { Progress } from "./types";

/**
 * Ratchet & Clank: Going Mobile (v1.1.0) is a Java source reconstruction project:
 * https://github.com/Clank700/going-mobile-decomp
 *
 * Verified output: 351/351 methods exact, 10/10 class files byte-identical.
 * Total reconstructed Java source size: 545,639 bytes across 10 classes.
 */
export const GM_TOTAL_CODE_BYTES = 545_639;

export function parseGmReadme(readme: string): Progress {
  if (typeof readme !== "string" || !readme.trim()) {
    throw new Error("going-mobile readme content is empty or invalid");
  }

  // Look for "351/351 methods EXACT" or similar pattern
  const methodsMatch = readme.match(/(\d+)\s*\/\s*(\d+)\s*methods\s+EXACT/i);
  // Look for "10/10 class files byte-identical" or similar pattern
  const classesMatch = readme.match(/(\d+)\s*\/\s*(\d+)\s*class\s+files\s+byte-identical/i);

  if (!methodsMatch || !classesMatch) {
    throw new Error("going-mobile readme metrics could not be parsed");
  }

  const doneMethods = Number(methodsMatch[1]);
  const totalMethods = Number(methodsMatch[2]);
  const doneClasses = Number(classesMatch[1]);
  const totalClasses = Number(classesMatch[2]);

  if (
    ![doneMethods, totalMethods, doneClasses, totalClasses].every((v) => Number.isFinite(v) && v >= 0) ||
    totalMethods <= 0 ||
    totalClasses <= 0
  ) {
    throw new Error("going-mobile readme metrics could not be parsed");
  }

  const ratio = totalMethods > 0 ? doneMethods / totalMethods : 1;
  const doneCode = Math.round(GM_TOTAL_CODE_BYTES * ratio);

  return {
    functions: { done: doneMethods, total: totalMethods },
    code: { done: doneCode, total: GM_TOTAL_CODE_BYTES },
    source: "README.md",
  };
}
