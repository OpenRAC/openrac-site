import { appToken } from "../githubApp.ts";

/**
 * Small guards for calling GitHub from the server. Their state lives in this server's memory: one
 * site process behind one proxy, so nothing has to be shared.
 */

/**
 * The server's GitHub token, or none. Trimmed: an env file written on another system can leave a
 * trailing space or "\r", which Node's fetch refuses as a header value before anything is sent.
 */
export const githubToken = () => process.env.GITHUB_TOKEN?.trim() || undefined;

/** The token for GitHub calls: the OpenRAC GitHub App's when it is set up, else GITHUB_TOKEN, else none. */
export async function serverToken(): Promise<string | undefined> {
  return (await appToken()) ?? githubToken();
}

let refusedUntil = 0;

/**
 * A request to GitHub's API with the server's token, when it has one. If GitHub refuses the token
 * itself (401, or 403 while requests are left: expired, revoked, or not allowed by an organization's
 * rules), the request is made again without it and the token is left out for ten minutes, so a token
 * problem degrades to the lower anonymous rate limit instead of breaking every feed. GitHub's reason
 * is logged once per window (it never contains the token).
 */
export async function githubApi(url: string, init: RequestInit & { next?: { revalidate?: number } } = {}, now = Date.now()): Promise<Response> {
  const token = now < refusedUntil ? undefined : await serverToken();
  const withAuth = (t?: string) => ({ ...init, headers: { ...(init.headers as Record<string, string>), ...(t && { Authorization: `Bearer ${t}` }) } });
  const res = await fetch(url, withAuth(token));
  const refused = token && (res.status === 401 || (res.status === 403 && res.headers.get("x-ratelimit-remaining") !== "0"));
  if (!refused) return res;
  refusedUntil = now + 600_000;
  let reason = "";
  try {
    reason = String(((await res.json()) as { message?: unknown }).message ?? "").slice(0, 300);
  } catch {}
  console.error(JSON.stringify({ level: "error", code: "github_token_refused", status: res.status, reason }));
  return fetch(url, withAuth(undefined));
}

/** For tests: forget a refused token. */
export const resetGithubToken = () => void (refusedUntil = 0);

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
