/** One measured quantity: how much is done out of how much there is. */
export interface Ratio {
  done: number;
  total: number;
}

export const percent = (r: Ratio): number => (r.total > 0 ? (r.done / r.total) * 100 : 0);

/**
 * Progress of one decompilation project. Every project is measured the same way:
 *  - `functions`: functions whose code is verified identical to the retail build
 *  - `code`: the same thing weighted by size in bytes (the honest number, since
 *    the small functions get matched first)
 */
export interface Progress {
  functions: Ratio;
  code: Ratio;
  /** Where the numbers come from. */
  source: string;
}
