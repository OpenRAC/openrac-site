"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { GAME_LABEL, IMPACT_LABEL, SORTS, TYPE_LABEL, sortMods, type Sort } from "@/lib/mods/logic";
import { closest, prepare, search } from "@/lib/mods/search";
import type { SlimMod } from "@/lib/mods/slim";
import type { Impact, ModType } from "@/lib/mods/types";
import Boundary from "@/components/ui/Boundary";
import InstallButton from "./InstallButton";
import ModCard from "./ModCard";
import ModTable from "./ModTable";
import Sheet from "./Sheet";
import { usePicked, useStoredView } from "./store";

// Loaded when first opened: most visitors never review a set.
const ChangeSetDialog = dynamic(() => import("./ChangeSetDialog"));

type Preset = "release" | "all" | "dev" | "packs";
const PRESETS: { id: Preset; label: string; hint: string }[] = [
  { id: "release", label: "Works on release", hint: "Mods the released launcher can run" },
  { id: "all", label: "All", hint: "Every listed mod" },
  { id: "dev", label: "Dev build", hint: "Mods that need the dev build of the launcher" },
  { id: "packs", label: "Modpacks", hint: "Sets of mods that install together" },
];
const TYPES: ModType[] = ["script", "native", "data"];
const IMPACTS: Impact[] = ["cosmetic", "gameplay", "speedrun-safe", "touches-saves", "online"];
const PAGE = 48;

const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

/** A filter in use, drawn as an "on" chip; a press takes it off. */
function Active({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <li>
      <button type="button" onClick={onRemove} className="chip" data-on aria-label={`Remove filter: ${label}`}>
        {label}
        <span aria-hidden className="text-[15px] leading-none">×</span>
      </button>
    </li>
  );
}

