import { DISC_LABEL, IMPACT_LABEL, TYPE_LABEL, type Works } from "@/lib/mods/logic";
import type { Impact, ModType } from "@/lib/mods/types";

// min-w-0 and a truncating label: in a one-line row (a mod card) a long badge shortens with "…" instead of spilling out.
const pill = "inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 font-orbitron text-[10px] font-bold uppercase tracking-[.15em] leading-[1.4]";

/** Every kind is calm, like the other badges: most mods are native, so a loud one would outshine the name.
    Native keeps a small warning mark in the accent (and its title), since it runs on the player's computer. */
const TYPE_STYLE: Record<ModType, string> = {
  script: "border-white/15 text-soft",
  native: "border-white/15 text-soft",
  data: "border-white/15 text-soft",
  pack: "border-discord/45 text-discord",
};

export function TypeBadge({ type }: { type: ModType }) {
  return (
    <span className={`${pill} flex-none ${TYPE_STYLE[type]}`} title={type === "native" ? "Runs native code on your computer" : type === "script" ? "Runs scripts in the game's sandbox" : undefined}>
      {type === "native" && <span aria-hidden className="text-amber/80">⚠</span>}
      <span className="truncate">{TYPE_LABEL[type]}</span>
    </span>
  );
}

export function ImpactBadges({ impact, max = 3 }: { impact: Impact[]; max?: number }) {
  return (
    <>
      {impact.slice(0, max).map((i) => (
        <span key={i} className={`${pill} ${i === "touches-saves" ? "border-amber/40 text-amber" : "border-white/15 text-soft"}`}>
          <span className="truncate">{IMPACT_LABEL[i]}</span>
        </span>
      ))}
    </>
  );
}

/** "Dev build only" pulses like the progress cards' research badge: it is a state, not a kind. */
export function WorksBadge({ works }: { works: Works }) {
  if (works === "release") return null;
  return (
    <span className={`${pill} ${works === "dev" ? "border-amber/40 text-amber" : "border-white/15 text-dim"}`} title={works === "dev" ? "Needs the dev build of the launcher" : "Needs a newer launcher than any released"}>
      <i aria-hidden className="size-1.5 animate-pulse rounded-full bg-current" />
      <span className="truncate">{works === "dev" ? "Dev build only" : "Needs a newer launcher"}</span>
    </span>
  );
}

export function DiscBadges({ games }: { games: Record<string, string[]> }) {
  return (
    <>
      {Object.values(games)
        .flat()
        .filter((d, i, all) => all.indexOf(d) === i)
        .map((d) => (
          <span key={d} className={`${pill} border-white/15 text-soft`}>
            {DISC_LABEL[d] ?? d}
          </span>
        ))}
    </>
  );
}
