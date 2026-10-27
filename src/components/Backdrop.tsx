"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A card's backdrop. The files are not in the repository (see README), so one may be missing:
 * the picture stays invisible until it has loaded, and a missing one leaves the card's own
 * gradient instead of a broken-image icon. It fades in once it is there.
 */
export default function Backdrop({ src, quality = 70 }: { src: string; quality?: 70 | 75 }) {
  const [state, setState] = useState<"loading" | "shown" | "missing">("loading");
  if (state === "missing") return null;
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="(min-width: 1080px) 1048px, 100vw"
      quality={quality}
      onLoad={() => setState("shown")}
      onError={() => setState("missing")}
      className={`backdrop object-cover transition-opacity duration-500 ${state === "shown" ? "opacity-100" : "opacity-0"}`}
    />
  );
}
