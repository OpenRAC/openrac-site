/**
 * People to credit. A video is a YouTube link (watch, youtu.be or embed) or a bare video id,
 * optionally with a label such as the game it is about. The Credits section stays hidden
 * until at least one video or link is listed. Someone with a link but no videos is credited
 * in a short "Also thanks to" line instead of a video row.
 */
export type CreditVideo = string | { url: string; label: string };

export interface Credit {
  name: string;
  /** Link to their channel or profile. Defaults to the channel YouTube reports for the first video. */
  url?: string;
  /** GitHub user name; their profile picture is shown next to the name. */
  githubUser?: string;
  /** More places to find them, e.g. GitHub. Shown next to the name. */
  links?: { label: string; url: string }[];
  /** One line about what they did (optional). */
  blurb?: string;
  videos: CreditVideo[];
}

export const CREDITS: Credit[] = [
  {
    name: "Bordplate",
    githubUser: "bordplate",
    links: [
      { label: "YouTube", url: "https://www.youtube.com/@bordplate." },
      { label: "GitHub", url: "https://github.com/bordplate" },
    ],
    videos: [],
  },
  {
    name: "The Golden Bolt",
    videos: [
      { url: "https://www.youtube.com/watch?v=BNSbXZgrDcY", label: "Ratchet & Clank" },
      { url: "https://youtu.be/AVQwM8Fr3YI", label: "Going Commando" },
      { url: "https://youtu.be/i55EWQWKQuo", label: "Up Your Arsenal" },
    ],
  },
];
