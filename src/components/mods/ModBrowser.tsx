"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ago, CHECKED, DISC_LABEL, formatCount, GAME_LABEL, gameOf, SORTS, sortMods, TRUSTS, type Sort } from "@/lib/mods/logic";
import { closest, prepare, search } from "@/lib/mods/search";
import type { SlimMod } from "@/lib/mods/slim";
import type { Trust } from "@/lib/mods/types";
import Boundary from "@/components/ui/Boundary";
import { TrustBadge } from "./Badges";
import InstallButton from "./InstallButton";
import Marked from "./Marked";
import ModImage from "./ModImage";
import ModsIntro from "./ModsIntro";
import ModsShell, { Count, SideGroup, sideItem } from "./ModsShell";
import { usePicked } from "./store";

// Loaded when first opened: most visitors never review a set.
// Its code comes only when a set is opened; a spinner holds its place meanwhile.
const ChangeSetDialog = dynamic(() => import("./ChangeSetDialog"), {
  loading: () => (
    <span role="status" aria-label="Loading" className="fixed inset-0 z-40 grid place-items-center bg-black/50">
      <span className="spinner" />
    </span>
  ),
});

const PAGE = 48;
const DAY = 86_400_000;
const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

/** The three rows of "Checked by OpenRAC": the four labels, OpenRAC and Verified together. */
const TRUST_ROWS: { label: string; trusts: Trust[]; risk?: boolean }[] = [
  { label: "OpenRAC and verified", trusts: ["openrac", "verified"] },
  { label: "Trusted authors", trusts: ["trusted"] },
  { label: "Not checked", trusts: ["unchecked"], risk: true },
];

/** What a mod is, in the words a player knows: whether it runs code is what matters most. */
export function Kind({ mod }: { mod: SlimMod }) {
  const [icon, text] =
    mod.type === "native"
      ? ["⚠", "Runs code"]
      : mod.type === "script"
        ? ["⚙", "Script"]
        : mod.type === "pack"
          ? ["▤", `Modpack · ${mod.requires.length} mod${mod.requires.length === 1 ? "" : "s"}`]
          : ["◫", "Data pack"];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13.5px] text-soft" title={mod.type === "native" ? "Runs native code on your computer" : undefined}>
      <b aria-hidden className={`w-3.5 text-center font-normal ${mod.type === "native" ? "text-amber" : "text-dim"}`}>
        {icon}
      </b>
      {text}
    </span>
  );
}

/** A box drawn like the mockup's: amber when ticked. The real checkbox sits under it for keyboards and screen readers. */
function Tick({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <span className="relative grid size-[18px] flex-none place-items-center">
      <input type="checkbox" checked={on} onChange={onChange} aria-label={label} className="peer absolute inset-0 m-0 cursor-pointer opacity-0" />
      <span aria-hidden key={String(on)} className={`grid size-[18px] place-items-center rounded-[4px] transition-colors duration-200 ${on ? "m-pop" : ""} text-[12px] font-bold leading-none peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-amber ${on ? "bg-amber text-[#1a0d00]" : "bg-raised"}`}>
        {on ? "✓" : ""}
      </span>
    </span>
  );
}

/** A side menu row with a box to tick. */
function CheckRow({ on, toggle, label, n, extra }: { on: boolean; toggle: () => void; label: string; n: number; extra?: ReactNode }) {
  return (
    <label className={`${sideItem(false)} cursor-pointer`}>
      <Tick on={on} onChange={toggle} label={label} />
      <span aria-hidden>{label}</span>
      {extra}
      <Count n={n} />
    </label>
  );
}

