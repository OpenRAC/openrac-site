"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { PAGE_TRANSITION } from "@/components/layout/PageTransition";
import { DiscordIcon, GithubIcon, NewsIcon } from "@/components/ui/icons";
import Logo from "@/components/ui/Logo";
import SiteSearch from "@/components/layout/SiteSearch";
import { DISCORD_URL, GITHUB_URL } from "@/lib/projects";

const link =
  "group/l relative flex min-h-11 items-center rounded-md px-3.5 text-[17px] font-bold no-underline transition-colors min-[821px]:min-h-9 min-[821px]:whitespace-nowrap min-[821px]:text-[15px] min-[821px]:max-[1023px]:px-2 min-[1024px]:px-2.5 min-[821px]:max-[900px]:px-1.5 min-[821px]:max-[1023px]:text-[14px]";
// The open mobile menu sits on the page's colour, the bar on its stripes: light text there, dark here.
// The current section: a pill as tall as the bar's buttons. Its label never wraps, so the pill cannot grow to the bar's height.
const linkOn = "bg-white/[.06] text-amber min-[821px]:bg-[#1b1206] [&>span]:hidden";
const linkOff = "text-hi hover:bg-white/5 min-[821px]:text-[#2a1800] min-[821px]:hover:bg-black/10";
const pill = "flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold no-underline transition-colors min-[821px]:min-h-9 min-[821px]:whitespace-nowrap min-[821px]:max-[1023px]:px-3";

/** On a phone the bar's buttons are bare dark marks on the stripes: no discs or rings, a light shade under a finger. */
const barIcon = "flex size-10 flex-none items-center justify-center rounded-md text-[#1b1206] transition-colors hover:bg-black/10 active:bg-black/15 min-[821px]:hidden";

/** A light capsule holding several of the wide bar's buttons: a shade of the stripes, the same as the search field. */
const capsule = "min-[821px]:flex min-[821px]:h-9 min-[821px]:items-center min-[821px]:px-0.5 min-[821px]:rounded-md min-[821px]:bg-black/15 min-[821px]:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]";
/** A hairline between the buttons of the capsule. */
const capsuleDivider = "h-4 w-px flex-none bg-black/25";
/** A hairline between the buttons of the dark dock. */
const divider = "h-4 w-px flex-none bg-white/15";
/** A button in the capsule (dark ink on the stripes), and Mods while on its pages, filled dark. */
const off = "text-[#1b1206] hover:bg-black/10";
const on = "bg-[#1b1206] text-amber";
/** The same for a site's mark, in white. */
const offMark = "text-text hover:bg-[#2a1800]";

/** A small puzzle piece: the mark of Mods in the bar. Its knobs sit top and right, so the view is shifted to
    put the piece's weight, not its outline, in the middle of a round button. */
function ModsMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="-1 1 16 16" aria-hidden className={`flex-none fill-current ${className}`}>
      <path d="M6 1.5a2 2 0 0 1 2 2V4h3a1 1 0 0 1 1 1v3h.5a2 2 0 1 1 0 4H12v2.5a1 1 0 0 1-1 1H8V15a2 2 0 1 0-4 0v.5H1.5a1 1 0 0 1-1-1V12H1a2 2 0 1 0 0-4H.5V5a1 1 0 0 1 1-1H4v-.5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

/** News as a button next to GitHub, in the corner dock. It stays plain on its own pages; only screen readers hear it is the current one. */
function NewsButton({ on, onClick, className = "" }: { on: boolean; onClick?: () => void; className?: string }) {
  return (
    <Link
      href="/news"
      transitionTypes={PAGE_TRANSITION}
      onClick={onClick}
      aria-label="News"
      title="News"
      aria-current={on ? "page" : undefined}
      className={`flex flex-none items-center justify-center rounded-md transition-colors ${className}`}
    >
      <NewsIcon className="size-[19px]" />
    </Link>
  );
}