/** A labelled group of toggle chips: a fieldset, so a screen reader hears the group's name. */
function Chips<T extends string>({ legend, items, on, label, toggle }: { legend: string; items: T[]; on: Set<T>; label: (t: T) => string; toggle: (t: T) => void }) {
  if (!items.length) return null;
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 font-orbitron text-[11px] font-bold uppercase tracking-[.2em] text-dim">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => (
          <button key={t} type="button" aria-pressed={on.has(t)} onClick={() => toggle(t)} className="chip">
            {label(t)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The mod list: presets, search, filters, sort and two views, all kept in the address so a filtered
 * list can be shared (and reloaded) as it is. Filtering runs here in the browser on the slim list, so
 * it answers as you type. Picked mods gather in the change set at the bottom, kept across visits.
 */
export default function ModBrowser({ mods, tags, now }: { mods: SlimMod[]; tags: string[]; now: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const query = useDeferredValue(q);
  const preset = (PRESETS.some((p) => p.id === params.get("preset")) ? params.get("preset") : "release") as Preset;
  const sort = (SORTS.some((s) => s.id === params.get("sort")) ? params.get("sort") : "trending") as Sort;
  const types = useMemo(() => new Set(list(params.get("type")) as ModType[]), [params]);
  const impacts = useMemo(() => new Set(list(params.get("impact")) as Impact[]), [params]);
  const tagOn = useMemo(() => new Set(list(params.get("tag"))), [params]);
  const game = params.get("game") ?? "";
  const [storedView, storeView] = useStoredView();
  const view: "grid" | "list" = params.get("view") === "list" ? "list" : params.get("view") === "grid" ? "grid" : (storedView ?? "grid");
  const [allPicked, setPicked] = usePicked();
  // Picks of mods no longer listed are dropped from view (and from the next save).
  const picked = useMemo(() => allPicked.filter((id) => mods.some((m) => m.id === id)), [allPicked, mods]);
  const [review, setReview] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [announce, setAnnounce] = useState("");
  const searchBox = useRef<HTMLInputElement>(null);
  const more = useRef<HTMLDivElement>(null);

  /** Writes one setting to the address without scrolling or adding a history entry. */
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const s = next.toString();
    startTransition(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
    setShown(PAGE);
  };
  const toggleIn = (key: string, set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setParam(key, [...next].join(",") || null);
  };

  // The search text reaches the address once typing pauses.
  useEffect(() => {
    if ((params.get("q") ?? "") === query) return;
    const t = setTimeout(() => setParam("q", query || null), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // "/" jumps to the search box, as on GitHub; not while typing somewhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !/input|textarea|select/i.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        searchBox.current?.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  const prepared = useMemo(() => mods.map(prepare), [mods]);
  const games = useMemo(() => [...new Set(mods.flatMap((m) => Object.keys(m.games)))], [mods]);

  const results = useMemo(() => {
    const inPreset = (m: SlimMod) =>
      preset === "release" ? m.works === "release" && m.type !== "pack" : preset === "dev" ? m.works === "dev" : preset === "packs" ? m.type === "pack" : true;
    const pass = (m: SlimMod) =>
      inPreset(m) &&
      (!game || m.games[game]) &&
      (!types.size || types.has(m.type)) &&
      [...impacts].every((i) => m.impact.includes(i)) &&
      [...tagOn].every((t) => m.tags.includes(t));
    const found = search(prepared, query).filter(pass);
    // With a query the best matches come first; otherwise the chosen order.
    return query.trim() ? found : sortMods(found, sort, now);
  }, [prepared, query, preset, game, types, impacts, tagOn, sort, now]);

  // The count, read out once results settle, from a live region that is always on the page.
  useEffect(() => {
    const t = setTimeout(() => setAnnounce(`${results.length} mod${results.length === 1 ? "" : "s"}`), 400);
    return () => clearTimeout(t);
  }, [results.length]);

  // More cards as the end of the list comes into view.
  useEffect(() => {
    const el = more.current;
    if (!el || shown >= results.length) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, results.length]);

  const pick = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const active = types.size + impacts.size + tagOn.size + (game ? 1 : 0);
  const clearAll = () => {
    setQ("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  };
  const chooseView = (v: "grid" | "list") => {
    storeView(v);
    setParam("view", null);
  };

  const filters: ReactNode = (
    <div className="grid gap-5">
      {games.length > 1 && (
        <Chips legend="Game" items={games} on={new Set(game ? [game] : [])} label={(g) => GAME_LABEL[g] ?? g} toggle={(g) => setParam("game", game === g ? null : g)} />
      )}
      <Chips legend="Type" items={TYPES} on={types} label={(t) => TYPE_LABEL[t]} toggle={(t) => toggleIn("type", types, t)} />
      <Chips legend="Impact" items={IMPACTS} on={impacts} label={(i) => IMPACT_LABEL[i]} toggle={(i) => toggleIn("impact", impacts, i)} />
      <Chips legend="Tags" items={tags} on={tagOn} label={(t) => t} toggle={(t) => toggleIn("tag", tagOn, t)} />
    </div>
  );

  const suggestion = !results.length && query.trim() ? closest(mods, query) : undefined;

  return (
    <div id="browse" className="scroll-mt-16">
      <a href="#results" className="sr-only focus:not-sr-only focus:absolute focus:z-20 focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2">
        Skip to the mods
      </a>

      {/* Presets: one at a time, like a radio group; a row to swipe on a narrow phone. */}
      <div className="mb-3 overflow-x-auto [scrollbar-width:none]">
        <div role="radiogroup" aria-label="Show" className="seg">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} title={p.hint} onClick={() => setParam("preset", p.id === "release" ? null : p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-[260px]">
          <span className="sr-only">Search mods</span>
          <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 fill-none stroke-dim stroke-2">
            <circle cx="7" cy="7" r="5" />
            <path d="m11 11 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            ref={searchBox}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQ("")}
            placeholder="Search name, author or what it does"
            className="field pl-11 pr-12"
          />
          <kbd aria-hidden className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-white/15 px-1.5 text-[12px] text-dim [@media(hover:hover)]:block">
            /
          </kbd>
        </label>
        {/* Every filter in one panel: the list stays a list, not a wall of buttons. */}
        <button type="button" onClick={() => setFiltersOpen(true)} className={`btn ${active ? "!border-amber" : ""}`} aria-haspopup="dialog">
          <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-none stroke-current stroke-2" strokeLinecap="round">
            <path d="M2 4h12M4.5 8h7M7 12h2" />
          </svg>
          Filters
          {active > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-amber px-1.5 text-[12px] font-bold leading-5 text-[#1a0d00]">{active}</span>}
        </button>
        <label className="flex items-center gap-2 text-[14px] text-dim">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setParam("sort", e.target.value === "trending" ? null : e.target.value)} className="field">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label="View" className="seg">
          {(["grid", "list"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => chooseView(v)}>
              <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
                {v === "grid" ? <path d="M2 2h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z" /> : <path d="M2 3h12v2H2zm0 4h12v2H2zm0 4h12v2H2z" />}
              </svg>
              {v === "grid" ? "Showcase" : "List"}
            </button>
          ))}
        </div>
      </div>

      {/* Only the filters in use, each with its own ×; the rest wait in the Filters panel. */}
      {active > 0 && (
        <ul aria-label="Filters in use" className="mb-3 flex flex-wrap gap-1.5">
          {game && <Active label={GAME_LABEL[game] ?? game} onRemove={() => setParam("game", null)} />}
          {[...types].map((t) => <Active key={t} label={TYPE_LABEL[t]} onRemove={() => toggleIn("type", types, t)} />)}
          {[...impacts].map((i) => <Active key={i} label={IMPACT_LABEL[i]} onRemove={() => toggleIn("impact", impacts, i)} />)}
          {[...tagOn].map((t) => <Active key={t} label={t} onRemove={() => toggleIn("tag", tagOn, t)} />)}
        </ul>
      )}

      <div className="mb-4 flex min-h-6 flex-wrap items-center gap-3 text-[14px] text-dim">
        <p role="status" aria-live="polite" aria-atomic="true">
          {announce}
        </p>
        {(active > 0 || query) && (
          <button type="button" onClick={clearAll} className="text-amber underline-offset-2 hover:underline">
            Clear filters
          </button>
        )}
        {active > 1 && view === "grid" && (
          <button type="button" onClick={() => chooseView("list")} className="text-amber underline-offset-2 hover:underline">
            Compare in a list
          </button>
        )}
      </div>

      <div id="results" tabIndex={-1}>
        {results.length === 0 ? (
          <div className="surface grid justify-items-center gap-3 px-6 py-12 text-center">
            <p className="font-audiowide text-[22px] text-hi">{mods.length ? "No mods match" : "No mods for this game yet"}</p>
            <p className="max-w-[460px] text-dim">
              {suggestion ? (
                <>
                  Did you mean{" "}
                  <button type="button" className="text-amber underline" onClick={() => setQ(suggestion.name)}>
                    {suggestion.name}
                  </button>
                  ?
                </>
              ) : mods.length ? (
                "Try fewer filters or another word."
              ) : (
                "Be the first to publish one."
              )}
            </p>
            {mods.length > 0 && (
              <button type="button" className="btn" onClick={clearAll}>
                Clear filters
              </button>
            )}
          </div>
        ) : view === "list" ? (
          <ModTable mods={results.slice(0, shown)} now={now} query={query} sort={sort} onSort={(s) => setParam("sort", s === "trending" ? null : s)} picked={new Set(picked)} onPick={pick} />
        ) : (
          <div className="grid gap-4 min-[480px]:grid-cols-2 min-[821px]:grid-cols-3 sm:gap-5">
            {results.slice(0, shown).map((m) => (
              <ModCard
                key={m.id}
                mod={m}
                now={now}
                query={query}
                actions={
                  <>
                    <InstallButton mods={[{ id: m.id }]} small primary={false} devOnly={m.works !== "release"} />
                    <button type="button" aria-pressed={picked.includes(m.id)} onClick={() => pick(m.id)} className={`btn btn-sm ${picked.includes(m.id) ? "!border-amber text-amber" : ""}`}>
                      {picked.includes(m.id) ? "In set ✓" : "Add to set"}
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
        {shown < results.length && (
          <div ref={more} className="mt-6 flex justify-center">
            <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE)}>
              Show more
            </button>
          </div>
        )}
      </div>

      {/* The change set: at the bottom of the screen, in reach of a thumb. */}
      {picked.length > 0 && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
          <div className="surface flex flex-wrap items-center gap-3 overflow-hidden !bg-ink p-3 pl-4 shadow-[0_-12px_40px_rgb(0_0_0/0.55)]">
            <div aria-hidden className="bar-stripes absolute inset-x-0 top-0 h-1" />
            <p className="min-w-0 flex-1 text-[15px] text-soft">
              <b className="font-orbitron text-gold">{picked.length}</b> mod{picked.length === 1 ? "" : "s"} in the set
            </p>
            <button type="button" className="btn btn-sm" onClick={() => setPicked([])}>
              Clear
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setReview(true)}>
              Review &amp; install
            </button>
          </div>
        </div>
      )}

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        wide
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFiltersOpen(false)}>
            Show {results.length} mod{results.length === 1 ? "" : "s"}
          </button>
        }
      >
        {filters}
      </Sheet>
      {review && (
        <Boundary what="install review">
          <ChangeSetDialog mods={mods} picked={picked} open={review} onClose={() => setReview(false)} onDone={() => {}} />
        </Boundary>
      )}
    </div>
  );
}
