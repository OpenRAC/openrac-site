"use client";

import Link from "next/link";
import { useEffect, useState, ViewTransition, type CSSProperties, type ReactNode } from "react";
import { ago, formatCount } from "@/lib/mods/logic";
import type { SlimMod } from "@/lib/mods/slim";
import { highlight } from "@/lib/mods/search";
import { DiscBadges, ImpactBadges, TypeBadge, WorksBadge } from "./Badges";
import ModImage from "./ModImage";

/** Text with the search words marked. */
export function Marked({ text, query }: { text: string; query?: string }) {
  if (!query) return <>{text}</>;
  return (
    <>
      {highlight(text, query).map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-sm bg-amber/20 text-gold">
            {p.text}
          </mark>
        ) : (
          p.text
        ),
      )}
    </>
  );
}

/** The card's picture: its banner, then, under a pointer, the screenshots one after another (loaded only once hovered). */
function CardPicture({ mod, sizes, priority }: { mod: SlimMod; sizes: string; priority?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [i, setI] = useState(0);
  const frames = [mod.card, ...mod.shots.filter((s) => s.hash !== mod.card?.hash)].filter((f) => f !== null);
  useEffect(() => {
    if (!hovered || frames.length < 2) return;
    // Pictures only change where a pointer can hover, and never for someone who asked for less motion.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % frames.length), 1400);
    return () => clearInterval(t);
  }, [hovered, frames.length]);

  return (
    // The same name as the mod page's banner: on browsers with view transitions, opening the page
    // grows this picture into its banner (and back), so the eye follows where it went.
    <ViewTransition name={`mod-${mod.id}`} share="morph" default="none">
      <div
        className="relative aspect-video overflow-hidden bg-gradient-to-br from-panel-hi to-ink"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
        onPointerLeave={() => {
          setHovered(false);
          setI(0);
        }}
      >
        {frames.map((f, n) =>
          n === 0 || hovered ? (
            <ModImage
              key={f.hash}
              img={f}
              sizes={sizes}
              priority={priority && n === 0}
              className={`absolute inset-0 size-full object-cover saturate-[.85] transition duration-700 group-hover/card:scale-[1.04] ${n === i ? "opacity-100" : "opacity-0"}`}
            />
          ) : null,
        )}
        {!frames.length && (
          <svg aria-hidden viewBox="0 0 120 68" className="absolute inset-0 m-auto h-1/2 fill-amber opacity-25">
            <path d="M60 6 70 26l22 3-16 15 4 22-20-11-20 11 4-22L28 29l22-3z" />
          </svg>
        )}
        {/* Dark at the bottom, fading into the card. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent to-50%" />
        {mod.hasVideo && (
          <span role="img" aria-label="Has a video" className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-ink/80 text-amber ring-1 ring-white/15">
            <svg viewBox="0 0 24 24" aria-hidden className="ml-0.5 size-4 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        )}
      </div>
    </ViewTransition>
  );
}

/**
 * A mod in the Showcase grid: picture, name, author, one line, badges and numbers. The whole card links
 * to the mod's page; `actions` (Install, Add to set) sit above the link so they stay their own targets.
 */
export default function ModCard({
  mod,
  now,
  query,
  actions,
  sizes = "(max-width: 480px) 100vw, (max-width: 820px) 50vw, 340px",
  priority,
  index = 0,
}: {
  mod: SlimMod;
  now: number;
  query?: string;
  actions?: ReactNode;
  sizes?: string;
  priority?: boolean;
  index?: number;
}) {
  return (
    <article
      style={{ "--i": index } as CSSProperties}
      className="group/card surface surface-link relative isolate flex flex-col overflow-hidden rounded-2xl [contain-intrinsic-size:auto_420px] [content-visibility:auto]"
    >
      <CardPicture mod={mod} sizes={sizes} priority={priority} />
      {/* Under the picture, never over it: a long name or a second line of badges cannot reach into it. */}
      <div className="relative flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        {/* One line of badges: a long one shortens with "…" rather than wrapping. */}
        <div className="relative flex min-w-0 gap-1.5">
          <TypeBadge type={mod.type} />
          <WorksBadge works={mod.works} />
          <ImpactBadges impact={mod.impact} max={1} />
        </div>
        <div className="min-w-0">
          <h3 className="font-orbitron text-[17px] font-bold leading-tight text-hi [overflow-wrap:anywhere]">
            {/* The card's one link, stretched over the whole card. */}
            <Link href={`/mods/${mod.id}`} prefetch={false} className="no-underline after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-amber">
              <Marked text={mod.name} query={query} />
            </Link>
          </h3>
          <p className="mt-0.5 text-[13px] text-dim">
            by <Marked text={mod.author} query={query} />
          </p>
        </div>
        <p className="line-clamp-2 text-[15px] leading-snug text-soft">
          <Marked text={mod.description} query={query} />
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[13px] text-dim tabular-nums">
          <span>v{mod.version}</span>
          <span title={`${mod.downloads.toLocaleString("en-US")} downloads`}>{formatCount(mod.downloads)} downloads</span>
          <span>{ago(mod.updated, now)}</span>
          <span className="flex gap-1">
            <DiscBadges games={mod.games} />
          </span>
        </div>
        {actions && <div className="relative z-10 flex flex-wrap items-center gap-2 pt-1">{actions}</div>}
      </div>
    </article>
  );
}
