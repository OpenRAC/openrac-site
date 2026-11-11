"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Install in reach once the hero's own button has scrolled away, and out of the way until then. Stays
 * mounted while hidden, so a "Didn't open?" sheet opened from it survives scrolling back to the top.
 * Without JavaScript it stays hidden and the hero's button still works.
 */
export default function InstallBar({ watch, children }: { watch: string; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const target = document.getElementById(watch);
    if (!target) return;
    // The top margin is the fixed header and the page's nav: a button behind them is out of reach too.
    // The observer only says when to look; the answer comes from the button's place a frame later. Its
    // first report can be measured before a scroll that lands at the same moment (a page scrolled while
    // still loading), and it then says "on screen" with the page far down and never reports again.
    let frame = 0;
    const look = () => {
      const r = target.getBoundingClientRect();
      setShown(r.bottom <= 112 || r.top >= innerHeight);
    };
    const io = new IntersectionObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(look);
    }, { rootMargin: "-112px 0px 0px" });
    io.observe(target);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [watch]);
  return (
    <div
      inert={!shown}
      data-install-bar
      className={`fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-[translate,visibility] duration-200 motion-reduce:transition-none ${shown ? "" : "invisible translate-y-full"}`}
    >
      <div className="mx-auto flex max-w-[1080px] items-center gap-3">{children}</div>
    </div>
  );
}
