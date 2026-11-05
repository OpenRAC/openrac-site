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
 * server renders the plain one), then "or other platforms" and the release it gives.
 */
export default function HeroDownload({ version, date, ready }: { version: string | null; date: string | null; ready: PlatformId[] }) {
  const mine = useSyncExternalStore(noChange, browserPlatform, () => null);
  const direct = mine && ready.includes(mine) ? mine : null;
  return (
    <div className="mt-8 flex flex-col items-center">
      <a
        id="download-button"
        href={direct ? `/download/${direct}` : "/install"}
        className="inline-flex min-h-12 items-center gap-2.5 rounded-md border border-amber/80 px-6 text-[16px] font-semibold text-gold no-underline transition-colors hover:bg-amber/10"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[18px] flex-none fill-none stroke-amber stroke-2">
          <path d="M8 2v8m-3.5-3.5L8 10l3.5-3.5M3 13.5h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {direct ? `Download for ${NAMES[direct]}` : "Download the launcher"}
      </a>
      <p className="mt-3 text-[15px] text-dim">
        or{" "}
        <Link href="/install" className="text-hi no-underline hover:text-amber">
          other platforms
        </Link>
      </p>
      {version && (
        <p className="mt-1 text-[13px] text-dim">
          v{version}
          {date && <> · <time dateTime={date}>{shortDate(date)}</time></>}
        </p>
      )}
    </div>
  );
}
