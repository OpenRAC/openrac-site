import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/blog";
import { blogIndexLd, ldJson, SHARE_IMAGE, siteUrl } from "@/lib/machine";

export const metadata: Metadata = {
  title: "Blog",
  description: "News and notes from the OpenRAC community decompilation projects.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/blog/rss.xml" },
  },
  openGraph: {
    title: "Blog · OpenRAC",
    description: "News and notes from the OpenRAC community decompilation projects.",
    url: "/blog",
    type: "website",
    siteName: "OpenRAC",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog · OpenRAC",
    description: "News and notes from the OpenRAC community decompilation projects.",
    images: [SHARE_IMAGE],
  },
};

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The list of blog posts, newest first. */
export default async function BlogIndex() {
  const posts = await getPosts();

  return (
    <main className="mx-auto max-w-[820px] px-4 pb-20 pt-12 sm:pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(blogIndexLd(siteUrl())) }} />
      <span className="font-orbitron text-[13px] font-bold tracking-[.3em] text-brand">NEWS AND NOTES</span>
      <h1 className="mb-2 mt-2 font-audiowide text-[clamp(32px,6vw,52px)] leading-tight">Blog</h1>
      <p className="mb-10 text-soft">
        Updates from the decompilation projects and the people behind them.{" "}
        <a href="/blog/rss.xml" className="text-amber">RSS feed</a>
      </p>

      {posts.length === 0 ? (
        <p className="text-dim">No posts yet.</p>
      ) : (
        <ul className="grid gap-5">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="surface surface-link block p-5 no-underline sm:p-6"
              >
                <p className="text-[13px] text-dim">
                  <time dateTime={p.date}>{fmtDate(p.date)}</time> · {p.minutes} min read{p.draft ? " · DRAFT" : ""}
                </p>
                <h2 className="mt-1 font-orbitron text-xl font-bold text-gold">{p.title}</h2>
                <p className="mt-2 text-soft">{p.summary}</p>
                {p.tags.length > 0 && (
                  <p className="mt-3 flex flex-wrap gap-2">
                    {p.tags.map((t) => (
                      <span key={t} className="rounded-full bg-hi/10 px-2.5 py-0.5 text-xs text-hi">{t}</span>
                    ))}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