/** One mod in the list: the box to pick it, its picture, name and line, label, kind, numbers and Install. */
function ModRow({ mod, now, query, picked, onPick, i }: { mod: SlimMod; now: number; query: string; picked: boolean; onPick: () => void; i: number }) {
  return (
    <li
      style={{ "--i": Math.min(i, 12) } as CSSProperties}
      className={`m-row m-in group/row relative grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t border-line px-3 py-3 first:border-0 sm:grid-cols-[18px_88px_minmax(0,1fr)_auto] xl:grid-cols-[18px_88px_minmax(0,1fr)_150px_150px_76px_104px] ${picked ? "bg-amber/[.06]" : "hover:bg-coal"}`}
    >
      {/* A 44 px target around the small box. */}
      <label className="relative z-10 -m-[13px] grid size-11 cursor-pointer place-items-center">
        <Tick on={picked} onChange={onPick} label={`Add ${mod.name} to the set`} />
      </label>
      <span aria-hidden className="block aspect-video w-[88px] overflow-hidden rounded-md bg-no-picture m-thumb max-sm:hidden">
        {mod.card && <ModImage img={mod.card} sizes="88px" alt="" className="size-full object-cover" />}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[15px]">
          <Link href={`/mods/${mod.id}`} prefetch={false} className="font-semibold text-hi no-underline after:absolute after:inset-0 after:content-[''] hover:text-amber">
            <Marked text={mod.name} query={query} />
          </Link>{" "}
          <span className="text-[13.5px] text-dim">
            by <Marked text={mod.author} query={query} />
          </span>
        </p>
        <p className="truncate text-[14px] text-soft">
          <Marked text={mod.description} query={query} />
        </p>
        {/* Below the widest layout the label and kind sit under the line. */}
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 xl:hidden">
          <TrustBadge trust={mod.trust} edge />
          <Kind mod={mod} />
          {mod.works !== "release" && <span className="text-[13px] text-amber">{mod.works === "dev" ? "Dev build only" : "Needs a newer launcher"}</span>}
          <span className="text-[13px] tabular-nums text-dim sm:hidden">
            {formatCount(mod.downloads)} · {ago(mod.updated, now)}
          </span>
        </p>
      </div>
      <span className="max-xl:hidden">
        <TrustBadge trust={mod.trust} edge />
      </span>
      <span className="grid max-xl:hidden">
        <Kind mod={mod} />
        {mod.works !== "release" && <span className="pl-5 text-[12.5px] text-amber">{mod.works === "dev" ? "Dev build only" : "Needs a newer launcher"}</span>}
      </span>
      <span className="grid text-right text-[14px] tabular-nums text-soft max-xl:hidden" title={`${mod.downloads.toLocaleString("en-US")} downloads`}>
        {formatCount(mod.downloads)}
        <small className="text-[12.5px] text-dim">{ago(mod.updated, now)}</small>
      </span>
      <span className="relative z-10 justify-self-end max-sm:col-start-3 max-sm:row-start-1">
        <InstallButton mods={[{ id: mod.id }]} game={gameOf(mod.games)} small primary={false} devOnly={mod.works !== "release"} />
      </span>
    </li>
  );
}

/** This week's picks, one small card each: picture, why it is here, name and line. */
function Pick({ mod, now }: { mod: SlimMod; now: number }) {
  const days = Math.floor((now - Date.parse(mod.updated)) / DAY);
  const why = mod.featured ? "Featured" : days < 3 ? `Updated ${days < 1 ? "today" : ago(mod.updated, now)}` : mod.downloads7d > 0 ? `Trending · +${formatCount(mod.downloads7d)} this week` : `Popular · ${formatCount(mod.downloads)} downloads`;
  return (
    <Link href={`/mods/${mod.id}`} prefetch={false} className="m-pick d-card d-card-link grid grid-cols-[42%_minmax(0,1fr)] overflow-hidden no-underline">
      <span className="m-thumb block overflow-hidden">{mod.card ? <ModImage img={mod.card} sizes="200px" className="aspect-video size-full object-cover" /> : <span aria-hidden className="block aspect-video bg-no-picture" />}</span>
      <span className="grid min-w-0 content-center gap-0.5 px-4 py-3">
        <span className="truncate text-[12.5px] text-dim">{why}</span>
        <span className="truncate text-[15px] font-semibold text-hi">{mod.name}</span>
        <span className="truncate text-[13.5px] text-soft">{mod.description}</span>
      </span>
    </Link>
  );
}

