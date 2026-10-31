"use client";

import { useState, type CSSProperties } from "react";
import { mediaSrc } from "@/lib/mods/logic";
import type { SlimImage } from "@/lib/mods/slim";

/**
 * A picture from the mod index: AVIF, then WebP, at the widths the index build made, sized by
 * `sizes`. It sits on its own average colour until it loads, so nothing jumps and no grey box shows.
 * Not next/image: these files are already optimized, so the server does no work for them. A file
 * that fails to load leaves just the colour, never a broken-picture icon.
 */
export default function ModImage({
  img,
  sizes,
  alt = "",
  className = "",
  priority = false,
  style,
}: {
  img: SlimImage;
  sizes: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  const set = (ext: "avif" | "webp") => img.widths.map((w) => `${mediaSrc(img, w, ext)} ${w}w`).join(", ");
  const fallback = mediaSrc(img, img.widths.find((w) => w >= 960) ?? img.widths[img.widths.length - 1], "webp");
  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={set("webp")} sizes={sizes} />
      <img
        src={fallback}
        alt={alt}
        width={img.w}
        height={img.h}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onError={() => setFailed(true)}
        // A picture that failed before the page woke up never fires onError here: check it once on mount.
        ref={(el) => {
          if (el?.complete && el.naturalWidth === 0 && el.currentSrc) setFailed(true);
        }}
        className={`${className} ${failed ? "invisible" : ""}`}
        style={{ backgroundColor: img.color, ...style }}
      />
    </picture>
  );
}
