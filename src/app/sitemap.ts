import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = (process.env.SITE_URL ?? "https://openrac.dev").replace(/\/$/, "");
  const posts = await getPosts();
  return [
    { url: `${site}/` },
    { url: `${site}/blog` },
    ...posts.map((p) => ({ url: `${site}/blog/${p.slug}`, lastModified: p.date })),
  ];
}
