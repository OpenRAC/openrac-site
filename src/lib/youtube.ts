import { parseVideoId } from "./youtube-parse";

export interface VideoInfo {
  id: string;
  title?: string;
  channel?: string;
  channelUrl?: string;
  /** Thumbnail on i.ytimg.com. It is fetched by our server (next/image), never by the visitor's browser. */
  thumbnail?: string;
}

/** Title, channel and thumbnail from YouTube's public oEmbed endpoint. Falls back to just the id. */
export async function getVideoInfo(input: string): Promise<VideoInfo | null> {
  const id = parseVideoId(input);
  if (!id) return null;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`,
      { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8_000) },
    );
    if (!res.ok) return { id };
    const j = (await res.json()) as { title?: string; author_name?: string; author_url?: string; thumbnail_url?: string };
    const thumbnail = j.thumbnail_url?.startsWith("https://i.ytimg.com/vi/") ? j.thumbnail_url : undefined;
    const channelUrl = j.author_url?.startsWith("https://www.youtube.com/") ? j.author_url : undefined;
    return { id, title: j.title, channel: j.author_name, channelUrl, thumbnail };
  } catch {
    return { id };
  }
}
