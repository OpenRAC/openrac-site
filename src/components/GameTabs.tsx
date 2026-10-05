"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface GameTab {
  id: string;
  /** Release, e.g. "PAL". */
  region: string;
  /** The project's own name. */
  project: string;
  /** The card, rendered on the server. */
  panel: ReactNode;
}

/**
 * One game decompiled by more than one project: a tab per project above its card.
 * The first tab is shown by default; the others are one click (or arrow key) away.
 */
export default function GameTabs({ game, tabs }: { game: string; tabs: GameTab[] }) {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + tabs.length) % tabs.length;
    setActive(next);
    buttons.current[next]?.focus();
  };

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="tablist" aria-label={`${game} projects`} onKeyDown={onKeyDown} className="inline-flex flex-wrap gap-1 rounded-full border border-lav/25 bg-ink/70 p-1">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => { buttons.current[i] = el; }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={i === active}
              aria-controls={`panel-${t.id}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                i === active
                  ? "bg-gradient-to-b from-amber to-[#ff8a00] text-[#1a0d00] shadow-[0_4px_16px_rgb(255_138_0/0.3)]"
                  : "text-soft hover:bg-white/5 hover:text-lav"
              }`}
            >
              <b className="font-orbitron font-bold tracking-wide">{t.region}</b>
              <span className={i === active ? "text-[#1a0d00]/75" : "text-dim"}> · {t.project}</span>
            </button>
          ))}
        </div>
        <p className="text-[13px] text-dim">
          This game has {tabs.length} independent community decompilations, one per release.
        </p>
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={i !== active}>
          {t.panel}
        </div>
      ))}
    </div>
  );
}
