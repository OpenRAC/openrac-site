"use client";

import Link from "next/link";
import SectionArt from "@/components/ui/SectionArt";

/** When one mod's page fails, the rest of the site keeps working; the code matches the server's log line. */
export default function ModError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto grid max-w-[1080px] justify-items-center gap-4 px-4 py-24 text-center">
      <SectionArt id="mods" className="h-20 w-auto" />
      <h1 className="font-audiowide text-[clamp(26px,4vw,38px)] text-hi">This mod page did not load</h1>
      <p className="max-w-[480px] text-dim">Something went wrong on our side. Try again, or go back to the list.{error.digest ? ` Error code: ${error.digest}` : ""}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/mods" className="btn">
          Back to mods
        </Link>
      </div>
    </main>
  );
}
