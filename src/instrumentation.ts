/**
 * One JSON line in the server log for every error Next catches while rendering or answering a route.
 * The digest is the "Error code" the error pages show, so a player's report can be matched to its
 * line. Only the path is logged: no query string, headers or bodies (no IPs, no tokens).
 */
export function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string; revalidateReason?: string },
) {
  const e = error as { name?: string; message?: string; digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      code: "request_error",
      digest: e?.digest ?? null,
      route: context.routePath,
      type: context.routeType,
      revalidate: context.revalidateReason ?? null,
      method: request.method,
      path: request.path.split("?")[0],
      error: `${e?.name ?? "Error"}: ${e?.message ?? String(error)}`.slice(0, 300),
    }),
  );
}
