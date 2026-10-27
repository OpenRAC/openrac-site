/**
 * A size in bytes the way people read it, in decimal units like a file manager: "545 bytes",
 * "31.1 KB", "2.45 MB". The unit follows the number, so a small and a large project both read well.
 */
export function formatSize(n: number): string {
  if (n < 1_000) return `${n} bytes`;
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)} KB`;
  return `${(n / 1_000_000).toFixed(2)} MB`;
}
