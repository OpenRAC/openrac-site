import type { ReactNode } from "react";

/**
 * The small drawings beside each section's heading, in place of a number: flat shapes with a dark
 * outline over a spiky gold burst, the jagged edge of the logo's lombax.
 * Decorative only: screen readers skip them, the heading names the section.
 */

const INK = "#0c0c12";
const GOLD = "#f5c040";
const GOLD_DARK = "#d6a020";
const GOLD_LIGHT = "#ffe08f";
const PANEL = "#2a2a38";
const PANEL_LIGHT = "#3d3d50";
const WHITE = "#efeff3";
const BLUE = "#6f7af5";

/** A jagged star of `n` spikes around (cx, cy): the same uneven rhythm every time, so the server and browser agree. */
function burst(cx: number, cy: number, r: number, n: number, turn = 0): string {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = turn + (i * Math.PI) / n;
    // outer points vary a little, like fur; inner points sit close in
    const rr = i % 2 ? r * 0.8 : r * (0.94 + 0.06 * Math.sin(i * 2.3));
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** The jagged backdrop: a faint gold fill with a stronger edge. */
const Burst = ({ d }: { d: string }) => <path d={d} fill={GOLD} fillOpacity={0.1} stroke={GOLD_DARK} strokeOpacity={0.55} strokeWidth={1.5} strokeLinejoin="round" />;


/** A line drawn as an outlined stroke: dark underneath, colour on top. */
function Bar({ d, color, w = 8 }: { d: string; color: string; w?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke={INK} strokeWidth={w + 5} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

const line = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };


const ART: Record<string, ReactNode> = {
  // bars rising to a flag
  progress: (
    <>
      <Burst d={burst(58, 50, 40, 11, 0.2)} />
      <path d="M78 30V10" {...line} />
      <path d="M78 10h18l-5 6 5 6H78z" fill={BLUE} {...line} />
      <rect x="26" y="60" width="16" height="20" rx="2" fill={GOLD_DARK} {...line} />
      <rect x="48" y="46" width="16" height="34" rx="2" fill={GOLD} {...line} />
      <rect x="70" y="30" width="16" height="50" rx="2" fill={GOLD_LIGHT} {...line} />
      <path d="M16 80H98" {...line} strokeWidth={3} />
    </>
  ),
  // a wrench and a speech bubble
  contribute: (
    <>
      <Burst d={burst(56, 50, 40, 12)} />
      <g transform="rotate(-38 46 56)">
        <Bar d="M46 52V88" color={GOLD} w={9} />
        <Bar d="M38.5 30.5A12 12 0 1 0 53.5 30.5" color={GOLD} w={8} />
      </g>
      <path d="M66 14h34a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H84l-10 9 2-9h-10a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8z" fill={BLUE} {...line} />
      <circle cx="74" cy="30" r="3" fill={WHITE} />
      <circle cx="83" cy="30" r="3" fill={WHITE} />
      <circle cx="92" cy="30" r="3" fill={WHITE} />
    </>
  ),
  // a feed of recent commits, with a clock
  activity: (
    <>
      <Burst d={burst(60, 48, 40, 10, 0.4)} />
      <rect x="20" y="14" width="66" height="66" rx="6" fill={PANEL} {...line} />
      {[30, 46, 62].map((y, i) => (
        <g key={y}>
          <circle cx="32" cy={y} r="4" fill={GOLD} {...line} strokeWidth={2} />
          <path d={`M42 ${y}h${[32, 24, 28][i]}`} stroke={WHITE} strokeWidth={3} strokeLinecap="round" />
        </g>
      ))}
      <circle cx="88" cy="68" r="17" fill={BLUE} {...line} />
      <path d="M88 58v10l7 5" fill="none" stroke={WHITE} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // a disc turned into code
  how: (
    <>
      <Burst d={burst(60, 50, 42, 12, 0.1)} />
      <circle cx="32" cy="52" r="22" fill={WHITE} {...line} />
      <path d="M32 30a22 22 0 0 1 22 22H44a12 12 0 0 0-12-12z" fill={GOLD_LIGHT} />
      <circle cx="32" cy="52" r="22" fill="none" {...line} />
      <circle cx="32" cy="52" r="7" fill={PANEL} {...line} />
      <path d="M58 46l6 6-6 6M66 46l6 6-6 6" fill="none" stroke={GOLD} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="78" y="28" width="34" height="46" rx="5" fill={PANEL} {...line} />
      <path d="M86 40h12M86 48h18M90 56h10M86 64h14" stroke={GOLD} strokeWidth={3} strokeLinecap="round" />
      <path d="M86 48h0" stroke={BLUE} strokeWidth={3} />
    </>
  ),
  // an open toolbox
  resources: (
    <>
      <Burst d={burst(60, 52, 40, 11, 0.3)} />
      <Bar d="M44 24V12" color={WHITE} w={5} />
      <path d="M38 28h12l-2 14h-8z" fill={BLUE} {...line} />
      <g transform="rotate(20 74 30)">
        <Bar d="M74 22V46" color={PANEL_LIGHT} w={6} />
        <Bar d="M68.5 14.5A8 8 0 1 0 79.5 14.5" color={PANEL_LIGHT} w={5} />
      </g>
      <path d="M22 44h76l-4 36H26z" fill={GOLD} {...line} />
      <path d="M22 44h76v10H22z" fill={GOLD_DARK} {...line} />
      <rect x="53" y="50" width="14" height="9" rx="2" fill={PANEL} {...line} />
    </>
  ),
  // a question and an answer
  faq: (
    <>
      <Burst d={burst(58, 48, 40, 12, 0.25)} />
      <path d="M14 16h50a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H38l-12 11 2-11h-6a8 8 0 0 1-8-8V24a8 8 0 0 1 8-8z" fill={GOLD} {...line} />
      <path d="M33 30a7 7 0 1 1 9 7c-2 1-3 2-3 4" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <circle cx="39" cy="49" r="2.4" fill={INK} />
      <path d="M62 44h40a7 7 0 0 1 7 7v18a7 7 0 0 1-7 7h-4l2 10-12-10H62a7 7 0 0 1-7-7V51a7 7 0 0 1 7-7z" fill={PANEL} {...line} />
      <path d="M82 52v10" stroke={GOLD} strokeWidth={4} strokeLinecap="round" />
      <circle cx="82" cy="69" r="2.4" fill={GOLD} />
    </>
  ),
  // a chip with a tick: the compiler decides
  ai: (
    <>
      <Burst d={burst(60, 50, 42, 12, 0.15)} />
      <g stroke={INK} strokeWidth={5} strokeLinecap="round">
        {[42, 54, 66, 78].map((v) => (
          <path key={v} d={`M${v} 18v-6M${v} 82v6M28 ${v - 10}h-6M92 ${v - 10}h6`} />
        ))}
      </g>
      <g stroke={GOLD_DARK} strokeWidth={2} strokeLinecap="round">
        {[42, 54, 66, 78].map((v) => (
          <path key={v} d={`M${v} 18v-6M${v} 82v6M28 ${v - 10}h-6M92 ${v - 10}h6`} />
        ))}
      </g>
      <rect x="28" y="18" width="64" height="64" rx="8" fill={PANEL} {...line} />
      <rect x="40" y="30" width="40" height="40" rx="5" fill={GOLD} {...line} />
      <path d="M48 50l8 8 16-17" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // a trophy
  credits: (
    <>
      <Burst d={burst(60, 48, 40, 11, 0.35)} />
      <Bar d="M40 30C26 30 26 50 44 52M80 30C94 30 94 50 76 52" color={GOLD_DARK} w={4} />
      <path d="M38 18h44v18c0 14-10 24-22 24S38 50 38 36z" fill={GOLD} {...line} />
      <path d="M54 60h12l2 10H52z" fill={GOLD_DARK} {...line} />
      <rect x="42" y="70" width="36" height="10" rx="2" fill={PANEL} {...line} />
    </>
  ),
  // an arrow into a tray
  download: (
    <>
      <Burst d={burst(60, 50, 40, 12, 0.05)} />
      <path d="M18 54h84v20a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8z" fill={PANEL} {...line} />
      <path d="M18 54h26l4 8h24l4-8h26" fill="none" {...line} />
      <circle cx="90" cy="72" r="3" fill={GOLD} />
      <path d="M51 8h18v26h13L60 60 38 34h13z" fill={GOLD} {...line} />
    </>
  ),
  // a bolt and a wrench crossed: the mod list
  mods: (
    <>
      <Burst d={burst(60, 50, 40, 12, 0.12)} />
      <g transform="rotate(40 60 50)">
        <Bar d="M60 46V86" color={GOLD} w={9} />
        <Bar d="M52.5 24.5A12 12 0 1 0 67.5 24.5" color={GOLD} w={8} />
      </g>
      <path d="M38 22l10-6 10 6v12l-10 6-10-6z" fill={GOLD_LIGHT} {...line} />
      <circle cx="48" cy="28" r="4" fill={PANEL} {...line} />
      <path d="M78 58l8-5 8 5v10l-8 5-8-5z" fill={GOLD_DARK} {...line} />
      <circle cx="86" cy="63" r="3" fill={PANEL} {...line} />
    </>
  ),
  // a star: the picked mods
  featured: (
    <>
      <Burst d={burst(58, 50, 40, 11, 0.3)} />
      <path d="M58 16l9 19 21 2-16 14 5 21-19-11-19 11 5-21-16-14 21-2z" fill={GOLD} {...line} />
      <path d="M58 30l4 9 10 1-8 7 2 10-8-5" fill={GOLD_LIGHT} />
    </>
  ),
  // a box with a ribbon: new and updated
  fresh: (
    <>
      <Burst d={burst(60, 52, 40, 12, 0.08)} />
      <rect x="28" y="40" width="64" height="40" rx="4" fill={PANEL} {...line} />
      <rect x="22" y="30" width="76" height="14" rx="3" fill={PANEL_LIGHT} {...line} />
      <path d="M60 30v50" {...line} stroke={GOLD} strokeWidth={8} />
      <path d="M60 30c-8-12-24-12-20-2s20 2 20 2c8-12 24-12 20-2s-20 2-20 2z" fill={GOLD} {...line} />
    </>
  ),
  // a grid of mods under a magnifier: every mod, to search and filter
  all: (
    <>
      <Burst d={burst(60, 50, 40, 12, 0.22)} />
      <rect x="18" y="14" width="30" height="24" rx="4" fill={PANEL} {...line} />
      <rect x="54" y="14" width="30" height="24" rx="4" fill={GOLD} {...line} />
      <rect x="18" y="44" width="30" height="24" rx="4" fill={GOLD_DARK} {...line} />
      <rect x="54" y="44" width="30" height="24" rx="4" fill={PANEL_LIGHT} {...line} />
      <Bar d="M90 70l14 14" color={GOLD} w={8} />
      <circle cx="80" cy="60" r="16" fill={PANEL} {...line} strokeWidth={3} />
      <circle cx="80" cy="60" r="10" fill="none" stroke={GOLD_LIGHT} strokeWidth={3} />
      <path d="M74 56a7 7 0 0 1 5-4" fill="none" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" />
    </>
  ),
  // an arrow out of a tray: publish a mod
  publish: (
    <>
      <Burst d={burst(60, 50, 40, 12, 0.18)} />
      <path d="M18 54h84v20a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8z" fill={PANEL} {...line} />
      <path d="M18 54h26l4 8h24l4-8h26" fill="none" {...line} />
      <path d="M51 58h18V32h13L60 6 38 32h13z" fill={GOLD} {...line} />
    </>
  ),
};

/** The drawing for a section, by its id; nothing for a section without one. */
export default function SectionArt({ id, className = "" }: { id: string; className?: string }) {
  const art = ART[id];
  if (!art) return null;
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className={`flex-none overflow-visible ${className}`}>
      {art}
    </svg>
  );
}
