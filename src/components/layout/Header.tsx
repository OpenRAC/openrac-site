"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PAGE_TRANSITION } from "@/components/layout/PageTransition";
import { DiscordIcon, GithubIcon } from "@/components/ui/icons";
import Logo from "@/components/ui/Logo";
import { HAS_CREDITS } from "@/lib/credits";
import { DISCORD_URL, GITHUB_URL } from "@/lib/projects";

/** Sections of the home page. Plain anchors on the home page (they scroll); elsewhere links that go home first, without reloading. */
const SECTIONS = ([
  ["progress", "Progress"],
  ["contribute", "Contribute"],
  ["how", "How it works"],
  ["faq", "FAQ"],
  ["ai", "AI"],
  ["credits", "Credits"],
] as const).filter(([id]) => id !== "credits" || HAS_CREDITS);

const link =
  "group/l relative flex min-h-11 items-center rounded-full px-3.5 text-[17px] font-bold no-underline transition-colors min-[821px]:min-h-9 min-[821px]:text-[15px]";
// The open mobile menu sits on the page's colour, the bar on its stripes: light text there, dark here.
const linkOn = "bg-white/[.06] text-amber min-[821px]:bg-[#1b1206]";
const linkOff = "text-hi hover:bg-white/5 min-[821px]:text-[#2a1800] min-[821px]:hover:bg-black/10";
const underline =
  "absolute inset-x-3.5 bottom-1 hidden h-0.5 origin-left scale-x-0 rounded bg-current transition-transform group-hover/l:scale-x-100 min-[821px]:block";
const pill = "flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold no-underline transition-colors min-[821px]:min-h-9";

/** The bar's own dark and gold, like the Download button, so the buttons on the bar read as a set. */
/** The same dark, with the GitHub and Discord marks in white. */
const mark = "bg-[#1b1206] text-text hover:bg-[#2a1800]";
/** On a phone the bar's buttons are bare dark marks on the stripes: no discs or rings, a light shade under a finger. */
const barIcon = "flex size-10 flex-none items-center justify-center rounded-full text-[#1b1206] transition-colors hover:bg-black/10 active:bg-black/15 min-[821px]:hidden";

/** Mods on the bar: dark with gold like Download, filled gold while on /mods. In the open mobile menu, an outlined gold pill. */
const modsOff = "border-amber/50 text-amber hover:bg-amber/10 min-[821px]:border-black/25 min-[821px]:bg-[#1b1206] min-[821px]:hover:bg-[#2a1800]";
const modsOn = "border-amber bg-amber text-[#1a0d00] min-[821px]:border-black/25";

/** A small puzzle piece: the mark of Mods in the bar. Its knobs sit top and right, so the view is shifted to
    put the piece's weight, not its outline, in the middle of a round button. */
function ModsMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="-1 1 16 16" aria-hidden className={`flex-none fill-current ${className}`}>
      <path d="M6 1.5a2 2 0 0 1 2 2V4h3a1 1 0 0 1 1 1v3h.5a2 2 0 1 1 0 4H12v2.5a1 1 0 0 1-1 1H8V15a2 2 0 1 0-4 0v.5H1.5a1 1 0 0 1-1-1V12H1a2 2 0 1 0 0-4H.5V5a1 1 0 0 1 1-1H4v-.5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

