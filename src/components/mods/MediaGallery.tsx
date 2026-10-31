"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import YouTubeFacade from "@/components/ui/YouTubeFacade";
import { youtubeThumb } from "@/lib/mods/logic";
import type { SlimImage } from "@/lib/mods/slim";
import ModImage from "./ModImage";

export type GalleryItem = { kind: "video"; youtube: string; title: string; caption?: string } | { kind: "image"; img: SlimImage; caption?: string; alt: string };

/**
 * The showcase: one big viewer and a strip of thumbnails, videos first. Nothing moves by itself. A
 * picture opens full screen in a dialog: arrow keys or a swipe go through them, Esc closes. YouTube
 * loads only when its play button is pressed (YouTubeFacade).
 */
export default function MediaGallery({ items, name }: { items: GalleryItem[]; name: string }) {
  const [at, setAt] = useState(0);
  const [full, setFull] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const item = items[at];
  const images = items.flatMap((x, i) => (x.kind === "image" ? [i] : []));

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (full && !d.open) d.showModal();
    if (!full && d.open) d.close();
  }, [full]);

  // In the lightbox, the swipe strip follows the arrows and the arrows follow the swipe.
  useEffect(() => {
    if (!full) return;
    const el = strip.current?.children[images.indexOf(at)] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "instant" as ScrollBehavior });
  }, [full, at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items.length) return null;
  const caption = item.caption ?? (item.kind === "video" ? item.title : "");

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-deep">
        {item.kind === "video" ? (
          <YouTubeFacade key={item.youtube} id={item.youtube} title={item.title} thumbnail={youtubeThumb(item.youtube)} label="Video" />
        ) : (
          <button type="button" onClick={() => setFull(true)} className="group block w-full cursor-zoom-in" aria-label={`Open ${item.alt} full screen`}>
            <ModImage img={item.img} sizes="(min-width: 1080px) 700px, 100vw" alt={item.alt} className="aspect-video w-full object-cover transition duration-500 group-hover:scale-[1.015]" />
          </button>
        )}
      </div>
      {caption && item.kind === "image" && <p className="mt-2 text-[14px] text-dim">{caption}</p>}

      {items.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="Pictures and videos">
          {items.map((x, i) => (
            <li key={i} className="flex-none">
              <button
                type="button"
                onClick={() => setAt(i)}
                aria-current={i === at ? "true" : undefined}
                aria-label={x.kind === "video" ? `Video: ${x.title}` : `Picture ${images.indexOf(i) + 1}: ${x.caption ?? x.alt}`}
                className={`relative block aspect-video w-[118px] overflow-hidden rounded-lg border-2 transition ${i === at ? "border-amber" : "border-transparent opacity-70 hover:opacity-100"}`}
              >
                {x.kind === "video" ? (
                  <>
                    <Image src={youtubeThumb(x.youtube)} alt="" fill sizes="118px" className="object-cover" />
                    <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg viewBox="0 0 24 24" className="size-6 fill-amber">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </>
                ) : (
                  <ModImage img={x.img} sizes="118px" className="size-full object-cover" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialog}
        aria-label={`${name} pictures`}
        onClose={() => setFull(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setAt(images[(images.indexOf(at) + 1) % images.length]);
          if (e.key === "ArrowLeft") setAt(images[(images.indexOf(at) - 1 + images.length) % images.length]);
        }}
        className="m-0 size-full max-h-none max-w-none bg-black/95 p-0 text-text backdrop:bg-black"
      >
        {full && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p aria-live="polite" className="min-w-0 truncate text-[15px] text-soft">
                Picture {images.indexOf(at) + 1} of {images.length}
                {caption ? `: ${caption}` : ""}
              </p>
              <button type="button" className="btn btn-sm" onClick={() => setFull(false)} autoFocus>
                Close
              </button>
            </div>
            {/* A swipe strip of the pictures: native scroll snapping, no script while swiping. */}
            <div
              ref={strip}
              className="flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
              onScroll={(e) => {
                const el = e.currentTarget;
                const n = Math.round(el.scrollLeft / el.clientWidth);
                if (images[n] !== undefined && images[n] !== at) setAt(images[n]);
              }}
            >
              {images.map((i) => {
                const x = items[i] as Extract<GalleryItem, { kind: "image" }>;
                return (
                  <div key={i} className="flex w-full flex-none snap-center items-center justify-center p-2 sm:p-6">
                    <ModImage img={x.img} sizes="100vw" alt={x.alt} className="max-h-full w-auto max-w-full object-contain" />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-3 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
              <button type="button" className="btn" onClick={() => setAt(images[(images.indexOf(at) - 1 + images.length) % images.length])} aria-label="Previous picture">
                ←
              </button>
              <button type="button" className="btn" onClick={() => setAt(images[(images.indexOf(at) + 1) % images.length])} aria-label="Next picture">
                →
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
