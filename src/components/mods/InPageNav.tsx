"use client";

import { useEffect, useState } from "react";

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
  return (
    <nav aria-label="On this page" className="sticky top-[50px] z-10 -mx-4 border-b border-line bg-ink/90 px-4 backdrop-blur-md">
      <ul className="flex gap-1 overflow-x-auto py-1.5 [scrollbar-width:none]">
        {sections.map((s) => (
          <li key={s.id} className="flex-none">
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className={`flex min-h-11 items-center rounded-full px-3.5 font-orbitron text-[12px] font-bold uppercase tracking-[.14em] no-underline transition-colors ${active === s.id ? "bg-amber/15 text-amber" : "text-soft hover:text-hi"}`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
