"use client";

import { useEffect, useRef } from "react";

interface Dot { x: number; y: number; r: number; v: number; a: number }

/**
 * Slowly rising embers behind the hero. Purely decorative: off for reduced motion, and drawn only
 * while the hero is on screen and the tab is visible. Sharp on high-density screens.
 */
export default function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w = 0, h = 0, dots: Dot[] = [], raf = 0, visible = false, frame = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      frame = 0; // a resized canvas forgets its fill colour
      dots = Array.from({ length: Math.min(46, Math.floor(w / 24)) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.8 + 0.6, v: Math.random() * 0.25 + 0.08, a: Math.random() * 0.5 + 0.2,
      }));
    };
    const loop = () => {
      // The embers take the page's accent (the canvas's text colour), looked up a few times a second so they follow its fade.
      if (frame++ % 12 === 0) ctx.fillStyle = getComputedStyle(canvas).color;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.y -= d.v;
        d.x += Math.sin(d.y / 60) * 0.15;
        if (d.y < -4) { d.y = h + 4; d.x = Math.random() * w; }
        ctx.globalAlpha = d.a;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, 7);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    const update = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; update(); });
    // Only the width matters: mobile browsers resize the window as their toolbars slide, which must not reset the embers.
    let lastWidth = window.innerWidth;
    const onResize = () => { if (window.innerWidth !== lastWidth) { lastWidth = window.innerWidth; resize(); } };
    resize();
    io.observe(canvas);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] w-full text-amber" />;
}
