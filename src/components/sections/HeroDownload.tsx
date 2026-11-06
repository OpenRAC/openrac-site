"use client";

import { type MouseEvent, useEffect } from "react";
import { useBrowserPlatform } from "@/components/ui/useBrowserPlatform";
import type { PlatformId } from "@/lib/releases";

/** "25 Oct 2026", the same on the server and in the browser. */
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Glides down to the progress cards (jumps for "reduce motion"), keeping the address clean. */
function toProgress(e: MouseEvent<HTMLAnchorElement>) {
  const target = document.getElementById("progress");
  if (!target || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/**
 * The hero's one download button, for the visitor's own system once the browser tells it (the
 * server renders the plain one), a button down to the progress, and the release it gives.
 */
export default function HeroDownload({ version, date, ready }: { version: string | null; date: string | null; ready: { id: PlatformId; name: string }[] }) {
  const mine = useBrowserPlatform();
  const direct = ready.find((p) => p.id === mine) ?? null;
  // The downloads used to fold out on this page at #download: old links go to their own page now.
  useEffect(() => {
    if (location.hash === "#download") location.replace("/install");
  }, []);
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 max-[700px]:mt-10 max-[700px]:flex-col max-[700px]:gap-y-5">
      <a
        id="download-button"
        href={direct ? `/download/${direct.id}` : "/install"}
        className="inline-flex min-h-12 items-center gap-2.5 rounded-md bg-amber px-6 text-[16px] font-semibold text-[#1b1206] no-underline shadow-[0_10px_30px_-10px_rgb(245_166_35/0.6)] transition-colors hover:bg-gold"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[18px] flex-none fill-none stroke-current stroke-2">
          <path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {direct ? `Download for ${direct.name}` : "Download the launcher"}
      </a>
      {/* The second action: down to the progress of every game. */}
      <a href="#progress" onClick={toProgress} className="btn gap-2 no-underline">
        See progress
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 flex-none fill-none stroke-current stroke-2">
          <path d="M8 3v10m-4-4 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
      {version && (
        <p className="text-[13px] leading-snug text-dim">
          v{version}
          {date && <> · <time dateTime={date}>{shortDate(date)}</time></>}
        </p>
      )}
    </div>
  );
}
