import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { byNewest, readingMinutes, SLUG, toMeta, type PostMeta } from "./blog-parse";

/** Posts are Markdown files in content/blog, so they go through normal pull requests. */
const DIR = path.join(process.cwd(), "content", "blog");

export interface Post extends PostMeta {
  body: string;
  minutes: number;
}

async function readPost(file: string): Promise<Post> {
  const slug = file.replace(/\.md$/, "");
  const { data, content } = matter(await fs.readFile(path.join(DIR, file), "utf8"));
  return { ...toMeta(slug, data), body: content.trim(), minutes: readingMinutes(content) };
}

const showDrafts = () => process.env.NODE_ENV !== "production";

/** All published posts, newest first. */
export async function getPosts(): Promise<Post[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    return []; // no posts yet
  }
  const posts = await Promise.all(files.map(readPost));
  return posts.filter((p) => showDrafts() || !p.draft).sort(byNewest);
}

export async function getPost(slug: string): Promise<Post | null> {
  if (!SLUG.test(slug)) return null; // also keeps the slug from ever reaching the file system as a path
  const post = await readPost(`${slug}.md`).catch(() => null);
  return post && (showDrafts() || !post.draft) ? post : null;
}
