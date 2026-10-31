import { getMods } from "@/lib/mods";
import { Breaker, RateLimiter, clientKey, githubApi } from "@/lib/mods/guard";
import { checkSubmission, parseRepo, type GitHubGet, type SubmitCheck } from "@/lib/mods/submit";

export const dynamic = "force-dynamic";

/** Ten checks at once per visitor, then one every six seconds. */
const limiter = new RateLimiter(10, 6_000);
const breaker = new Breaker();
const cache = new Map<string, { at: number; value: SubmitCheck | { error: string } }>();
const CACHE_MS = 300_000;

const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** GitHub's API only, with the server's token; a 404 is "not there", anything else a failure. */
const github: GitHubGet = async (path) => {
  const res = await githubApi(`https://api.github.com${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw Object.assign(new Error("github"), { status: res.status, path: path.split("?")[0] });
  return res.json();
};

/**
 * Checks a repository for /mods/submit. Answers are plain checklists, never GitHub's own error text,
 * the token or a stack. The address must be a github.com repository (so no other host can be reached
 * from here); each is cached for five minutes; a visitor is rate limited; and while GitHub fails, a
 * circuit breaker answers at once instead of piling up requests.
 */
export async function GET(req: Request) {
  const input = new URL(req.url).searchParams.get("repo") ?? "";
  if (!parseRepo(input)) return json({ error: "That is not a GitHub repository address. It looks like https://github.com/you/your-mod." }, 400);
  if (!limiter.take(clientKey(req.headers))) return json({ error: "That was a lot of checks in a row. Wait a few seconds and try again." }, 429);

  const key = input.trim().toLowerCase().replace(/(\.git)?\/?$/, "");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return json(hit.value);
  if (!breaker.allow()) return json({ error: "GitHub is slow to answer right now. Try again in a minute." }, 503);

  try {
    const value = await checkSubmission(input, github, await getMods());
    breaker.success();
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return json(value);
  } catch (e) {
    breaker.failure();
    // One line in the server log with GitHub's answer (never the token): 401 is a bad or expired
    // GITHUB_TOKEN, 403 or 429 the rate limit, 5xx GitHub itself.
    const { status, path } = e as { status?: number; path?: string };
    console.error(JSON.stringify({ level: "error", code: "submit_check_github", status: status ?? null, path: path ?? null, app: Boolean(process.env.GITHUB_APP_ID), token: Boolean(process.env.GITHUB_TOKEN), error: status ? undefined : `${(e as Error).name}: ${(e as Error).message}`.slice(0, 200) }));
    // The token being refused is handled in githubApi (it retries without), so a 403/429 here is the limit.
    const hint = status === 403 || status === 429 ? "GitHub's rate limit was reached." : "GitHub did not answer.";
    return json({ error: `${hint} Try again in a minute.` }, 503);
  }
}
