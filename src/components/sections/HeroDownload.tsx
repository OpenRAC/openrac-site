"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { detectPlatform } from "@/lib/platform";
import type { PlatformId } from "@/lib/releases";

const NAMES: Record<PlatformId, string> = { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android" };
const noChange = () => () => {};
function browserPlatform(): PlatformId | null {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return detectPlatform(nav.userAgent, nav.userAgentData?.platform);
}
/** "25 Oct 2026", the same on the server and in the browser. */
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * The hero's one download button, for the visitor's own system once the browser tells it (the
 * server renders the plain one), with "Other systems" and the release it gives beside it.
 */
export default function HeroDownload({ version, date, ready }: { version: string | null; date: string | null; ready: PlatformId[] }) {
  const mine = useSyncExternalStore(noChange, browserPlatform, () => null);
  const direct = mine && ready.includes(mine) ? mine : null;
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 max-[700px]:flex-col max-[700px]:gap-y-4">
      <a
        id="download-button"
        href={direct ? `/download/${direct}` : "/install"}
        className="inline-flex min-h-12 items-center gap-2.5 rounded-md bg-amber px-6 text-[16px] font-semibold text-[#1b1206] no-underline shadow-[0_10px_30px_-10px_rgb(245_166_35/0.6)] transition-colors hover:bg-gold"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[18px] flex-none fill-none stroke-current stroke-2">
          <path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {direct ? `Download for ${NAMES[direct]}` : "Download the launcher"}
      </a>
      <p className="text-[15px] leading-snug text-dim">
        <Link href="/install" className="font-semibold text-hi no-underline hover:text-amber">
          Other systems →
        </Link>
        {version && (
          <span className="block text-[13px]">
            v{version}
            {date && <> · <time dateTime={date}>{shortDate(date)}</time></>}
          </span>
        )}
      </p>
    </div>
  );
}
