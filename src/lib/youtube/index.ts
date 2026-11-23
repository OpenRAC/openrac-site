import { parseLatestVideo, type FeedVideo } from "./feed";
import { parseVideoId } from "./parse";

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

/** The OpenRAC YouTube channel (@OpenRAC). */
const CHANNEL_ID = "UCFJeXPneWbO6K6ulqx0UTPA";

export type LatestVideo = FeedVideo & { thumbnail: string };

/**
 * The channel's newest video, read from its public feed on our server (no API key), so a new upload
 * shows up on its own. Rechecked at most every 10 minutes. null when YouTube does not answer.
 */
export async function getLatestVideo(): Promise<LatestVideo | null> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, { next: { revalidate: 600 }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const video = parseLatestVideo(await res.text());
    return video && { ...video, thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` };
  } catch {
    return null;
  }
}
