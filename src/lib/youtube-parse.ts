const ID = /^[A-Za-z0-9_-]{11}$/;

/** Accepts a watch / youtu.be / embed / shorts link, or a bare 11 character video id. */
export function parseVideoId(input: string): string | null {
  const value = input.trim();
  if (ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, kind, rest] = url.pathname.split("/");
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (kind === "embed" || kind === "shorts" || kind === "live") id = rest ?? null;
  }
  return id && ID.test(id) ? id : null;
}
