"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A video that costs nothing until it is played: no YouTube scripts, cookies or
 * requests from the visitor's browser happen before the click. Then the privacy
 * enhanced player (youtube-nocookie.com) is loaded.
 */
/** `plain`: just the picture and a quiet play button, for pages in the docs look (a mod's showcase); its caption is the page's own. */
export default function YouTubeFacade({ id, title, thumbnail, label, plain = false }: { id: string; title: string; thumbnail?: string; label?: string; plain?: boolean }) {
  const [playing, setPlaying] = useState(false);
  // The cover fades in over a skeleton rather than popping up.
  const [shown, setShown] = useState(false);

  return (
    <div className={plain ? "bg-ink-deep" : "overflow-hidden rounded-xl bg-black shadow-[0_12px_32px_rgb(0_0_0/0.4)]"}>
      <div className="relative aspect-video">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
            className="group absolute inset-0 flex cursor-pointer items-center justify-center bg-gradient-to-br from-panel-hi to-ink"
          >
            {thumbnail && !shown && <span aria-hidden className="skeleton absolute inset-0 rounded-none" />}
            {thumbnail && (
              <Image src={thumbnail} alt="" fill sizes="(min-width: 1080px) 340px, (min-width: 640px) 45vw, 100vw" onLoad={() => setShown(true)} className={`object-cover transition-opacity duration-500 ${shown ? "opacity-100" : "opacity-0"}`} />
            )}
            <span aria-hidden className={`absolute inset-0 ${plain ? "bg-black/15 transition-colors duration-300 group-hover:bg-black/5" : "bg-black/30"}`} />
            <span
              aria-hidden
              className={
                plain
                  ? "relative flex size-14 items-center justify-center rounded-full bg-black/55 text-text ring-1 ring-white/15 backdrop-blur-sm transition duration-300 group-hover:scale-105 group-hover:bg-amber group-hover:text-[#1a0d00] group-hover:ring-0"
                  : "relative flex size-16 items-center justify-center rounded-full bg-brand text-[#1a0d00] shadow-[0_6px_24px_rgb(0_0_0/0.5)]"
              }
            >
              {/* The triangle sits a little right of its box centre so it looks centred. */}
              <svg viewBox="0 0 24 24" className="size-7 fill-current"><path d="M7.5 5v14l11-7z" /></svg>
            </span>
          </button>
        )}
      </div>
      {!plain && (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-panel px-4 py-3">
        <div className="min-w-0">
          {label && <p className="mb-0.5 font-orbitron text-[11px] font-semibold tracking-wider text-brand">{label.toUpperCase()}</p>}
          <p className="line-clamp-2 text-sm font-medium text-text">{title}</p>
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${id}`}
          className="inline-flex flex-none items-center gap-1 font-orbitron text-[10px] font-semibold uppercase tracking-wider text-dim no-underline transition-colors hover:text-amber"
        >
          YouTube
          <svg viewBox="0 0 24 24" aria-hidden className="size-3 fill-none stroke-current stroke-[2.5]"><path d="M7 17 17 7M8 7h9v9" /></svg>
        </a>
        </div>
      )}
    </div>
  );
}
