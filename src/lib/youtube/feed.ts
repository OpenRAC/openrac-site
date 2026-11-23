const ID = /^[A-Za-z0-9_-]{11}$/;

export interface FeedVideo {
  id: string;
  title: string;
  /** ISO date, as the feed gives it. */
  published: string;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (all, e: string) => {
    if (e[0] !== "#") return ENTITIES[e] ?? all;
    const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
  });
}

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1];

/** The newest video in a channel's YouTube feed (videos.xml). Shorts are left out. */
export function parseLatestVideo(xml: string): FeedVideo | null {
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = tag(entry, "yt:videoId");
    if (!id || !ID.test(id) || entry.includes("/shorts/")) continue;
    const title = decode(tag(entry, "title") ?? "").trim();
    if (!title) continue;
    return { id, title, published: tag(entry, "published") ?? "" };
  }
  return null;
}

/** The title for a short spot: the part after "Series name — ", if there is one. */
export function shortTitle(title: string): string {
  const at = title.indexOf(" — ");
  const rest = at >= 0 ? title.slice(at + 3).trim() : "";
  return rest || title;
}
