"use client";

import { useEffect, useRef } from "react";

interface Dot { x: number; y: number; r: number; v: number; a: number }

/** Slowly rising embers behind the hero. Purely decorative; off for reduced motion. */
export default function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w = 0, h = 0, dots: Dot[] = [], raf = 0;
    const resize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      dots = Array.from({ length: Math.min(46, Math.floor(w / 24)) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.8 + 0.6, v: Math.random() * 0.25 + 0.08, a: Math.random() * 0.5 + 0.2,
      }));
    };
    let running = false;
    const loop = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#ffb443";
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
    const io = new IntersectionObserver(([e]) => {
      const visible = e.isIntersecting;
      if (visible && !running) { running = true; raf = requestAnimationFrame(loop); }
      if (!visible) { running = false; cancelAnimationFrame(raf); }
    });
    resize();
    io.observe(canvas);
    window.addEventListener("resize", resize);
    return () => { running = false; io.disconnect(); cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] w-full" />;
}
