"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The mod page's own contents, stuck under the header: the section crossing the middle of the screen
 * is marked, as the header does on the home page. An IntersectionObserver, so scrolling runs no script.
 */
export default function InPageNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [sections]);
  // Once stuck under the header, its fill runs the full width and up behind the header, so no strip of
  // the page shows between the two. A 1 px mark just above it tells when it is stuck.
  const mark = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = mark.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 51), { rootMargin: "-51px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
    <div ref={mark} aria-hidden className="h-px" />
    <nav
      aria-label="On this page"
      data-stuck={stuck ? "" : undefined}
      className="sticky top-[50px] z-10 -mx-4 -mt-px border-b border-line bg-ink px-4 before:pointer-events-none before:absolute before:inset-x-[calc(50%-50vw)] before:-top-[62px] before:bottom-0 before:-z-10 before:hidden before:border-b before:border-line before:bg-ink before:content-[''] data-[stuck]:border-transparent data-[stuck]:bg-transparent data-[stuck]:before:block"
    >
      <ul className="flex gap-1 overflow-x-auto py-1.5 [scrollbar-width:none]">
        {sections.map((s) => (
          <li key={s.id} className="flex-none">
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className={`flex min-h-11 items-center rounded-md px-3.5 font-orbitron text-[12px] font-bold uppercase tracking-[.14em] no-underline transition-colors ${active === s.id ? "bg-amber/15 text-amber" : "text-soft hover:text-hi"}`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
    </>
  );
}
