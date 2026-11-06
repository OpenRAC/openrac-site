"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Where each page was left, so Back and Forward return there. */
const places = new Map<string, number>();

/**
 * A new page opens at its top. The view transitions and the sticky bar can leave the router's own
 * scroll where it was, so do it here. Back and Forward return to where that page was left (the
 * router's guess lands wrong on long lists that draw lazily), and a link to a #section keeps its jump.
 */
export default function ScrollReset() {
  const path = usePathname();
  const shown = useRef<string | null>(null);
  const back = useRef(false);
  useEffect(() => {
    let frame = 0;
    const note = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => shown.current && places.set(shown.current, scrollY));
    };
    const pop = () => {
      back.current = true;
    };
    window.addEventListener("scroll", note, { passive: true });
    window.addEventListener("popstate", pop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", note);
      window.removeEventListener("popstate", pop);
    };
  }, []);
  useEffect(() => {
    const before = shown.current;
    shown.current = path;
    if (before === null || before === path) return;
    if (back.current) {
      back.current = false;
      const top = places.get(path) ?? 0;
      // Twice, after the page has drawn: lazy lists grow in the first frame.
      requestAnimationFrame(() => {
        window.scrollTo({ top, behavior: "instant" });
        requestAnimationFrame(() => window.scrollTo({ top, behavior: "instant" }));
      });
      return;
    }
    if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [path]);
  return null;
}
