"use client";

import Link from "next/link";
import SectionArt from "@/components/ui/SectionArt";
import { NEWS_FOLDER } from "@/lib/news/logic";

/**
 * When a news page cannot be built. Says what failed and what to do next; the site around it keeps
 * working. `retry` (not `reset`) so the server is asked for the page again.
 */
export default function NewsError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto grid max-w-[1080px] justify-items-center gap-4 px-4 py-24 text-center">
      <SectionArt id="news" className="h-20 w-auto" />
      <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] text-hi">We couldn&apos;t load this news</h1>
      <p className="max-w-[520px] text-soft">Something went wrong on our side while showing this page. The rest of the site still works</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <button type="button" className="btn btn-primary" onClick={retry}>
          Try again
        </button>
        <Link href="/news" className="btn">
          All news
        </Link>
        <a href={NEWS_FOLDER} className="btn">
          The data on GitHub
        </a>
      </div>
      {error.digest && <p className="text-[12px] text-dim">If you report this, mention: {error.digest}</p>}
    </main>
  );
}
