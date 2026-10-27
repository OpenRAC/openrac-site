import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/machine";

/** Every page a search engine should know: the home page, the blog and each post. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = siteUrl();
  const posts = await getPosts();
  return [
    {
      url: `${site}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${site}/blog`,
      lastModified: posts[0]?.date ? new Date(posts[0].date) : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...posts.map((p) => ({
      url: `${site}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
