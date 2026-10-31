/**
 * Small guards for the routes that call GitHub on a visitor's behalf. Both live in this server's
 * memory: one site process behind one proxy, so nothing has to be shared.
 */

/** A token bucket per key (an IP): `burst` at once, then one more every `refillMs`. */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();
  burst: number;
  refillMs: number;
  constructor(burst: number, refillMs: number) {
    this.burst = burst;
    this.refillMs = refillMs;
  }
  /** True when the request may go ahead. */
  take(key: string, now = Date.now()): boolean {
    const b = this.buckets.get(key) ?? { tokens: this.burst, at: now };
    b.tokens = Math.min(this.burst, b.tokens + (now - b.at) / this.refillMs);
    b.at = now;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(key, b);
    // Forget idle keys now and then, so the map cannot grow without end.
    if (this.buckets.size > 5000) for (const [k, v] of this.buckets) if (now - v.at > this.refillMs * this.burst) this.buckets.delete(k);
    return ok;
  }
}

/**
 * A circuit breaker (Nygard, "Release It!"): after `limit` failures within `windowMs` it opens and
 * refuses at once for `openMs`, so a GitHub outage does not pile up waiting requests; then one
 * request is let through to test the water (half-open).
 */
export class Breaker {
  private failures: number[] = [];
  private openUntil = 0;
  private probing = false;
  limit: number;
  windowMs: number;
  openMs: number;
  constructor(limit = 5, windowMs = 60_000, openMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.openMs = openMs;
  }
  /** True when a call may be made now. */
  allow(now = Date.now()): boolean {
    if (now < this.openUntil) return false;
    if (this.openUntil && !this.probing) {
      this.probing = true; // half-open: let one through
      return true;
    }
    return !this.probing;
  }
  success() {
    this.failures = [];
    this.openUntil = 0;
    this.probing = false;
  }
  failure(now = Date.now()) {
    this.probing = false;
    this.failures = [...this.failures.filter((t) => now - t < this.windowMs), now];
    if (this.failures.length >= this.limit) this.openUntil = now + this.openMs;
  }
}

/**
 * The visitor's address for rate limiting. X-Forwarded-For is set by our own reverse proxy; its last
 * entry is the one the proxy added, so a client cannot choose its own bucket by sending the header.
 */
export function clientKey(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",").pop()!.trim();
  return headers.get("x-real-ip") ?? "local";
}
