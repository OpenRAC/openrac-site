"use client";

import { useEffect, useRef } from "react";

/*
 * A corner of the series' sky behind the hero: the real galaxies of the games, drawn as faint dots.
 * A background first, an easter egg second: names show only on a closer look.
 *
 * Desktop: the scene leans with the cursor; hover a dot for its planet. Phones: only scrolling moves it
 * (a slow turn and parallax) and walks through a few planets; touching the scene does nothing.
 * It draws only while something moves, from sprites made once per size, and never with reduced motion.
 */

type Planet = { n: string; g: string; c?: string; a: number; d: number };
type Galaxy = { n: string; games: string; x: number; y: number; r: number; tilt: number; arms: number; flat: number; z: number; ps: Planet[] };
type Spot = { id: string; x: number; y: number; z: number; n: string; c: string };

const RC = "Ratchet & Clank";
const GC = "Going Commando";
const UYA = "Up Your Arsenal";
const DL = "Deadlocked";
const TOD = "Tools of Destruction";
const QFB = "Quest for Booty";
const ACIT = "A Crack in Time";
const ITN = "Into the Nexus";
const RA = "Rift Apart";

// Scene units: a 1000 x 600 box. Planets sit at an angle and a distance (in galaxy radii) in their galaxy's plane.
const GALAXIES: Galaxy[] = [
  { n: "SOLANA", games: "PS2 · 2002, 2004", x: 250, y: 200, r: 125, tilt: 0.45, arms: 2, flat: 0.42, z: 14, ps: [
    { n: "Veldin", g: RC, c: "Kyzil Plateau", a: 0.3, d: 1.08 },
    { n: "Novalis", g: RC, c: "Tobruk Crater", a: 1.0, d: 0.78 },
    { n: "Kerwan", g: RC, c: "Metropolis", a: 1.7, d: 1.02 },
    { n: "Eudora", g: RC, c: "Logging Site", a: 2.3, d: 0.62 },
    { n: "Rilgar", g: RC, c: "Blackwater City", a: 2.9, d: 1.12 },
    { n: "Pokitaru", g: RC, c: "Jowai Resort", a: 3.5, d: 0.85 },
    { n: "Orxon", g: RC, c: "Kogor Refinery", a: 4.1, d: 1.05 },
    { n: "Umbris", g: RC, c: "Snivelak", a: 4.7, d: 0.7 },
    { n: "Quartu", g: RC, c: "Bot factory", a: 5.25, d: 1.15 },
    { n: "Florana", g: UYA, a: 5.8, d: 0.55 },
    { n: "Marcadia", g: UYA, a: 0.7, d: 0.45 },
    { n: "Aquatos", g: UYA, a: 2.0, d: 0.4 },
    { n: "Tyhrranosis", g: UYA, a: 3.2, d: 0.5 },
    { n: "Daxx", g: UYA, a: 4.4, d: 0.36 },
    { n: "Obani Gemini", g: UYA, a: 5.4, d: 0.85 },
  ] },
  { n: "BOGON", games: "PS2 · 2003", x: 735, y: 120, r: 85, tilt: -0.55, arms: 2, flat: 0.45, z: 18, ps: [
    { n: "Oozla", g: GC, c: "Megacorp Store", a: 0.2, d: 1.1 },
    { n: "Maktar Nebula", g: GC, c: "Arena", a: 0.9, d: 0.8 },
    { n: "Endako", g: GC, a: 1.6, d: 1.15 },
    { n: "Barlow", g: GC, a: 2.3, d: 0.7 },
    { n: "Notak", g: GC, a: 3.0, d: 1.1 },
    { n: "Siberius", g: GC, a: 3.7, d: 0.6 },
    { n: "Tabora", g: GC, a: 4.3, d: 1.05 },
    { n: "Boldan", g: GC, c: "Floating City", a: 5.0, d: 0.85 },
    { n: "Yeedil", g: GC, a: 5.7, d: 1.15 },
  ] },
  { n: "DREADZONE", games: "PS2 · 2005", x: 900, y: 455, r: 52, tilt: 1.1, arms: 3, flat: 0.5, z: 22, ps: [
    { n: "Catacrom IV", g: DL, a: 0.4, d: 1.5 },
    { n: "Sarathos", g: DL, a: 1.4, d: 1.7 },
    { n: "Kronos", g: DL, a: 2.4, d: 1.45 },
    { n: "Shaar", g: DL, a: 3.4, d: 1.8 },
    { n: "Valix Belt", g: DL, a: 4.3, d: 1.5 },
    { n: "Torval", g: DL, a: 5.2, d: 1.75 },
  ] },
  { n: "POLARIS", games: "PS3 · PS4 · PS5", x: 545, y: 420, r: 150, tilt: -0.18, arms: 2, flat: 0.4, z: 10, ps: [
    { n: "Kerchu", g: TOD, a: 0.15, d: 1.05 },
    { n: "Cobalia", g: TOD, a: 0.6, d: 0.7 },
    { n: "Ardolis", g: TOD, c: "Pirate base", a: 1.05, d: 1.12 },
    { n: "Fastoon", g: TOD, c: "Lombax homeworld", a: 1.6, d: 0.55 },
    { n: "Zordoom", g: TOD, c: "Prison", a: 2.1, d: 1.0 },
    { n: "Merdegraw", g: QFB, a: 2.6, d: 0.8 },
    { n: "Zanifar", g: ACIT, a: 3.05, d: 1.15 },
    { n: "Torren IV", g: ACIT, a: 3.5, d: 0.65 },
    { n: "Yerek", g: ITN, a: 4.0, d: 1.05 },
    { n: "Kragmite", g: ITN, a: 4.45, d: 0.45 },
    { n: "Corson V", g: RA, c: "Nefarious City", a: 4.95, d: 0.95 },
    { n: "Sargasso", g: RA, a: 5.4, d: 0.6 },
    { n: "Blizar Prime", g: RA, a: 5.85, d: 1.1 },
    { n: "Cordelion", g: RA, a: 3.8, d: 0.3 },
  ] },
];

