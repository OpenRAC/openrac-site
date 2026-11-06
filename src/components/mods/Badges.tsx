import { DISC_LABEL, IMPACT_LABEL, TYPE_LABEL, type Works } from "@/lib/mods/logic";
import type { Impact, ModType } from "@/lib/mods/types";

// min-w-0 and a truncating label: in a one-line row (a mod card) a long badge shortens with "…" instead of spilling out.
const pill = "inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 font-orbitron text-[10px] font-bold uppercase tracking-[.15em] leading-[1.4]";

/** Script and data mods are calm; native code gets the warning colour, since it runs on the player's computer. */
const TYPE_STYLE: Record<ModType, string> = {
  script: "bg-amber/10 text-amber",
  native: "bg-amber/20 text-gold",
  data: "bg-white/[.07] text-soft",
  pack: "bg-discord/15 text-discord",
};

export function TypeBadge({ type }: { type: ModType }) {
  return (
    <span className={`${pill} flex-none ${TYPE_STYLE[type]}`} title={type === "native" ? "Runs native code on your computer" : type === "script" ? "Runs scripts in the game's sandbox" : undefined}>
      {type === "native" && <span aria-hidden>⚠</span>}
      <span className="truncate">{TYPE_LABEL[type]}</span>
    </span>
  );
}

export function ImpactBadges({ impact, max = 3 }: { impact: Impact[]; max?: number }) {
  return (
    <>
      {impact.slice(0, max).map((i) => (
        <span key={i} className={`${pill} ${i === "touches-saves" ? "bg-amber/10 text-amber" : "bg-white/[.07] text-soft"}`}>
          <span className="truncate">{IMPACT_LABEL[i]}</span>
        </span>
      ))}
    </>
  );
}

/** A plain statement, not a warning: the calm colours, stated by the author and not checked by anyone. */
export function AiBadge() {
  return (
    <span className={`${pill} flex-none bg-white/[.07] text-soft`} title="The author says AI tools helped make this mod">
      <span className="truncate">AI-assisted</span>
    </span>
  );
}

/** "Dev build only" pulses like the progress cards' research badge: it is a state, not a kind. */
export function WorksBadge({ works }: { works: Works }) {
  if (works === "release") return null;
  return (
    <span className={`${pill} ${works === "dev" ? "bg-amber/10 text-amber" : "bg-white/[.07] text-dim"}`} title={works === "dev" ? "Needs the dev build of the launcher" : "Needs a newer launcher than any released"}>
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
          <span key={d} className={`${pill} bg-white/[.07] text-soft`}>
            {DISC_LABEL[d] ?? d}
          </span>
        ))}
    </>
  );
}
