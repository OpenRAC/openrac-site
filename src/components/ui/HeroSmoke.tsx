"use client";

import { useEffect, useRef } from "react";
import Logo from "@/components/ui/Logo";

/**
 * The hero's backdrop on the right: the logo's mark as a faint gold haze, like smoke. On a desktop it
 * leans away from the cursor on a soft spring and settles when the cursor stops.
 *
 * Cheap on purpose: the blur is drawn once (the blurred mark is a still layer), and each frame only
 * moves that layer with a transform, so the browser composites and never repaints. The spring runs
 * only while it is moving, and not at all on touch screens or with reduced motion.
 */
export default function HeroSmoke() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // A critically damped feel: stiff enough to follow, damped enough never to wobble.
    const STIFF = 0.035, DAMP = 0.82, REACH = 28;
    let x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, raf = 0;

    const step = () => {
      vx = (vx + (tx - x) * STIFF) * DAMP;
      vy = (vy + (ty - y) * STIFF) * DAMP;
      x += vx;
      y += vy;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${(x * 0.08).toFixed(3)}deg)`;
      const still = Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05 && Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01;
      raf = still ? 0 : requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      // -1..1 across the window; the haze drifts the other way, as if the cursor pushed the air.
      tx = -((e.clientX / window.innerWidth) * 2 - 1) * REACH;
      ty = -((e.clientY / window.innerHeight) * 2 - 1) * REACH;
      if (!raf) raf = requestAnimationFrame(step);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute -right-24 -top-10 -z-10">
      {/* the slow ambient drift on the outer layer, the cursor's spring on the inner one */}
      <div className="will-change-transform sm:animate-drift">
        <div ref={ref} className="will-change-transform">
          <div className="text-gold opacity-[.05] blur-[10px]">
            <Logo mark height={480} label="" />
          </div>
          {/* a breath of light behind the mark, so it reads as glowing haze rather than a print */}
          <div className="absolute inset-[-15%] -z-10 bg-[radial-gradient(closest-side,rgb(214_160_32/0.14),transparent)]" />
        </div>
      </div>
    </div>
  );
}
