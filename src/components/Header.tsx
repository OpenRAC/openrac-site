"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { DISCORD_URL } from "@/lib/projects";

const LINKS = [
  ["progress", "Progress"],
  ["contribute", "Contribute"],
  ["how", "How it works"],
  ["faq", "FAQ"],
  ["ai", "AI"],
  ["legal", "Legal"],
] as const;

/** Sticky orange bar. Client-side only for the mobile menu, shrink on scroll and scroll-spy. */
export default function Header() {
  const [open, setOpen] = useState(false);
  const [small, setSmall] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setSmall(window.scrollY > 40);
      const y = window.scrollY + 120;
      let cur: string | null = null;
      for (const [id] of LINKS) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= y) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-black/30 bg-gradient-to-b from-[#e5a013] to-[#cd8300] text-black shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_4px_24px_rgb(0_0_0/0.45)]">
      <div className={`mx-auto flex max-w-[1080px] items-center gap-7 px-4 transition-[height] duration-300 ${small ? "h-[46px]" : "h-[60px]"}`}>
        <a href="#" className="group flex items-center gap-2 font-audiowide text-[26px] no-underline">
          <Image
            src="/wrench.webp"
            alt=""
            width={80}
            height={80}
            priority
            className="size-10 transition-transform duration-500 group-hover:-rotate-[25deg] group-hover:scale-110"
          />
          <span>
            Open<b>RAC</b>
          </span>
        </a>

        <button
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="nav"
          onClick={() => setOpen((o) => !o)}
          className="relative ml-auto size-[42px] rounded-xl border border-black/35 bg-black/10 min-[821px]:hidden"
        >
          <span className={`absolute left-[11px] top-[19px] h-0.5 w-[18px] rounded bg-[#1b1206] transition before:absolute before:left-0 before:top-[-6px] before:h-0.5 before:w-[18px] before:rounded before:bg-[#1b1206] before:transition before:content-[''] after:absolute after:left-0 after:top-[6px] after:h-0.5 after:w-[18px] after:rounded after:bg-[#1b1206] after:transition after:content-[''] ${open ? "bg-transparent before:translate-y-[6px] before:rotate-45 after:-translate-y-[6px] after:-rotate-45" : ""}`} />
        </button>

        <nav
          id="nav"
          className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-3 border-b border-black/30 bg-[#cd8300] px-4 pb-[18px] pt-3.5 shadow-[0_20px_30px_rgb(0_0_0/0.4)] min-[821px]:static min-[821px]:flex min-[821px]:flex-1 min-[821px]:flex-row min-[821px]:items-center min-[821px]:gap-[18px] min-[821px]:border-0 min-[821px]:bg-transparent min-[821px]:p-0 min-[821px]:shadow-none`}
        >
          <div className="flex flex-col gap-1 min-[821px]:ml-2 min-[821px]:flex-row">
            {LINKS.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={() => setOpen(false)}
                className={`group/l relative rounded-full px-3.5 py-3 text-[17px] font-medium no-underline transition-colors min-[821px]:py-2 min-[821px]:text-[15px] ${
                  active === id ? "bg-[#1b1206] text-amber" : "text-[#2a1800] hover:bg-black/10"
                }`}
              >
                {label}
                {active !== id && (
                  <span className="absolute inset-x-3.5 bottom-1 hidden h-0.5 origin-left scale-x-0 rounded bg-current transition-transform group-hover/l:scale-x-100 min-[821px]:block" />
                )}
              </a>
            ))}
          </div>
          <div className="min-[821px]:ml-auto">
            <a
              href={DISCORD_URL}
              onClick={() => setOpen(false)}
              className="flex justify-center rounded-full border border-black/15 bg-white px-4 py-3 text-sm font-semibold text-[#2a1800] no-underline transition-colors hover:bg-[#2a1800] hover:text-white min-[821px]:inline-flex min-[821px]:py-2"
            >
              Discord
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
