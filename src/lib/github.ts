/** Avatar of a GitHub user (public profile picture). Fetched by the server; null if it cannot be found. */
export async function getGithubAvatar(user: string): Promise<string | null> {
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(user)) return null;
  try {
    const headers: HeadersInit = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/users/${user}`, { headers, next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const { avatar_url } = (await res.json()) as { avatar_url?: string };
    return avatar_url?.startsWith("https://avatars.githubusercontent.com/") ? avatar_url : null;
  } catch {
    return null;
  }
}
