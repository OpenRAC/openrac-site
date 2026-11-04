import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/machine";
import { getModCatalog } from "@/lib/mods";
import { isWithdrawn, mediaSrc, widthFor } from "@/lib/mods/logic";
import { getNewsIndex } from "@/lib/news";

// Rebuilt with the mod list, so a new mod is listed within minutes.
export const revalidate = 300;

/** Every page a search engine should know: the home page, the mod list and each mod, with its pictures and videos, and each week with a written report. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteUrl();
  const { catalog } = await getModCatalog();
  // Mods taken off the list (revoked as a whole) keep a page but are not offered to search engines.
  const mods = catalog.mods.filter((m) => !isWithdrawn(catalog.revoked, m.id));
  const newest = mods.reduce((t, m) => Math.max(t, Date.parse(m.updated)), 0);
  // Weeks with only facts are thin pages: only written reports are offered.
  const news = ((await getNewsIndex())?.index.weeks ?? []).filter((w) => w.report);
  return [
    { url: `${site}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${site}/mods`, lastModified: newest ? new Date(newest) : new Date(), changeFrequency: "daily", priority: 0.9 },
    ...(news.length ? [{ url: `${site}/news`, lastModified: new Date(`${news[0].end}T23:59:59Z`), changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    ...news.map((w) => ({ url: `${site}/news/${w.week}`, lastModified: new Date(`${w.end}T23:59:59Z`), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...mods.map((m) => {
      const pics = [m.media.banner, ...m.media.screenshots].filter((i) => i !== null);
      return {
        url: `${site}/mods/${m.id}`,
        lastModified: new Date(m.updated),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        images: pics.map((i) => `${site}${mediaSrc(i, widthFor(i, 1600), "webp")}`),
        videos: m.media.videos.map((v) => ({
          title: v.title ?? `${m.name}: ${v.caption ?? "video"}`,
          description: v.caption ?? m.description,
          thumbnail_loc: `https://i.ytimg.com/vi/${v.youtube}/hqdefault.jpg`,
          player_loc: `https://www.youtube-nocookie.com/embed/${v.youtube}`,
        })),
      };
    }),
  ];
}
