"use client";

import { useEffect, useState } from "react";

/** The page's own contents, beside it on wide screens; the part being read is marked. */
export default function Toc({ items }: { items: { id: string; label: string; depth?: number }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    for (const s of items) {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label="On this page" className="sticky top-[66px] max-h-[calc(100vh-82px)] overflow-y-auto pb-6 [scrollbar-width:thin]">
      <p className="mb-2 font-orbitron text-[11px] font-bold uppercase tracking-[.16em] text-dim">On this page</p>
      <ul className="grid gap-0.5 border-l border-line">
        {items.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "true" : undefined}
              className={`-ml-px block border-l py-1 text-[13px] leading-snug no-underline transition-colors ${s.depth === 3 ? "pl-6" : "pl-3"} ${active === s.id ? "border-amber text-amber" : "border-transparent text-dim hover:text-hi"}`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
