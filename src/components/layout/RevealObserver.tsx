"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Adds `.in` to every `[data-reveal]` element when it scrolls into view. Renders nothing.
 * It lives in the layout, so it looks again after every client-side navigation (blog to home).
 */
export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      // as soon as its top passes the lower tenth of the screen; a ratio threshold could never be met by a section taller than the screen
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
