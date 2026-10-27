"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A card's backdrop. The files are not in the repository (see README), so one may be missing:
 * the picture stays invisible until it has loaded and fades in then. A missing one falls back to
 * `fallback` (mirrored, so two cards of one game never show the same picture), and with nothing
 * left the card keeps its own gradient instead of a broken-image icon.
 *
 * `zoom`: classes for the hover zoom. It runs on its own compositor layer, so it stays smooth.
 * `className`: extra classes for the outer box, such as a clip to the card's corners.
 */
export default function Backdrop({ src, fallback, zoom = "", className = "" }: { src: string; fallback?: string; zoom?: string; className?: string }) {
  const [current, setCurrent] = useState(src);
  const [shown, setShown] = useState(false);
  if (!current) return null;
  const mirrored = current !== src;
  return (
    <div aria-hidden className={`backdrop absolute inset-0 overflow-hidden transition-opacity duration-700 ${shown ? "opacity-100" : "opacity-0"} ${className}`}>
      <div className={`absolute inset-0 transform-gpu transition-transform duration-[1400ms] ease-[cubic-bezier(.22,.61,.36,1)] will-change-transform ${zoom}`}>
        <Image
          key={current}
          src={current}
          alt=""
          fill
          sizes="(min-width: 1080px) 1048px, 100vw"
          quality={70}
          onLoad={() => setShown(true)}
          onError={() => setCurrent(mirrored || !fallback ? "" : fallback)}
          className={`object-cover ${mirrored ? "-scale-x-100" : ""}`}
        />
      </div>
    </div>
  );
}
