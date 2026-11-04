"use client";

import Link from "next/link";
import SectionArt from "@/components/ui/SectionArt";

/** When the news fails, the rest of the site keeps working. */
export default function NewsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto grid max-w-[1080px] justify-items-center gap-4 px-4 py-24 text-center">
      <SectionArt id="activity" className="h-20 w-auto" />
      <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] text-hi">The news did not load</h1>
      <p className="max-w-[480px] text-dim">Something went wrong on our side. Try again in a moment.{error.digest ? ` (Reference: ${error.digest})` : ""}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn">
          Home
        </Link>
      </div>
    </main>
  );
}
