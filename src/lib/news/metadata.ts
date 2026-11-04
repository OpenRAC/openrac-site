import type { Metadata } from "next";

/** What every news page shares: its address, and the feed's. */
export const newsAlternates = (path: string): Metadata["alternates"] => ({
  canonical: path,
  types: { "application/rss+xml": [{ url: "/news.xml", title: "OpenRAC News" }] },
});
