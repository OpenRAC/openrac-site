"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A video that costs nothing until it is played: no YouTube scripts, cookies or
 * requests from the visitor's browser happen before the click. Then the privacy
 * enhanced player (youtube-nocookie.com) is loaded.
 */
export default function YouTubeFacade({ id, title, thumbnail, label }: { id: string; title: string; thumbnail?: string; label?: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-black shadow-[0_12px_32px_rgb(0_0_0/0.4)]">
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
            className="group absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2a2a3a] to-ink"
          >
            {thumbnail && (
              <Image src={thumbnail} alt="" fill sizes="(min-width: 1080px) 340px, (min-width: 640px) 45vw, 100vw" className="object-cover transition duration-300 group-hover:scale-105" />
            )}
            <span aria-hidden className="absolute inset-0 bg-black/30 transition group-hover:bg-black/15" />
            <span aria-hidden className="relative flex size-16 items-center justify-center rounded-full bg-brand text-[#1a0d00] shadow-[0_6px_24px_rgb(0_0_0/0.5)] transition group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 size-7 fill-current"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </button>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 border-t border-line bg-panel px-4 py-3">
        <div className="min-w-0">
          {label && <p className="mb-0.5 font-orbitron text-[11px] font-semibold tracking-wider text-brand">{label.toUpperCase()}</p>}
          <p className="line-clamp-2 text-sm font-medium text-[#e3e9ff]">{title}</p>
        </div>
        <a href={`https://www.youtube.com/watch?v=${id}`} className="flex-none text-[13px] text-amber no-underline hover:underline">
          YouTube
        </a>
      </div>
    </div>
  );
}
