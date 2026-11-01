"use client";

import { useEffect } from "react";

/**
 * Adds `.in` to every `[data-reveal]` element when it scrolls into view. Renders nothing.
 * It lives in the layout and keeps watching the page for new sections: after a client-side
 * navigation a page can stream in after the address changed (a mod page behind its loading
 * screen), and a section never seen would stay invisible.
 */
export default function RevealObserver() {
  useEffect(() => {
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
    // Observing an element twice is harmless, so each pass simply takes every one not yet shown.
    const scan = () => document.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)").forEach((el) => io.observe(el));
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (!queued) queued = requestAnimationFrame(() => { queued = 0; scan(); });
    });
    scan();
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
      cancelAnimationFrame(queued);
    };
  }, []);
  return null;
}