// Things that are not planets, in scene units: hovered on desktop, found on phones by scrolling.
const SPOTS: Spot[] = [
  { id: "clock", x: 505, y: 298, z: 12, n: "The Great Clock", c: "the centre of the universe" },
  { id: "rift", x: 330, y: 500, z: 8, n: "A dimensional rift", c: "someone left it open" },
  { id: "aphelion", x: 690, y: 330, z: 16, n: "Aphelion", c: "parked, engine still warm" },
  { id: "deplanetizer", x: 128, y: 120, z: 18, n: "The Deplanetizer", c: "Drek's, idling over Veldin" },
  { id: "phoenix", x: 380, y: 118, z: 16, n: "Starship Phoenix", c: "Q-Force on patrol" },
  { id: "station", x: 900, y: 455, z: 22, n: "DreadZone Station", c: "live on every channel" },
];

// Three gold bolts, hidden among the stars (desktop: click them). All three show the museum.
const BOLTS = [{ x: 610, y: 40 }, { x: 960, y: 250 }, { x: 70, y: 470 }];
const MUSEUM: Spot = { id: "museum", x: 205, y: 330, z: 14, n: "Insomniac Museum", c: "you found the way in" };

// What a phone visitor meets while scrolling past the hero, in order.
const TOUR = ["Veldin", "Kerwan", "Oozla", "DreadZone Station", "Fastoon", "The Great Clock", "Corson V"];

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const GOLD = "245,192,64";
const WHITE = "239,239,243";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

