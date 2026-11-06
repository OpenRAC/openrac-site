"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import HeroGalaxies from "@/components/ui/HeroGalaxies";
import { HERO_SHOTS, heroSrc } from "@/lib/heroShots";

const HOLD_MS = 14000; // each clip's time on screen (the 18 s clips, played at half speed, run on through the fade)
const FADE_MS = 1600; // the crossfade

const noChange = () => () => {};
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The title screen's clips: one full-bleed cinematic flight at a time, crossfading to the next like
 * a console's title screen. Under the text, a bar per clip fills while it shows (click one to jump).
 * Each clip's first frame shows while it loads, and alone with reduced motion; a clip not uploaded yet leaves the dark backdrop.
 */
function HeroShotLayers({ at, off, missing, lost }: { at: number; off: boolean; missing: ReadonlySet<number>; lost: (i: number) => void }) {
  // A clip loads once it is on screen or next: the other six wait until their turn.
  const next = after(at, missing);
  const [wanted, setWanted] = useState(() => new Set([0, 1]));
  if (!wanted.has(at) || !wanted.has(next)) setWanted(new Set([...wanted, at, next]));
  const still = useSyncExternalStore(noChange, reducedMotion, () => true);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  // The clip coming in starts from its beginning; the one going out stops once it has faded.
  useEffect(() => {
    const video = videos.current[at];
    if (off) {
      videos.current.forEach((v) => v?.pause());
      return;
    }
    if (video && !still) {
      video.currentTime = 0;
      video.play().catch(() => {}); // a browser refusing autoplay keeps the first frame
    }
    const stop = window.setTimeout(() => videos.current.forEach((v, i) => i !== at && v?.pause()), FADE_MS);
    return () => window.clearTimeout(stop);
  }, [at, still, off]);

  return (
    <div aria-hidden style={{ transitionDuration: `${FADE_MS}ms` }} className={`absolute inset-0 overflow-hidden bg-ink-deep transition-opacity ${off ? "opacity-0" : ""}`}>
      {HERO_SHOTS.map((shot, i) =>
        wanted.has(i) && !missing.has(i) ? (
          <video
            key={shot.file}
            ref={(v) => {
              videos.current[i] = v;
            }}
            poster={heroSrc(shot, ".webp")}
            muted
            playsInline
            preload={i === at || i === next ? "auto" : "metadata"}
            style={{ transitionDuration: `${FADE_MS}ms` }}
            className={`absolute inset-0 size-full object-cover transition-opacity ease-out ${i === at ? "opacity-100" : "opacity-0"}`}
          >
            <source src={heroSrc(shot, "-1080.webm")} type='video/webm; codecs="av01.0.08M.08"' />
            {/* The last source failing too means the clip is not there: drop it. */}
            <source src={heroSrc(shot, "-1080.mp4")} type="video/mp4" onError={() => lost(i)} />
          </video>
        ) : null,
      )}
    </div>
  );
}

/** The clip after I, passing over the ones not uploaded (I itself when no other is there). */
function after(i: number, missing: ReadonlySet<number>) {
  for (let k = 1; k <= HERO_SHOTS.length; k++) {
    const j = (i + k) % HERO_SHOTS.length;
    if (!missing.has(j)) return j;
  }
  return i;
}

