"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { shortTitle } from "@/lib/youtube/feed";
import type { LatestVideo as Video } from "@/lib/youtube";

/** "18 NOV": the day the video went up. Fixed to UTC, so server and browser agree. */
const day = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).toUpperCase();
};

const play = <path d="M8 5v14l11-7z" />;

/**
 * The channel's newest video on the first screen. Nothing from YouTube loads until it is pressed:
 * the thumbnail comes through our server, and the press opens the privacy enhanced player in a dialog.
 * "hud" is a row under the stats in the top corner (wide screens); "pill" sits under the release pill
 * (phones). fill makes the pill as wide as the pill above it, cutting its title with "...".
 */
export default function LatestVideo({ video, look, fill = false }: { video: Video; look: "hud" | "pill"; fill?: boolean }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const date = day(video.published);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const label = `Play the latest video: ${video.title}`;
  const button =
    look === "hud" ? (
      <button type="button" onClick={() => setOpen(true)} aria-label={label} className="group mt-5 ml-auto flex cursor-pointer items-center justify-end gap-3 text-right">
        <span className="min-w-0 max-w-[190px]">
          <small className="block font-mono text-[11px] font-semibold tracking-[.08em] text-body">
            NEW VIDEO{date && <> · <b className="text-amber">{date}</b></>}
          </small>
          {/* Two lines at most, then "...". The halo is a drop-shadow here: a text-shadow would be cut off at the clipped box. */}
          <span className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug text-text transition-colors [overflow-wrap:anywhere] [text-shadow:none] [filter:drop-shadow(0_0_4px_rgb(5_5_5/.9))_drop-shadow(0_0_10px_rgb(5_5_5/.6))] group-hover:text-amber">
            {video.title}
          </span>
        </span>
        <span className="relative aspect-video w-[136px] flex-none overflow-hidden rounded-xl bg-ink-deep shadow-[0_6px_20px_rgb(0_0_0/.45)]">
          <Image src={video.thumbnail} alt="" fill sizes="136px" className="object-cover" />
          <span aria-hidden className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-[34px] items-center justify-center rounded-full bg-ink/70 text-text transition-colors group-hover:bg-ink/90">
              <svg viewBox="0 0 24 24" className="size-[17px] fill-current">{play}</svg>
            </span>
          </span>
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className={`${fill ? "w-0 min-w-full" : "max-w-full"} flex cursor-pointer items-center gap-2 rounded-full border-0 bg-coal py-1 pl-1 pr-4 text-left text-[13px] leading-snug text-soft backdrop-blur-sm transition-colors hover:bg-coal-hi min-[701px]:hidden`}
      >
        <span className="relative h-[26px] w-[46px] flex-none overflow-hidden rounded-full bg-ink-deep">
          <Image src={video.thumbnail} alt="" fill sizes="46px" className="object-cover" />
          <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-ink/35">
            <svg viewBox="0 0 24 24" className="size-3 fill-text">{play}</svg>
          </span>
        </span>
        <span className="min-w-0 truncate">
          <b className="font-semibold text-text">New video:</b> {shortTitle(video.title)}
        </span>
      </button>
    );

  return (
    <>
      {button}
      <dialog
        ref={dialog}
        aria-label={video.title}
        onClose={() => setOpen(false)}
        // A press on the dark backdrop (the dialog itself, outside its box) closes it.
        onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        className="m-auto w-[min(960px,calc(100vw-32px))] max-w-none overflow-hidden rounded-xl bg-coal p-0 text-left text-text [text-shadow:none] backdrop:bg-black/80"
      >
        {open && (
          <>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5">
              <p className="min-w-0 truncate text-[14px] font-medium">{video.title}</p>
              <button type="button" className="btn btn-sm" onClick={() => setOpen(false)} autoFocus>
                Close
              </button>
            </div>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
              title={video.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="block aspect-video w-full bg-black"
            />
          </>
        )}
      </dialog>
    </>
  );
}
