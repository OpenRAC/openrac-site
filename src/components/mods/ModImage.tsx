"use client";

import { useState, type CSSProperties } from "react";
import { mediaSrc } from "@/lib/mods/logic";
import type { SlimImage } from "@/lib/mods/slim";

/**
 * A picture from the mod index: AVIF, then WebP, at the widths the index build made, sized by
 * `sizes`. It sits on its own average colour until it loads, so nothing jumps and no grey box shows.
 * Not next/image: these files are already optimized, so the server does no work for them. A file
 * that fails to load leaves just the colour, never a broken-picture icon. While it loads, its colour
 * shows as a skeleton with a soft light passing over it; then the picture fades in.
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
  // "cached": already there when the page woke up, so it shows at once with no fade.
  const [state, setState] = useState<"loading" | "loaded" | "cached">("loading");
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
        onLoad={() => setState((v) => (v === "loading" ? "loaded" : v))}
        // A picture that failed or loaded before the page woke up fires no event here: check it once on mount.
        ref={(el) => {
          if (el?.complete && el.naturalWidth === 0 && el.currentSrc) setFailed(true);
          else if (el?.complete && el.naturalWidth > 0) setState((v) => (v === "loading" ? "cached" : v));
        }}
        data-img={failed ? "failed" : state}
        className={`mod-img ${className} ${failed ? "invisible" : ""}`}
        style={{ backgroundColor: img.color, ...style }}
      />
    </picture>
  );
}
