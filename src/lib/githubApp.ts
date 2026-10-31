import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * The site signs in to GitHub as the OpenRAC GitHub App: owned by the organization, not by a person,
 * with nothing to renew by hand. The app's private key signs a short JWT (10 minutes); GitHub swaps it
 * for an installation token that lasts an hour, kept here and replaced five minutes before it ends.
 *
 * Settings (all on the server only):
 *   GITHUB_APP_ID                  the app's id (its settings page, "App ID")
 *   GITHUB_APP_INSTALLATION_ID     optional: found by itself from GITHUB_APP_ORG when not set
 *   GITHUB_APP_ORG                 the organization it is installed on, default OpenRAC
 *   GITHUB_APP_PRIVATE_KEY_FILE    path to the .pem file GitHub gave (the container mounts it read-only)
 *   GITHUB_APP_PRIVATE_KEY         or the PEM text itself
 * Without them, or when GitHub refuses, callers fall back to GITHUB_TOKEN, then to no token.
 */

const API = "https://api.github.com";

export interface AppConfig {
  appId: string;
  installationId?: string;
  org: string;
  key: string;
}

/** The app settings from the environment, or null when the app is not set up. */
export function appConfig(env: Record<string, string | undefined> = process.env): AppConfig | null {
  const appId = env.GITHUB_APP_ID?.trim();
  if (!appId) return null;
  let key = env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!key && env.GITHUB_APP_PRIVATE_KEY_FILE) {
    try {
      key = readFileSync(env.GITHUB_APP_PRIVATE_KEY_FILE.trim(), "utf8").trim();
    } catch {
      log("github_app_key_unreadable", { file: env.GITHUB_APP_PRIVATE_KEY_FILE.trim() });
      return null;
    }
  }
  if (!key) return null;
  return { appId, installationId: env.GITHUB_APP_INSTALLATION_ID?.trim() || undefined, org: env.GITHUB_APP_ORG?.trim() || "OpenRAC", key };
}

const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

/** The app's own JWT (RS256), as GitHub asks: issued a minute in the past for clock drift, valid 9 minutes. */
export function appJwt(appId: string, key: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000) - 60;
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ iat, exp: iat + 540, iss: appId }));
  const signature = createSign("RSA-SHA256").update(`${head}.${body}`).sign(key);
  return `${head}.${body}.${b64url(signature)}`;
}

function log(code: string, extra: Record<string, unknown>) {
  console.error(JSON.stringify({ level: "error", code, ...extra }));
}

type Fetcher = typeof fetch;

let cached: { token: string; until: number } | null = null;
let inflight: Promise<string | undefined> | null = null;
let failedUntil = 0;

/** The installation token, made or reused; undefined when the app is not set up or GitHub refused it (retried after a minute). */
export async function appToken(config = appConfig(), doFetch: Fetcher = fetch, now = Date.now()): Promise<string | undefined> {
  if (!config) return undefined;
  if (cached && now < cached.until) return cached.token;
  if (now < failedUntil) return undefined;
  inflight ??= (async () => {
    try {
      const jwt = appJwt(config.appId, config.key, now);
      const headers = { Authorization: `Bearer ${jwt}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
      let id = config.installationId;
      if (!id) {
        const res = await doFetch(`${API}/orgs/${encodeURIComponent(config.org)}/installation`, { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw Object.assign(new Error("installation"), { status: res.status });
        id = String(((await res.json()) as { id: number }).id);
      }
      const res = await doFetch(`${API}/app/installations/${encodeURIComponent(id)}/access_tokens`, { method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw Object.assign(new Error("access_tokens"), { status: res.status });
      const { token, expires_at } = (await res.json()) as { token: string; expires_at: string };
      // Replaced five minutes early, so a request never goes out with a token about to end.
      cached = { token, until: Date.parse(expires_at) - 300_000 };
      return token;
    } catch (e) {
      failedUntil = now + 60_000;
      const { status } = e as { status?: number };
      log("github_app_token_failed", { step: (e as Error).message, status: status ?? null });
      return undefined;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** For tests: forget the token and any failure. */
export function resetAppToken() {
  cached = null;
  inflight = null;
  failedUntil = 0;
}