/** A site's own mark in a round button (GitHub, Discord); `className` gives its colours. */
function MarkButton({ site, onClick, className = "" }: { site: "github" | "discord"; onClick?: () => void; className?: string }) {
  const Icon = site === "github" ? GithubIcon : DiscordIcon;
  const label = site === "github" ? "GitHub" : "Discord";
  return (
    <a
      href={site === "github" ? GITHUB_URL : DISCORD_URL}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex flex-none items-center justify-center rounded-full transition-colors ${className}`}
    >
      <Icon className="size-[20px] min-[821px]:size-[18px]" />
    </a>
  );
}

/**
 * Orange bar fixed to the top, striped like the launcher's, one height at every scroll position.
 * Client-side for the mobile menu and scroll-spy; the spy watches the page with an
 * IntersectionObserver, so scrolling runs no script and reads no layout.
 */
export default function Header() {
  const pathname = usePathname();
  const home = pathname === "/";
  const inMods = pathname === "/mods" || pathname.startsWith("/mods/");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

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
      <header style={{ viewTransitionName: "site-header" }} className="bar-stripes fixed inset-x-0 top-0 z-30 border-b border-black/30 text-black shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_4px_24px_rgb(0_0_0/0.45)]">
        <div className="mx-auto flex h-[50px] max-w-[1080px] items-center gap-6 px-4">
          <Link href="/" transitionTypes={PAGE_TRANSITION} onClick={close} className="group flex items-center text-[#1b1206] no-underline" aria-label="OpenRAC home">
            <Logo height={34} label="" className="transition-opacity group-hover:opacity-85" />
          </Link>

          {/* Mods in reach on phones too, without opening the menu. */}
          <Link
            href="/mods"
            transitionTypes={PAGE_TRANSITION}
            onClick={close}
            aria-label="Mods"
            title="Mods"
            aria-current={inMods ? "page" : undefined}
            className={`${barIcon} ml-auto ${inMods ? "bg-black/15" : ""}`}
          >
            <ModsMark className="size-[22px]" />
          </Link>
          <MarkButton site="github" onClick={close} className={`${barIcon} -ml-5`} />
          <MarkButton site="discord" onClick={close} className={`${barIcon} -ml-5`} />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="nav"
            onClick={() => setOpen((o) => !o)}
            className={`${barIcon} relative -ml-5`}
          >
            <span
              aria-hidden
              className={`absolute left-[11px] top-[19px] h-0.5 w-[18px] rounded bg-[#1b1206] transition before:absolute before:left-0 before:top-[-6px] before:h-0.5 before:w-[18px] before:rounded before:bg-[#1b1206] before:transition before:content-[''] after:absolute after:left-0 after:top-[6px] after:h-0.5 after:w-[18px] after:rounded after:bg-[#1b1206] after:transition after:content-[''] ${open ? "bg-transparent before:translate-y-[6px] before:rotate-45 after:-translate-y-[6px] after:-rotate-45" : ""}`}
            />
          </button>

          <nav
            id="nav"
            className={`absolute inset-x-0 top-full flex max-h-[calc(100dvh-50px)] flex-col gap-3 overflow-y-auto overscroll-contain border-b border-white/10 bg-ink px-4 pb-[18px] pt-3.5 shadow-[0_20px_30px_rgb(0_0_0/0.4)] transition duration-200 max-[821px]:origin-top ${open ? "" : "max-[821px]:pointer-events-none max-[821px]:invisible max-[821px]:-translate-y-2 max-[821px]:opacity-0"} min-[821px]:static min-[821px]:max-h-none min-[821px]:flex-1 min-[821px]:flex-row min-[821px]:items-center min-[821px]:gap-[18px] min-[821px]:overflow-visible min-[821px]:border-0 min-[821px]:bg-transparent min-[821px]:p-0 min-[821px]:shadow-none`}
          >
            <div className="flex flex-col gap-1 min-[821px]:ml-2 min-[821px]:flex-row">
              {SECTIONS.map(([id, label]) =>
                home ? (
                  <a key={id} href={`#${id}`} onClick={close} aria-current={active === id ? "true" : undefined} className={`${link} ${active === id ? linkOn : linkOff}`}>
                    {label}
                    {active !== id && <span className={underline} />}
                  </a>
                ) : (
                  <Link key={id} href={`/#${id}`} transitionTypes={PAGE_TRANSITION} onClick={close} className={`${link} ${linkOff}`}>
                    {label}
                    <span className={underline} />
                  </Link>
                ),
              )}
            </div>
            <div className="grid gap-2 min-[821px]:ml-auto min-[821px]:flex min-[821px]:items-center">
              {/* Mods, set apart from the home page's sections: its own page, with its own mark. */}
              <Link href="/mods" transitionTypes={PAGE_TRANSITION} onClick={close} aria-current={inMods ? "page" : undefined} className={`${pill} gap-2 border ${inMods ? modsOn : modsOff}`}>
                <ModsMark />
                Mods
              </Link>
              {/* The home page's Download panel; elsewhere it goes home and opens it there. */}
              <Link href="/#download" transitionTypes={PAGE_TRANSITION} onClick={close} className={`${pill} border border-amber bg-amber text-[#1a0d00] hover:brightness-110 min-[821px]:border-black/25 min-[821px]:bg-[#1b1206] min-[821px]:text-amber min-[821px]:hover:bg-[#2a1800] min-[821px]:hover:brightness-100`}>
                Download
              </Link>
              <MarkButton site="github" onClick={close} className={`${mark} size-9 max-[821px]:hidden`} />
              <MarkButton site="discord" onClick={close} className={`${mark} size-9 max-[821px]:hidden`} />
            </div>
          </nav>
        </div>
      </header>
      {/* Holds the bar's place in the page. */}
      <div aria-hidden className="h-[50px]" />
    </>
  );
}
