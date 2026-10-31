import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/machine";
import { getMods } from "@/lib/mods";
import { mediaSrc, widthFor } from "@/lib/mods/logic";

// Rebuilt with the mod list, so a new mod is listed within minutes.
export const revalidate = 300;

/** Every page a search engine should know: the home page, the mod list and each mod, with its pictures and videos. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteUrl();
  const mods = await getMods();
  const newest = mods.reduce((t, m) => Math.max(t, Date.parse(m.updated)), 0);
  return [
    { url: `${site}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${site}/mods`, lastModified: newest ? new Date(newest) : new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${site}/mods/submit`, changeFrequency: "monthly", priority: 0.5 },
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