/** One galaxy as a sprite: spiral arms of dots, flattened, unrotated (the frame turns it). */
function galaxySprite(g: Galaxy, px: number, gi: number) {
  const size = Math.ceil(g.r * px * 2.3) + 4;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d")!;
  const rad = g.r * px, n = Math.round(900 * g.r / 150) + 160, dot = Math.max(1, px * 1.1);
  for (let k = 0; k < n; k++) {
    const t = hash(k + gi * 991, 1.3), arm = k % g.arms;
    const a = t * 5.4 + (arm * Math.PI * 2) / g.arms + (hash(k, 77 + gi) - 0.5) * 0.55;
    const d = Math.pow(t, 0.85) * rad + (hash(k + 3, gi * 13) - 0.5) * rad * 0.12;
    x.fillStyle = `rgba(${GOLD},${0.08 + (1 - t) * 0.3})`;
    x.fillRect(size / 2 + Math.cos(a) * d, size / 2 + Math.sin(a) * d * g.flat, dot, dot);
  }
  // a soft core, made of dots too: no glow
  for (let k = 0; k < 60; k++) {
    const a = hash(k, 5 + gi) * 6.283, d = hash(k, 9 + gi) * rad * 0.12;
    x.fillStyle = `rgba(${GOLD},0.32)`;
    x.fillRect(size / 2 + Math.cos(a) * d, size / 2 + Math.sin(a) * d * g.flat, dot, dot);
  }
  return c;
}

