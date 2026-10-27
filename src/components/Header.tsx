"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { HAS_CREDITS } from "@/lib/credits";
import { DISCORD_URL, DOWNLOAD_URL } from "@/lib/projects";

/** Sections of the home page. Plain anchors: on the home page they scroll, elsewhere they go home first. */
const SECTIONS = ([
  ["progress", "Progress"],
  ["contribute", "Contribute"],
  ["how", "How it works"],
  ["faq", "FAQ"],
  ["ai", "AI"],
  ["credits", "Credits"],
] as const).filter(([id]) => id !== "credits" || HAS_CREDITS);

const link =
  "group/l relative flex min-h-11 items-center rounded-full px-3.5 text-[17px] font-semibold no-underline transition-colors min-[821px]:min-h-9 min-[821px]:text-[15px]";
const linkOn = "bg-[#1b1206] text-amber";
const linkOff = "text-[#2a1800] hover:bg-black/10";
const underline =
  "absolute inset-x-3.5 bottom-1 hidden h-0.5 origin-left scale-x-0 rounded bg-current transition-transform group-hover/l:scale-x-100 min-[821px]:block";
const pill = "flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold no-underline transition-colors min-[821px]:min-h-9";

/** Discord's own mark, on its blue: the one coloured button on the bar, so it reads at a glance. */
function DiscordButton({ onClick, className = "" }: { onClick?: () => void; className?: string }) {
  return (
    <a
      href={DISCORD_URL}
      onClick={onClick}
      aria-label="Discord"
      title="Discord"
      className={`flex size-11 flex-none items-center justify-center rounded-full border border-black/25 bg-[#5865f2] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] transition-colors hover:bg-[#4752c4] min-[821px]:size-9 ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[20px] fill-current min-[821px]:size-[18px]">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    </a>
  );
}

/**
 * Orange bar fixed to the top, striped like the launcher's. Client-side for the mobile menu, shrink on scroll and scroll-spy.
 * Both watch the page with IntersectionObservers, so scrolling runs no script and reads no layout.
 * The bar is fixed rather than sticky, so its shrinking never moves the page under the reader.
 */
export default function Header() {
  const pathname = usePathname();
  const home = pathname === "/";
  const inBlog = pathname.startsWith("/blog");
  const [open, setOpen] = useState(false);
  const [small, setSmall] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // Shrink once the top 40 px of the page have scrolled away.
  useEffect(() => {
    const probe = document.getElementById("top-probe");
    if (!probe) return;
    const io = new IntersectionObserver(([e]) => setSmall(!e.isIntersecting));
    io.observe(probe);
    return () => io.disconnect();
  }, []);

  // Scroll-spy: the section crossing the middle of the screen is the current one.
  useEffect(() => {
    if (!home) return;
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target.id);
          else seen.delete(e.target.id);
        }
        // the last one in page order wins, so a short section is still marked when it reaches the middle
        setActive(SECTIONS.map(([id]) => id).findLast((id) => seen.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const [id] of SECTIONS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => { io.disconnect(); setActive(null); };
  }, [home]);

  // The menu closes with Escape, and on its own when the screen grows past the mobile layout.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const wide = window.matchMedia("(min-width: 821px)");
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => { window.removeEventListener("keydown", onKey); wide.removeEventListener("change", onWide); };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <div id="top-probe" aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-10" />
      <header className="bar-stripes fixed inset-x-0 top-0 z-30 border-b border-black/30 text-black shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_4px_24px_rgb(0_0_0/0.45)]">
        <div className={`mx-auto flex max-w-[1080px] items-center gap-6 px-4 transition-[height] duration-300 ${small ? "h-[50px]" : "h-[60px]"}`}>
          <Link href="/" onClick={close} className="group flex items-center text-[#1b1206] no-underline" aria-label="OpenRAC home">
            <Logo
              height={26}
              label=""
              className={`origin-left transition-transform duration-300 ${small ? "scale-[.9]" : ""} group-hover:opacity-85`}
            />
          </Link>

          <DiscordButton onClick={close} className="ml-auto min-[821px]:hidden" />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav"
            onClick={() => setOpen((o) => !o)}
            className="relative -ml-3 size-11 flex-none rounded-full border border-black/30 bg-black/10 min-[821px]:hidden"
          >
            <span
              aria-hidden
              className={`absolute left-[12px] top-[20px] h-0.5 w-[18px] rounded bg-[#1b1206] transition before:absolute before:left-0 before:top-[-6px] before:h-0.5 before:w-[18px] before:rounded before:bg-[#1b1206] before:transition before:content-[''] after:absolute after:left-0 after:top-[6px] after:h-0.5 after:w-[18px] after:rounded after:bg-[#1b1206] after:transition after:content-[''] ${open ? "bg-transparent before:translate-y-[6px] before:rotate-45 after:-translate-y-[6px] after:-rotate-45" : ""}`}
            />
          </button>

          <nav
            id="nav"
            className={`absolute inset-x-0 top-full flex max-h-[calc(100dvh-60px)] flex-col gap-3 overflow-y-auto overscroll-contain border-b border-black/30 bar-stripes px-4 pb-[18px] pt-3.5 shadow-[0_20px_30px_rgb(0_0_0/0.4)] transition duration-200 max-[820px]:origin-top ${open ? "" : "max-[820px]:pointer-events-none max-[820px]:invisible max-[820px]:-translate-y-2 max-[820px]:opacity-0"} min-[821px]:static min-[821px]:max-h-none min-[821px]:flex-1 min-[821px]:flex-row min-[821px]:items-center min-[821px]:gap-[18px] min-[821px]:overflow-visible min-[821px]:border-0 min-[821px]:bg-none min-[821px]:p-0 min-[821px]:shadow-none`}
          >
            <div className="flex flex-col gap-1 min-[821px]:ml-2 min-[821px]:flex-row">
              {SECTIONS.map(([id, label]) => (
                <a key={id} href={`/#${id}`} onClick={close} aria-current={active === id ? "true" : undefined} className={`${link} ${active === id ? linkOn : linkOff}`}>
                  {label}
                  {active !== id && <span className={underline} />}
                </a>
              ))}
              <Link href="/blog" onClick={close} aria-current={inBlog ? "page" : undefined} className={`${link} ${inBlog ? linkOn : linkOff}`}>
                Blog
                {!inBlog && <span className={underline} />}
              </Link>
            </div>
            <div className="grid gap-2 min-[821px]:ml-auto min-[821px]:flex min-[821px]:items-center">
              <a href={DOWNLOAD_URL} onClick={close} className={`${pill} border border-black/25 bg-[#1b1206] text-amber hover:bg-[#2a1800]`}>
                Download
              </a>
              <DiscordButton onClick={close} className="max-[820px]:hidden" />
            </div>
          </nav>
        </div>
      </header>
      {/* Holds the bar's place in the page. */}
      <div aria-hidden className="h-[60px]" />
    </>
  );
}