/**
 * The mod list in the frame of the SDK docs: a game at a time, a category, the labels and discs to
 * show, all kept in the address so a filtered list can be shared. Filtering runs here in the browser
 * on the slim list, so it answers as you type. Picked mods gather in the bar at the bottom.
 */
export default function ModBrowser({ mods: listed, now, picks, notice, children }: { mods: SlimMod[]; now: number; picks: Record<string, string[]>; notice?: ReactNode; children?: ReactNode }) {
  const pathname = usePathname();
  // With labels in the list, a mod from an index that gives none counts as not checked: it stays
  // listed and the label filter treats it like any other.
  const labelled = useMemo(() => listed.some((m) => m.trust), [listed]);
  const mods = useMemo(() => (labelled ? listed.map((m) => (m.trust ? m : { ...m, trust: "unchecked" as const })) : listed), [listed, labelled]);
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const query = useDeferredValue(q);
  const sort = (SORTS.some((s) => s.id === params.get("sort")) ? params.get("sort") : "trending") as Sort;
  const cat = params.get("cat") ?? "";
  const dev = params.get("dev") === "1";
  // `checked=1` (the launcher's link with its "Checked by OpenRAC only" on) is the three checked labels.
  const trustOn = useMemo(() => new Set((params.get("checked") ? CHECKED : params.get("trust") !== null ? list(params.get("trust")) : TRUSTS) as Trust[]), [params]);
  const discOn = useMemo(() => new Set(list(params.get("disc"))), [params]);

  // The games with mods, most first; the address picks one, else the one with the most.
  const games = useMemo(() => {
    const n = new Map<string, number>();
    for (const m of mods) if (dev || m.works === "release") for (const g of Object.keys(m.games)) n.set(g, (n.get(g) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));
  }, [mods, dev]);
  const game = games.some((g) => g.id === params.get("game")) ? params.get("game")! : (games[0]?.id ?? "rac1");
  const gameName = GAME_LABEL[game] ?? game;

  const [allPicked, setPicked] = usePicked();
  // Picks of mods no longer listed are dropped from view (and from the next save).
  const picked = useMemo(() => allPicked.filter((id) => mods.some((m) => m.id === id)), [allPicked, mods]);
  const [review, setReview] = useState(false);
  const [intro, setIntro] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [announce, setAnnounce] = useState("");
  const searchBox = useRef<HTMLInputElement>(null);
  const more = useRef<HTMLDivElement>(null);

  /** Writes settings to the address without scrolling or adding a history entry. Straight through
   * the History API, which Next follows: the address changes at once, so the next write (the delayed
   * search one) starts from it and cannot undo a filter picked while it waited. */
  const setParams = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(values)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const s = next.toString();
    history.replaceState(null, "", s ? `${pathname}?${s}` : pathname);
    setShown(PAGE);
  };
  const setParam = (key: string, value: string | null) => setParams({ [key]: value });

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
  const inGame = useMemo(() => mods.filter((m) => m.games[game]), [mods, game]);
  const discs = useMemo(() => [...new Set(inGame.flatMap((m) => m.games[game]))], [inGame, game]);

  // Each filter, so a group's counts can leave its own filter out (as a shop's sidebar does).
  const passCat = (m: SlimMod) => (!cat ? true : cat === "packs" ? m.type === "pack" : m.tags.includes(cat));
  const passTrust = (m: SlimMod) => !labelled || (!!m.trust && trustOn.has(m.trust));
  const passDisc = (m: SlimMod) => !discOn.size || m.games[game]?.some((d) => discOn.has(d));
  const passDev = (m: SlimMod) => dev || m.works === "release";

  const results = useMemo(() => {
    const found = search(prepared, query).filter((m) => m.games[game] && passCat(m) && passTrust(m) && passDisc(m) && passDev(m));
    // With a query the best matches come first; otherwise the chosen order.
    return query.trim() ? found : sortMods(found, sort, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared, query, game, cat, trustOn, discOn, dev, sort, now, labelled]);

  const base = inGame.filter((m) => passDev(m));
  const tags = useMemo(() => {
    const n = new Map<string, number>();
    for (const m of base) if (passTrust(m) && passDisc(m)) for (const t of m.tags) n.set(t, (n.get(t) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.length, game, trustOn, discOn, dev]);
  const countBy = (f: (m: SlimMod) => boolean) => base.filter(f).length;

  // The count, read out once results settle, from a live region that is always on the page.
  useEffect(() => {
    const t = setTimeout(() => setAnnounce(`${results.length} mod${results.length === 1 ? "" : "s"}`), 400);
    return () => clearTimeout(t);
  }, [results.length]);

  // More rows as the end of the list comes into view.
  useEffect(() => {
    const el = more.current;
    if (!el || shown >= results.length) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && setShown((n) => n + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown, results.length]);

  /** One row of "Checked by OpenRAC" on or off; all four on is the default and leaves the address. */
  const toggleTrustRow = (row: Trust[]) => {
    const next = new Set(trustOn);
    const on = row.every((t) => next.has(t));
    row.forEach((t) => (on ? next.delete(t) : next.add(t)));
    setParams({ checked: null, trust: next.size === TRUSTS.length ? null : [...next].join(",") || "none" });
  };
  const toggleDisc = (d: string) => {
    const next = new Set(discOn);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setParam("disc", [...next].join(",") || null);
  };
  const pick = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const filtered = !!cat || !!discOn.size || trustOn.size < TRUSTS.length || !!query;
  const clearAll = () => {
    setQ("");
    setParams({ q: null, cat: null, trust: null, checked: null, disc: null });
  };
  const share = async () => {
    const byId = new Map(mods.map((m) => [m.id, m]));
    const m = picked.flatMap((id) => (byId.get(id) ? [`${id}@${byId.get(id)!.version}`] : [])).join(",");
    const url = `${location.origin}/mods/set?m=${m}&g=${game}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      router.push(url.slice(location.origin.length));
    }
  };

  // This week's picks for the game; without any, the busiest checked mods.
  const byId = useMemo(() => new Map(mods.map((m) => [m.id, m])), [mods]);
  const weekly = (picks[game] ?? []).flatMap((id) => byId.get(id) ?? []);
  const top = (weekly.length ? weekly : sortMods(inGame.filter((m) => m.trust && m.trust !== "unchecked" && m.works === "release"), "trending", now)).slice(0, 3);

  const side = (
    <>
      <SideGroup title="Category">
        <button type="button" aria-pressed={!cat} onClick={() => setParam("cat", null)} className={sideItem(!cat)}>
          All
          <Count n={countBy((m) => passTrust(m) && passDisc(m))} />
        </button>
        {tags.map(([t, n]) => (
          <button key={t} type="button" aria-pressed={cat === t} onClick={() => setParam("cat", cat === t ? null : t)} className={sideItem(cat === t)}>
            <span className="first-letter:uppercase">{t === "qol" ? "Quality of life" : t === "ui" ? "Interface" : t}</span>
            <Count n={n} />
          </button>
        ))}
        {countBy((m) => m.type === "pack") > 0 && (
          <button type="button" aria-pressed={cat === "packs"} onClick={() => setParam("cat", cat === "packs" ? null : "packs")} className={sideItem(cat === "packs")}>
            Modpacks
            <Count n={countBy((m) => m.type === "pack" && passTrust(m) && passDisc(m))} />
          </button>
        )}
      </SideGroup>

      {labelled && (
        <SideGroup
          title="Checked by OpenRAC"
          aside={
            <button type="button" onClick={() => setIntro(true)} aria-label="What the labels mean" className="grid size-5 place-items-center rounded-full bg-raised text-[11px] font-bold text-soft hover:text-hi">
              ?
            </button>
          }
        >
          {TRUST_ROWS.map((r) => (
            <CheckRow
              key={r.label}
              on={r.trusts.every((t) => trustOn.has(t))}
              toggle={() => toggleTrustRow(r.trusts)}
              label={r.label}
              n={countBy((m) => !!m.trust && r.trusts.includes(m.trust) && passCat(m) && passDisc(m))}
              extra={r.risk ? <span aria-hidden className="size-1.5 flex-none rounded-full bg-coral" /> : undefined}
            />
          ))}
        </SideGroup>
      )}

      {discs.length > 1 && (
        <SideGroup title="Disc">
          {discs.map((d) => (
            <CheckRow key={d} on={discOn.has(d)} toggle={() => toggleDisc(d)} label={DISC_LABEL[d] ?? d} n={countBy((m) => m.games[game]?.includes(d) && passCat(m) && passTrust(m))} />
          ))}
        </SideGroup>
      )}

      {inGame.some((m) => m.works !== "release") && (
        <SideGroup title="Launcher">
          <CheckRow on={dev} toggle={() => setParam("dev", dev ? null : "1")} label="Dev build mods too" n={inGame.filter((m) => m.works !== "release").length} />
        </SideGroup>
      )}
    </>
  );

  const searchField = (
    <>
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search mods</span>
        <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 fill-none stroke-dim stroke-2">
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
          placeholder={`Search ${base.length} ${gameName} mods: name, author, what it does`}
          className="field h-11 pl-10 pr-12"
        />
        <kbd aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded bg-raised px-1.5 text-[12px] text-dim [@media(hover:hover)]:block">
          /
        </kbd>
      </label>
      <a href="#publish" className="btn flex-none max-sm:hidden">
        Publish your mod
      </a>
    </>
  );

  const suggestion = !results.length && query.trim() ? closest(mods, query) : undefined;

  return (
    <ModsShell side={side} top={searchField} menuLabel={<span>Filters <span className="font-normal text-dim">· {results.length} mods</span></span>}>
      <main id="content">
        {games.length > 0 && (
          // Tabs as in the docs: plain names on one line, the open game underlined in amber.
          <div className="mb-7 overflow-x-auto border-b border-line [scrollbar-width:none]">
            <div role="radiogroup" aria-label="Game" className="flex gap-7">
              {games.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={game === g.id}
                  onClick={() => setParams({ game: g.id === games[0].id ? null : g.id, disc: null, cat: null })}
                  className={`game-tab relative flex min-h-11 flex-none items-center gap-2 whitespace-nowrap text-[15px] font-medium transition-colors ${game === g.id ? "text-hi" : "text-dim hover:text-soft"}`}
                >
                  {GAME_LABEL[g.id] ?? g.id}
                  <span className={`text-[13px] font-normal tabular-nums ${game === g.id ? "text-amber" : "text-dim"}`}>{g.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <header key={game} className="m-in mb-8">
          <h1 className="text-balance text-[28px] font-semibold leading-[1.12] tracking-tight text-hi sm:text-[32px]">{gameName} mods</h1>
          <p className="mt-2 max-w-[720px] text-[15.5px] leading-relaxed text-soft">Made by the community. Each mod shows how much OpenRAC checked it.</p>
        </header>
        {notice}

        {top.length > 0 && !query && (
          <section aria-labelledby="this-week" className="mb-9">
            <h2 id="this-week" className="mb-3 flex flex-wrap items-baseline gap-x-3 text-[18px] font-semibold text-hi">
              This week <small className="text-[14px] font-normal text-dim">picked from OpenRAC, verified and trusted mods</small>
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              {top.map((m, i) => (
                <div key={`${game}-${m.id}`} className="m-in" style={{ "--i": i + 1 } as CSSProperties}>
                  <Pick mod={m} now={now} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="all-mods">
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 id="all-mods" className="text-[18px] font-semibold text-hi">
              <span role="status" aria-live="polite" aria-atomic="true">
                {announce || `${results.length} mods`}
              </span>
            </h2>
            {filtered && (
              <button type="button" onClick={clearAll} className="text-[14px] text-amber underline-offset-2 hover:underline">
                Clear filters
              </button>
            )}
            <label className="ml-auto flex items-center gap-2 text-[14px] text-dim">
              <span>Sort</span>
              <select value={sort} onChange={(e) => setParam("sort", e.target.value === "trending" ? null : e.target.value)} className="field h-10 py-0">
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div id="results" tabIndex={-1}>
            {results.length === 0 ? (
              <div className="d-card grid justify-items-center gap-3 px-6 py-12 text-center">
                <p className="text-[18px] font-semibold text-hi">{inGame.length ? "No mods match" : `No ${gameName} mods yet`}</p>
                <p className="max-w-[460px] text-dim">
                  {suggestion ? (
                    <>
                      Did you mean{" "}
                      <button type="button" className="text-amber underline" onClick={() => setQ(suggestion.name)}>
                        {suggestion.name}
                      </button>
                      ?
                    </>
                  ) : inGame.length ? (
                    "Try fewer filters or another word."
                  ) : (
                    "Be the first to publish one."
                  )}
                </p>
                {filtered && (
                  <button type="button" className="btn" onClick={clearAll}>
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div aria-hidden className="grid grid-cols-[18px_88px_minmax(0,1fr)_150px_150px_76px_104px] gap-x-4 border-b border-line px-3 pb-2 text-[13px] text-dim max-xl:hidden">
                  <span />
                  <span />
                  <span>Mod</span>
                  <span>Label</span>
                  <span>Kind</span>
                  <span className="text-right">Downloads</span>
                  <span />
                </div>
                {/* A new filter or sort deals the rows in again, one after another; typing in the search does not. */}
                <ul key={[game, cat, sort, dev, [...trustOn].join(), [...discOn].join()].join("|")} aria-label={`${gameName} mods`}>
                  {results.slice(0, shown).map((m, i) => (
                    <ModRow key={m.id} i={i % PAGE} mod={m} now={now} query={query} picked={picked.includes(m.id)} onPick={() => pick(m.id)} />
                  ))}
                </ul>
              </>
            )}
            {shown < results.length && (
              <div ref={more} className="mt-6 flex justify-center">
                <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE)}>
                  Show more
                </button>
              </div>
            )}
          </div>
        </section>

        {children}
      </main>

      {/* The picked mods: a bar at the bottom of the screen, in reach of a thumb. */}
      {picked.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="m-bar pointer-events-auto flex items-center gap-2 rounded-xl bg-coal p-2 pl-4 shadow-[0_12px_40px_rgb(0_0_0/0.6)] ring-1 ring-white/10">
            <p className="mr-2 text-[15px] text-soft">
              <b key={picked.length} className="m-pop inline-block font-semibold text-amber">{picked.length}</b>
              <span className="max-sm:hidden"> mod{picked.length === 1 ? "" : "s"}</span> picked
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setReview(true)}>
              <span>
                Install<span className="max-sm:hidden"> together</span>
              </span>
            </button>
            <button type="button" className="btn btn-sm" onClick={share}>
              <span>
                {copied ? "Copied" : "Share"}
                <span className="max-sm:hidden">{copied ? "" : " link"}</span>
              </span>
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setPicked([])}>
              Clear
            </button>
          </div>
        </div>
      )}

      {labelled && <ModsIntro reopen={intro} onClose={() => setIntro(false)} onCheckedOnly={() => setParams({ checked: null, trust: CHECKED.join(",") })} />}
      {review && (
        <Boundary what="install review">
          <ChangeSetDialog mods={mods} picked={picked} open={review} onClose={() => setReview(false)} onDone={() => {}} />
        </Boundary>
      )}
    </ModsShell>
  );
}