export default function HeroGalaxies() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const display = getComputedStyle(document.body).getPropertyValue("--font-orbitron").trim() || "sans-serif";

    let W = 0, H = 0, DPR = 1, S = 1, X0 = 0, Y0 = 0, fade = 1;
    let sprites: HTMLCanvasElement[] = [];
    let stars: { x: number; y: number; r: number; a: number; z: number }[] = [];
    // the scene's lean: where it is, where it is going, and how fast
    const lean = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, rot: 0, vr: 0, tr: 0 };
    let mouse: { x: number; y: number } | null = null;
    let hover = "", tour = "", mirror = false, toast = "", toastTimer = 0;
    let bolts: boolean[] = [false, false, false];
    try { const b = JSON.parse(localStorage.getItem("openrac-bolts") || "[]"); if (Array.isArray(b)) bolts = [0, 1, 2].map((i) => !!b[i]); } catch {}
    let raf = 0, visible = true;
    let hits: { id: string; x: number; y: number }[] = [];

    const at = (x: number, y: number, z: number) => {
      const sx = X0 + (mirror ? 1000 - x : x) * S + lean.x * z, sy = Y0 + y * S + lean.y * z;
      return [sx, sy] as const;
    };

    function layout() {
      const r = cv!.getBoundingClientRect();
      W = r.width; H = r.height; DPR = Math.min(2, devicePixelRatio || 1);
      cv!.width = Math.round(W * DPR); cv!.height = Math.round(H * DPR);
      if (W >= 900) {
        // the right part of a wide screen, clear of the headline
        S = Math.min((W * 0.5) / 1000, (H * 0.95) / 600);
        X0 = W - 1000 * S - Math.max(16, W * 0.015); Y0 = (H - 600 * S) / 2;
        fade = W >= 1200 ? 1 : 0.7; // quieter where it reaches under the headline
      } else {
        // behind the buttons and numbers on a phone, as wide as the screen, quieter
        S = (W * 1.08) / 1000;
        X0 = -W * 0.06; Y0 = H - 600 * S - 24; fade = 0.75;
      }
      sprites = GALAXIES.map((g, i) => galaxySprite(g, S * DPR, i));
      stars = [];
      for (let i = 0; i < Math.round((W * H) / 3200); i++)
        stars.push({ x: hash(i, 1) * W, y: hash(i, 2) * H, r: hash(i, 3) < 0.9 ? 0.7 : 1.2, a: 0.04 + hash(i, 4) * 0.11, z: 3 + hash(i, 5) * 5 });
    }

    function text(s: string, x: number, y: number, rgba: string, font: string) {
      ctx!.font = font; ctx!.fillStyle = rgba; ctx!.fillText(s, x, y);
    }

    function label(x: number, y: number, name: string, sub: string) {
      const c = ctx!;
      c.font = `400 10px ${MONO}`;
      const wide = Math.max(c.measureText(name).width * 1.1, c.measureText(sub).width);
      // to the left of the dot when the right side has no room
      const left = x + 19 + wide > W - 8, d = left ? -1 : 1, tx = left ? x - 19 - wide : x + 19;
      c.strokeStyle = `rgba(${GOLD},0.4)`; c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, 6, 0, 6.283); c.stroke();
      c.beginPath(); c.moveTo(x + 7 * d, y - 4); c.lineTo(x + 16 * d, y - 12); c.stroke();
      text(name, tx, y - 12, `rgba(${GOLD},0.9)`, `600 11px ${MONO}`);
      if (sub) text(sub, tx, y + 1, `rgba(${WHITE},0.45)`, `400 10px ${MONO}`);
    }

    function draw() {
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx!.clearRect(0, 0, W, H);
      ctx!.globalAlpha = fade;
      hits = [];
      const show = hover || tour;

      for (const s of stars) { ctx!.fillStyle = `rgba(${WHITE},${s.a})`; ctx!.fillRect(s.x + lean.x * s.z, s.y + lean.y * s.z, s.r, s.r); }

      // Veldin shows the first trip of the first game
      if (show === "Veldin") {
        const g = GALAXIES[0], pts = ["Veldin", "Novalis", "Kerwan"].map((n) => planetAt(g, g.ps.find((p) => p.n === n)!));
        ctx!.strokeStyle = `rgba(${GOLD},0.35)`; ctx!.setLineDash([3, 5]); ctx!.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx!.lineTo(x, y) : ctx!.moveTo(x, y))); ctx!.stroke(); ctx!.setLineDash([]);
      }
      // through the rift: Polaris again, as the other dimension has it
      if (show === "rift") drawGalaxy(3, 26, -18, 0.35);

      GALAXIES.forEach((g, i) => drawGalaxy(i, 0, 0, 1));

      // galaxy names, quiet
      GALAXIES.forEach((g) => {
        const [x, y] = at(g.x, g.y, g.z), o = g.r * S * 0.7;
        ctx!.font = `600 9px ${display}`;
        const w = Math.max(ctx!.measureText(g.n).width, 90);
        // left of the galaxy when mirrored or when the right edge is too close
        const lx = mirror || x + o + w > W - 8 ? x - o - w : x + o, ly = y + g.r * S * 0.42;
        text(g.n, lx, ly, `rgba(${WHITE},0.22)`, `600 9px ${display}`);
        text(g.games, lx, ly + 12, `rgba(${WHITE},0.12)`, `400 9px ${MONO}`);
      });

      drawSpots();

      // planets
      let hot: [number, number, Planet] | null = null;
      for (const g of GALAXIES) for (const p of g.ps) {
        const [x, y] = planetAt(g, p), on = show === p.n;
        hits.push({ id: p.n, x, y });
        ctx!.fillStyle = on ? `rgba(${GOLD},0.95)` : `rgba(${WHITE},0.26)`;
        ctx!.beginPath(); ctx!.arc(x, y, on ? 2.2 : 1.3, 0, 6.283); ctx!.fill();
        if (on) hot = [x, y, p];
      }
      if (hot) label(hot[0], hot[1], hot[2].n, [hot[2].c, hot[2].g].filter(Boolean).join(" · "));

      if (toast) {
        const [x, y] = at(30, 590, 0);
        text(toast, mirror ? x - 260 : x, Math.min(y, H - 12), `rgba(${GOLD},0.8)`, `600 10px ${MONO}`);
      }
      ctx!.globalAlpha = 1;
    }

    function planetAt(g: Galaxy, p: Planet) {
      const [cx, cy] = at(g.x, g.y, g.z + 4);
      const a = p.a + lean.rot * 2, r = g.r * S * p.d;
      const ex = Math.cos(a) * r, ey = Math.sin(a) * r * g.flat, t = (mirror ? -g.tilt : g.tilt) + lean.rot;
      return [cx + ex * Math.cos(t) - ey * Math.sin(t), cy + ex * Math.sin(t) + ey * Math.cos(t)] as const;
    }

    function drawGalaxy(i: number, dx: number, dy: number, alpha: number) {
      const g = GALAXIES[i], img = sprites[i], [x, y] = at(g.x, g.y, g.z), size = img.width / DPR;
      ctx!.save(); ctx!.globalAlpha = fade * alpha; ctx!.translate(x + dx, y + dy);
      ctx!.rotate((mirror ? -g.tilt : g.tilt) + lean.rot); ctx!.drawImage(img, -size / 2, -size / 2, size, size); ctx!.restore();
      ctx!.globalAlpha = fade;
    }

    function drawSpots() {
      const c = ctx!, show = hover || tour;
      const spots = bolts.every(Boolean) ? [...SPOTS, MUSEUM] : SPOTS;
      for (const s of spots) {
        const [x, y] = at(s.x, s.y, s.z), on = show === s.id;
        hits.push({ id: s.id, x, y });
        c.strokeStyle = `rgba(${on ? GOLD : WHITE},${on ? 0.75 : 0.22})`; c.fillStyle = c.strokeStyle; c.lineWidth = 1;
        c.beginPath();
        if (s.id === "clock") {
          // a dial of twelve ticks
          c.arc(x, y, 7, 0, 6.283);
          for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.283; c.moveTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); c.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); }
          c.moveTo(x, y); c.lineTo(x, y - 5); c.moveTo(x, y); c.lineTo(x + 3.5, y + 1);
        } else if (s.id === "rift") {
          c.moveTo(x - 9, y + 10); c.lineTo(x - 3, y + 2); c.lineTo(x - 6, y - 1); c.lineTo(x + 2, y - 9); c.lineTo(x, y - 3); c.lineTo(x + 6, y - 5);
        } else if (s.id === "aphelion") {
          c.moveTo(x + 7, y); c.lineTo(x - 5, y - 4); c.lineTo(x - 3, y); c.lineTo(x - 5, y + 4); c.closePath();
        } else if (s.id === "deplanetizer") {
          c.ellipse(x, y, 8, 3, -0.3, 0, 6.283); c.moveTo(x + 2, y); c.arc(x, y, 2, 0, 6.283);
        } else if (s.id === "phoenix") {
          c.moveTo(x, y - 5); c.lineTo(x + 8, y); c.lineTo(x, y + 5); c.lineTo(x - 8, y); c.closePath();
        } else if (s.id === "station") {
          c.arc(x, y, 4, 0, 6.283); c.moveTo(x - 9, y); c.lineTo(x - 5, y); c.moveTo(x + 5, y); c.lineTo(x + 9, y);
        } else {
          c.rect(x - 4, y - 3, 8, 6); c.moveTo(x - 5, y - 3); c.lineTo(x, y - 7); c.lineTo(x + 5, y - 3);
        }
        c.stroke();
        if (on) label(x, y, s.n, s.c);
      }
      // gold bolts: only for a mouse, only the ones still out there
      if (fine) BOLTS.forEach((b, i) => {
        if (bolts[i]) return;
        const [x, y] = at(b.x, b.y, 6), on = show === `bolt${i}`;
        hits.push({ id: `bolt${i}`, x, y });
        c.fillStyle = `rgba(${GOLD},${on ? 0.9 : 0.3})`; c.beginPath();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.283 + 0.5; c[k ? "lineTo" : "moveTo"](x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2); }
        c.fill();
      });
    }

    function step() {
      raf = 0;
      if (still) { lean.x = lean.tx; lean.y = lean.ty; lean.rot = lean.tr; draw(); return; }
      lean.vx = (lean.vx + (lean.tx - lean.x) * 0.05) * 0.84;
      lean.vy = (lean.vy + (lean.ty - lean.y) * 0.05) * 0.84;
      lean.vr = (lean.vr + (lean.tr - lean.rot) * 0.06) * 0.82;
      lean.x += lean.vx; lean.y += lean.vy; lean.rot += lean.vr;
      draw();
      if (Math.abs(lean.vx) + Math.abs(lean.vy) + Math.abs(lean.vr) * 40 > 0.0004) raf = requestAnimationFrame(step);
    }
    const kick = () => { if (!raf && visible) raf = requestAnimationFrame(step); };

    function nearest(x: number, y: number, max: number) {
      let best = "", bd = max;
      for (const h of hits) { const d = Math.hypot(h.x - x, h.y - y); if (d < bd) { bd = d; best = h.id; } }
      return best;
    }

    function say(s: string) {
      toast = s; clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => { toast = ""; kick(); draw(); }, 3200);
      draw();
    }

    // How far the hero has scrolled away: 0 at the top, 1 once it is gone.
    function scrolled() {
      const r = cv!.getBoundingClientRect();
      return Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
    }

    function onScroll() {
      if (!visible) return;
      const k = scrolled();
      lean.tr = k * 0.35;
      lean.ty = (mouse ? (mouse.y / H - 0.5) : 0) - k * 4;
      if (!fine) {
        // a short tour, one stop at a time, only while the hero is still mostly on screen
        const i = Math.floor((k / 0.75) * TOUR.length);
        const next = k > 0.04 && i < TOUR.length ? spotId(TOUR[i]) : "";
        if (next !== tour) tour = next;
      }
      kick();
    }
    const spotId = (n: string) => SPOTS.find((s) => s.n === n)?.id ?? n;

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse" || !visible) return;
      const r = cv!.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (y < 0 || y > r.height) { if (mouse) { mouse = null; hover = ""; lean.tx = 0; onScroll(); } return; }
      mouse = { x, y };
      lean.tx = x / W - 0.5;
      const h = nearest(x, y, 16);
      if (h !== hover) { hover = h; if (still) draw(); }
      onScroll();
    }

    function onClick(e: MouseEvent) {
      if (!fine || !hover.startsWith("bolt")) return;
      if ((e.target as Element).closest("a,button,input,dialog")) return;
      bolts[+hover.slice(4)] = true; hover = "";
      try { localStorage.setItem("openrac-bolts", JSON.stringify(bolts)); } catch {}
      const n = bolts.filter(Boolean).length;
      say(n < 3 ? `GOLD BOLT ${n}/3` : "GOLD BOLT 3/3 · a new place appeared");
    }

    let keys: string[] = [], typed = "";
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable],dialog") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keys = [...keys, k].slice(-KONAMI.length);
      if (keys.join() === KONAMI.join()) { keys = []; mirror = !mirror; say(mirror ? "MIRROR MODE ON" : "MIRROR MODE OFF"); return; }
      if (k.length === 1) {
        typed = (typed + k).slice(-6);
        if (typed.endsWith("qwark")) say("Captain Qwark approves this decompilation.");
        else if (typed.endsWith("clank")) say("Clank: we appear to be in the background, Ratchet.");
        else if (typed.endsWith("bolts")) say(`${bolts.filter(Boolean).length} of 3 gold bolts found. Look closer.`);
      }
    }

    layout(); onScroll(); draw();
    const ro = new ResizeObserver(() => { layout(); draw(); });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) onScroll(); });
    io.observe(cv);
    addEventListener("scroll", onScroll, { passive: true });
    if (fine) { addEventListener("pointermove", onMove, { passive: true }); addEventListener("click", onClick); }
    addEventListener("keydown", onKey);
    return () => {
      ro.disconnect(); io.disconnect(); cancelAnimationFrame(raf); clearTimeout(toastTimer);
      removeEventListener("scroll", onScroll); removeEventListener("pointermove", onMove);
      removeEventListener("click", onClick); removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 h-full w-[100vw] -translate-x-1/2 [mask-image:linear-gradient(to_bottom,black_75%,transparent)]"
    />
  );
}
