"use client";

import Link from "next/link";
import SectionArt from "@/components/ui/SectionArt";

/** When the mod list fails, the rest of the site keeps working. */
export default function ModsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto grid max-w-[1080px] justify-items-center gap-4 px-4 py-24 text-center">
      <SectionArt id="mods" className="h-20 w-auto" />
      <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] text-hi">The mod list did not load</h1>
      <p className="max-w-[480px] text-dim">Something went wrong on our side. Try again in a moment.{error.digest ? ` Error code: ${error.digest}` : ""}</p>
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
