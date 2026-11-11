"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { PAGE_TRANSITION } from "@/components/layout/PageTransition";
import { DiscordIcon, GithubIcon, NewsIcon } from "@/components/ui/icons";
import Logo from "@/components/ui/Logo";
import SiteSearch from "@/components/layout/SiteSearch";
import { DISCORD_URL, GITHUB_URL } from "@/lib/projects";

/** A line of the open phone menu, on the page's colour; the current page in gold. */
const link = "flex min-h-11 items-center rounded-md px-3.5 text-[17px] font-bold no-underline transition-colors";
const linkOn = "bg-coal text-amber";
const linkOff = "text-hi hover:bg-coal";
const pill = "flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-semibold no-underline transition-colors min-[821px]:min-h-8 min-[821px]:whitespace-nowrap min-[821px]:max-[1023px]:px-3";

/** On a phone the bar's buttons are bare light marks over the page: no discs or rings, a light shade under a finger. */
const barIcon = "flex size-10 flex-none items-center justify-center rounded-md text-text transition-colors hover:bg-coal active:bg-coal-hi min-[821px]:hidden";

/** A wide bar button: plain coal and gold text, the same as the search field (the launcher's header buttons). */
const shade = "min-[821px]:h-8.5 min-[821px]:bg-coal min-[821px]:border-0";
/** A hairline between the buttons of the dark dock. */
const divider = "h-4 w-px flex-none bg-white/15";
/** A bar button, and Mods while on its pages: the same fill with gold text. */
const off = `${shade} text-text min-[821px]:text-amber min-[821px]:hover:bg-coal-hi`;
/** The open page: filled gold with dark text, as the launcher's open tab. */
const on = "min-[821px]:h-8.5 min-[821px]:bg-amber min-[821px]:text-[#1b1206] text-amber";
/** The same for a site's mark, in white. */
const offMark = "text-text hover:bg-coal-hi";

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
 * The header fixed to the top. Like the launcher's it has no bar of its own: it lies over the page, and
 * once the page scrolls under it a soft blur fades in behind it (.site-haze in globals.css).
 * Client-side for the phone menu.
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

  // At the very top the header is bare and sits 12 px lower; once the page moves it slides up to the edge
  // and the blur fades in behind it.
  // One observer on a 2 px strip (the launcher shows it once scrollTop > 1) at the top of the document: no scroll handler, no work while scrolling.
  const [atTop, setAtTop] = useState(true);
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = top.current;
    if (!strip) return;
    const io = new IntersectionObserver(([e]) => setAtTop(e.isIntersecting));
    io.observe(strip);
    return () => io.disconnect();
  }, []);

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
      <div ref={top} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0.5" />
      {/* The blur sits outside the header: an element with a view-transition-name blurs only what is inside it. */}
      <div aria-hidden data-under={atTop && !open ? undefined : ""} className="site-haze" />
      <header
        style={{ viewTransitionName: "site-header" }}
        data-floating={atTop && !open ? "" : undefined}
        className="site-header fixed left-0 right-0 top-0 z-30 text-text transition-[top] duration-300 ease-out motion-reduce:transition-none data-[floating]:top-3"
      >
        <div className="mx-auto flex h-[50px] max-w-[1080px] items-center gap-6 px-4 min-[821px]:gap-4 min-[821px]:max-[900px]:gap-2">
          <Link href="/" transitionTypes={PAGE_TRANSITION} onClick={toTop} className="group flex items-center text-text no-underline" aria-label="OpenRAC home">
            <Logo height={34} label="" accent className="transition-opacity group-hover:opacity-85" />
          </Link>

          {/* The site's search: a field on the wide bar, a mark on phones. */}
          <SiteSearch className="hidden h-8.5 flex-none items-center gap-2 rounded-md bg-coal border-0 px-3 text-[14px] font-semibold text-amber transition-colors hover:bg-coal-hi min-[821px]:flex min-[821px]:w-64" />
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
              className={`absolute left-[11px] top-[19px] h-0.5 w-[18px] rounded bg-current transition before:absolute before:left-0 before:top-[-6px] before:h-0.5 before:w-[18px] before:rounded before:bg-current before:transition before:content-[''] after:absolute after:left-0 after:top-[6px] after:h-0.5 after:w-[18px] after:rounded after:bg-current after:transition after:content-[''] ${open ? "bg-transparent before:translate-y-[6px] before:rotate-45 after:-translate-y-[6px] after:-rotate-45" : ""}`}
            />
          </button>

          <nav
            id="nav"
            className={`absolute inset-x-0 top-full flex max-h-[calc(100dvh-50px)] flex-col gap-3 overflow-y-auto overscroll-contain border-b border-white/10 bg-ink px-4 pb-[18px] pt-3.5 shadow-[0_20px_30px_rgb(0_0_0/0.4)] transition duration-200 max-[821px]:origin-top ${open ? "" : "max-[821px]:pointer-events-none max-[821px]:invisible max-[821px]:-translate-y-2 max-[821px]:opacity-0"} min-[821px]:static min-[821px]:max-h-none min-[821px]:flex-1 min-[821px]:flex-row min-[821px]:items-center min-[821px]:gap-3 min-[821px]:max-[1023px]:gap-2.5 min-[821px]:overflow-visible min-[821px]:border-0 min-[821px]:bg-transparent min-[821px]:p-0 min-[821px]:shadow-none`}
          >
            <div className="flex flex-col gap-1 min-[821px]:hidden">
              {/* Lines of the phone menu only: on the wide bar these are buttons. */}
              <Link href="/mods" transitionTypes={PAGE_TRANSITION} onClick={close} aria-current={inMods ? "page" : undefined} className={`${link} ${inMods ? linkOn : linkOff}`}>
                Mods
              </Link>
            </div>
            <div className="grid gap-2 min-[821px]:ml-auto min-[821px]:flex min-[821px]:items-center min-[821px]:max-[1023px]:gap-1.5">
              {/* Mods and Download: two buttons side by side on the wide bar. On phones the row falls away (contents):
                  Download is the menu's big button, and Mods a line of the menu. */}
              <div className="min-[821px]:flex min-[821px]:items-center min-[821px]:gap-2 max-[821px]:contents">
                {/* Mods: its own page, with its own mark, gold while there. */}
                <Link href="/mods" transitionTypes={PAGE_TRANSITION} onClick={close} aria-current={inMods ? "page" : undefined} className={`${pill} gap-2 max-[821px]:hidden ${inMods ? on : off}`}>
                  <ModsMark className="size-4" />
                  Mods
                </Link>
                {/* The install page: the launcher for every system. */}
                <Link href="/install" transitionTypes={PAGE_TRANSITION} onClick={close} aria-current={pathname === "/install" ? "page" : undefined} className={`${pill} border border-amber bg-amber text-[#1a0d00] hover:brightness-110 min-[821px]:border-0 min-[821px]:h-8.5 min-[821px]:bg-coal min-[821px]:text-amber min-[821px]:hover:bg-coal-hi min-[821px]:hover:brightness-100`}>
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
      <nav aria-label="News and community" className="site-dock fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] z-20 flex items-center rounded-lg border-0 bg-coal px-1 shadow-[0_8px_24px_rgb(0_0_0/0.45)] transition-[translate] duration-200 motion-reduce:transition-none">
        <NewsButton on={inNews} className={`${offMark} size-10`} />
        <span aria-hidden className={divider} />
        <MarkButton site="github" className={`${offMark} size-10`} />
        <span aria-hidden className={divider} />
        <MarkButton site="discord" className={`${offMark} size-10`} />
      </nav>
    </>
  );
}