/** A site's own mark in a button (GitHub, Discord); `className` gives its colours. */
function MarkButton({ site, onClick, className = "" }: { site: "github" | "discord"; onClick?: () => void; className?: string }) {
  const Icon = site === "github" ? GithubIcon : DiscordIcon;
  const label = site === "github" ? "GitHub" : "Discord";
  return (
    <a
      href={site === "github" ? GITHUB_URL : DISCORD_URL}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex flex-none items-center justify-center rounded-md transition-colors ${className}`}
    >
      <Icon className="size-[18px]" />
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
  const inNews = pathname === "/news" || pathname.startsWith("/news/");
  // The SDK docs have their own frame: a logo back to the site instead of the bar.
  const inDocs = pathname === "/mods/docs" || pathname.startsWith("/mods/docs/");
  const [open, setOpen] = useState(false);

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

  // On the home page the router has nowhere to go, so the logo would do nothing: scroll to the top
  // ourselves, and drop a #section from the address.
  const toTop = (e: MouseEvent<HTMLAnchorElement>) => {
    close();
    if (!home || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (location.hash) history.replaceState(history.state, "", "/");
    window.scrollTo({ top: 0 });
  };

  if (inDocs) return null;
  return (
    <>
      <header style={{ viewTransitionName: "site-header" }} className="bar-stripes fixed inset-x-0 top-0 z-30 border-b border-black/30 text-black shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_4px_24px_rgb(0_0_0/0.45)]">
        <div className="mx-auto flex h-[50px] max-w-[1080px] items-center gap-6 px-4 min-[1024px]:gap-4 min-[821px]:max-[1023px]:gap-4 min-[821px]:max-[900px]:gap-2">
          <Link href="/" transitionTypes={PAGE_TRANSITION} onClick={toTop} className="group flex items-center text-[#1b1206] no-underline" aria-label="OpenRAC home">
            <Logo height={34} label="" className="transition-opacity group-hover:opacity-85" />
          </Link>

          {/* The site's search: a field on the wide bar, a mark on phones. */}
          <SiteSearch className="hidden h-9 flex-none items-center gap-2 rounded-md bg-black/15 px-3 text-[14px] font-semibold text-[#1b1206]/70 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)] transition-colors hover:bg-black/20 min-[821px]:flex min-[821px]:w-64" />
          <SiteSearch compact className={`${barIcon} ml-auto`} />
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
            className={`absolute inset-x-0 top-full flex max-h-[calc(100dvh-50px)] flex-col gap-3 overflow-y-auto overscroll-contain border-b border-white/10 bg-ink px-4 pb-[18px] pt-3.5 shadow-[0_20px_30px_rgb(0_0_0/0.4)] transition duration-200 max-[821px]:origin-top ${open ? "" : "max-[821px]:pointer-events-none max-[821px]:invisible max-[821px]:-translate-y-2 max-[821px]:opacity-0"} min-[821px]:static min-[821px]:max-h-none min-[821px]:flex-1 min-[821px]:flex-row min-[821px]:items-center min-[821px]:gap-3 min-[821px]:max-[1023px]:gap-2.5 min-[821px]:overflow-visible min-[821px]:border-0 min-[821px]:bg-transparent min-[821px]:p-0 min-[821px]:shadow-none`}
          >
            <div className="flex flex-col gap-1 min-[821px]:hidden">
              {/* Lines of the phone menu only: on the wide bar these are buttons. */}
              <Link href="/mods" transitionTypes={PAGE_TRANSITION} onClick={close} aria-current={inMods ? "page" : undefined} className={`${link} ${inMods ? linkOn : linkOff} min-[821px]:hidden`}>
                Mods
              </Link>
            </div>
            <div className="grid gap-2 min-[821px]:ml-auto min-[821px]:flex min-[821px]:items-center min-[821px]:max-[1023px]:gap-1.5">
              {/* Mods and Download share one light capsule on the wide bar. On phones it falls away (contents):
                  Download is the menu's big button, and Mods a line of the menu. */}
              <div className={`${capsule} max-[821px]:contents`}>
                {/* Mods: its own page, with its own mark, gold while there. */}
                <Link href="/mods" transitionTypes={PAGE_TRANSITION} onClick={close} aria-current={inMods ? "page" : undefined} className={`${pill} gap-2 max-[821px]:hidden min-[821px]:min-h-8 ${inMods ? on : off}`}>
                  <ModsMark className="size-4" />
                  Mods
                </Link>
                <span aria-hidden className={`${capsuleDivider} max-[821px]:hidden`} />
                {/* The install page: the launcher for every system. */}
                <Link href="/install" transitionTypes={PAGE_TRANSITION} onClick={close} aria-current={pathname === "/install" ? "page" : undefined} className={`${pill} border border-amber bg-amber text-[#1a0d00] hover:brightness-110 min-[821px]:min-h-8 min-[821px]:border-0 min-[821px]:bg-transparent min-[821px]:text-[#1b1206] min-[821px]:hover:bg-black/10 min-[821px]:hover:brightness-100`}>
                  Download
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </header>
      {/* Holds the bar's place in the page. */}
      <div aria-hidden className="h-[50px]" />
      {/* News, GitHub and Discord float in the bottom right corner, out of the crowded bar, in reach on every screen. */}
      <nav aria-label="News and community" className="site-dock fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] z-20 flex items-center rounded-lg bg-[#1b1206] px-1 shadow-[0_0_0_1px_rgb(0_0_0/0.25),0_8px_24px_rgb(0_0_0/0.45)] transition-[translate] duration-200 motion-reduce:transition-none">
        <NewsButton on={inNews} className={`${offMark} size-10`} />
        <span aria-hidden className={divider} />
        <MarkButton site="github" className={`${offMark} size-10`} />
        <span aria-hidden className={divider} />
        <MarkButton site="discord" className={`${offMark} size-10`} />
      </nav>
    </>
  );
}