/** Which shot is showing: moves on by itself, waits while the tab is hidden, jumps on a click. */
function useHeroShot(missing: ReadonlySet<number>, paused: boolean) {
  const [at, setAt] = useState(0);
  const [round, setRound] = useState(0); // bumped by a click, so the timer starts over
  useEffect(() => {
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      if (!document.hidden && !paused) timer = window.setTimeout(() => setAt((i) => after(i, missing)), HOLD_MS);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [at, round, missing, paused]);
  return {
    at,
    go: (i: number) => {
      setAt(i);
      setRound((r) => r + 1);
    },
  };
}

/** A bar per clip: the showing one fills over its time; a click jumps to that clip. */
function HeroShotBar({ at, go, missing }: { at: number; go: (i: number) => void; missing: ReadonlySet<number> }) {
  return (
    <div className="mt-6 max-[700px]:mt-10">
      <div className="-ml-1.5 flex max-[700px]:ml-0 max-[700px]:justify-center" role="group" aria-label="Clips">
        {HERO_SHOTS.map((shot, i) => missing.has(i) ? null : (
          <button
            key={shot.file}
            type="button"
            aria-label={`${shot.game}, clip ${i + 1}`}
            aria-current={i === at}
            onClick={() => go(i)}
            // A 40 px hit area (fingers) around the 4 px bar it draws.
            className="group flex size-10 cursor-pointer items-center px-1.5 sm:w-12"
          >
            <span className="relative h-1 w-full overflow-hidden rounded-full bg-white/20 transition-colors group-hover:bg-white/35">
              {i === at && (
                <span key={`${at}`} style={{ animationDuration: `${HOLD_MS}ms` }} className="absolute inset-y-0 left-0 w-full origin-left animate-[shot-fill_linear_forwards] rounded-full bg-amber motion-reduce:animate-none" />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
// On a touch screen the same code is swipes, with two taps for B and A.
const SWIPES = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "tap", "tap"];

/** Calls ON each time the Konami code is entered: on the keyboard, or as swipes and taps on a touch screen. */
function useKonami(on: () => void) {
  const latest = useRef(on);
  useEffect(() => {
    latest.current = on;
  });
  useEffect(() => {
    let keys: string[] = [];
    let swipes: string[] = [];
    let start: { x: number; y: number } | null = null;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable],dialog") || e.metaKey || e.ctrlKey || e.altKey) return;
      keys = [...keys, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
      if (keys.join() === KONAMI.join()) {
        keys = [];
        latest.current();
      }
    };
    const onStart = (e: TouchEvent) => {
      start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      start = null;
      const far = Math.max(Math.abs(dx), Math.abs(dy));
      // A swipe is the finger's way: up is ArrowUp. Anything between a tap and a swipe starts over.
      const move = far < 10 ? "tap" : far < 40 ? "" : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "ArrowRight" : "ArrowLeft") : dy > 0 ? "ArrowDown" : "ArrowUp";
      swipes = move ? [...swipes, move].slice(-SWIPES.length) : [];
      if (swipes.join() === SWIPES.join()) {
        swipes = [];
        latest.current();
      }
    };
    addEventListener("keydown", onKey);
    addEventListener("touchstart", onStart, { passive: true });
    addEventListener("touchend", onEnd, { passive: true });
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("touchstart", onStart);
      removeEventListener("touchend", onEnd);
    };
  }, []);
}

/**
 * The home page's first screen, edge to edge under the bar: the clips, a dark fade on the left and
 * bottom for the text, the corner HUD, then the text (children) bottom left with the bar under it.
 * The Konami code swaps the clips for the series' galaxies (HeroGalaxies) and back.
 */
export default function HeroStage({ hud, children }: { hud: ReactNode; children: ReactNode }) {
  // Clips not uploaded (yet) drop out of the turn and the bar.
  const [missing, setMissing] = useState<ReadonlySet<number>>(() => new Set());
  const [sky, setSky] = useState(false);
  useKonami(() => setSky((on) => !on));
  const { at, go } = useHeroShot(missing, sky);
  const lost = (i: number) => {
    const now = new Set([...missing, i]);
    setMissing(now);
    if (i === at && now.size < HERO_SHOTS.length) go(after(at, now)); // no dark wait for a missing first clip
  };
  return (
    <section className="relative mx-[calc(50%-50vw)] flex min-h-[calc(100svh-50px)] items-end">
      <HeroShotLayers at={at} off={sky} missing={missing} lost={lost} />
      {sky && (
        <div className="absolute inset-0 animate-[sky-in_1.6s_ease-out_both]">
          <HeroGalaxies />
        </div>
      )}
      <div aria-hidden className={`absolute inset-0 transition-opacity duration-[1600ms] ${sky ? "opacity-60" : ""} bg-[linear-gradient(90deg,rgb(12_12_18/.92)_0%,rgb(12_12_18/.55)_45%,transparent_75%),linear-gradient(0deg,var(--color-ink)_0%,transparent_35%)] max-[700px]:bg-[linear-gradient(0deg,var(--color-ink)_8%,rgb(12_12_18/.82)_55%,rgb(12_12_18/.35)_100%)]`} />
      {hud}
      {/* Phones: centred, with wider side margins; wider screens: bottom left. */}
      <div className="relative mx-auto w-full max-w-[1080px] px-4 pb-14 pt-40 max-[700px]:px-7 max-[700px]:pb-24 max-[700px]:text-center max-[700px]:[&>*]:mx-auto">
        {children}
        {sky ? (
          <p className="mt-7 font-mono text-[12px] font-semibold tracking-[.04em] text-soft">
            <span className="text-gold">The series&apos; galaxies</span> · enter the code again to go back
          </p>
        ) : (
          missing.size < HERO_SHOTS.length && <HeroShotBar at={at} go={go} missing={missing} />
        )}
      </div>
    </section>
  );
}
