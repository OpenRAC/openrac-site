import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import { getPost, getPosts } from "@/lib/blog";
import { ldJson, postLd, siteUrl } from "@/lib/machine";

// Known posts are built ahead; any other address is looked up and answered with a 404 (notFound below).
export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  return {
    title: `${post.title} · OpenRAC`,
    description: post.summary,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.summary, publishedTime: post.date, tags: post.tags },
  };
}

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const post = await getPost((await params).slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-[760px] px-4 pb-20 pt-10 sm:pt-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(postLd(siteUrl(), post)) }} />
      <Link href="/blog" className="text-sm text-amber no-underline hover:underline">← All posts</Link>
      <article>
        <header className="mb-8 mt-5">
          <p className="text-[13px] text-dim">
            <time dateTime={post.date}>{fmtDate(post.date)}</time> · {post.minutes} min read
            {post.author ? ` · ${post.author}` : ""}
            {post.draft ? " · DRAFT" : ""}
          </p>
          <h1 className="mt-2 font-audiowide text-[clamp(28px,5vw,44px)] leading-tight">{post.title}</h1>
          {post.tags.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span key={t} className="rounded-full bg-lav/10 px-2.5 py-0.5 text-xs text-lav">{t}</span>
              ))}
            </p>
          )}
        </header>
        <Markdown>{post.body}</Markdown>
      </article>
    </main>
  );
}
