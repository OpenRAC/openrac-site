"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/** t: what is shown; k: what kind of thing it is; h: where it goes; d: a line about it. */
type Entry = { t: string; k: string; h: string; d?: string };

/** The site's own places, always there; the mods are added from /mods.json on first open. */
const PLACES: Entry[] = [
  { t: "Download", k: "Page", h: "/#download", d: "Get the OpenRAC launcher." },
  { t: "Progress", k: "Section", h: "/#progress", d: "How much of each game compiles to the retail bytes." },
  { t: "Contribute", k: "Section", h: "/#contribute", d: "Ways to help the decompilation projects." },
  { t: "How it works", k: "Section", h: "/#how", d: "What a matching decompilation is." },
  { t: "FAQ", k: "Section", h: "/#faq", d: "Common questions." },
  { t: "AI", k: "Section", h: "/#ai", d: "How the projects use AI." },
  { t: "News", k: "Page", h: "/news", d: "Weekly reports from every project." },
  { t: "Mods", k: "Page", h: "/mods", d: "Community mods for the OpenRAC ports." },
  { t: "Make mods (SDK docs)", k: "Page", h: "/mods/docs", d: "Guides and reference for the mod SDK." },
];

/** Every word must be found; a word at the start of the title counts most, one in the line least. */
function find(entries: Entry[], query: string): Entry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: [Entry, number][] = [];
  for (const e of entries) {
    const t = e.t.toLowerCase(), d = (e.d ?? "").toLowerCase();
    let s = 0;
    for (const w of words) {
      const hit = t.startsWith(w) ? 3 : t.includes(w) ? 2 : d.includes(w) ? 1 : 0;
      if (!hit) { s = 0; break; }
      s += hit;
    }
    if (s) scored.push([e, s]);
  }
  return scored.sort((a, b) => b[1] - a[1]).slice(0, 20).map(([e]) => e);
}

/**
 * Search over the site: its sections and pages, and every mod by name. Opens with the button, "/"
 * or Ctrl+K (Cmd+K); arrows and Enter pick. `compact` draws the button as a bare mark (the phone bar).
 */
export default function SiteSearch({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<Entry[]>(PLACES);
  const loaded = useRef(false);
  const [at, setAt] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();

  const show = useCallback(() => {
    // The mods are fetched once, on first open; until then (or if it fails) the site's own places answer.
    if (!loaded.current) {
      loaded.current = true;
      fetch("/mods.json")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j: { mods?: { id: string; name: string; description?: string }[] }) =>
          setEntries([...PLACES, ...(j.mods ?? []).map((m) => ({ t: m.name, k: "Mod", h: `/mods/${m.id}`, d: m.description }))]),
        )
        .catch(() => {});
    }
    dialog.current?.showModal();
    setTimeout(() => input.current?.focus(), 0);
  }, []);
  const hide = useCallback(() => {
    dialog.current?.close();
  }, []);

  // Only the wide bar's search listens for the keys, so the phone's copy does not open a second dialog.
  useEffect(() => {
    if (compact) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, compact]);


  const results = find(entries, query);
  const go = (e: Entry | undefined) => {
    if (!e) return;
    hide();
    router.push(e.h);
  };

  return (
    <>
      <button type="button" onClick={show} aria-label="Search" title="Search (/)" className={className}>
        <svg viewBox="0 0 16 16" aria-hidden className={`${compact ? "size-5" : "size-[15px]"} flex-none fill-none stroke-current stroke-2`}>
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3.5 3.5" strokeLinecap="round" />
        </svg>
        {!compact && <span className="min-w-0 flex-1 truncate text-left max-[1279px]:hidden">Search</span>}
        {!compact && <kbd className="rounded border max-[1279px]:hidden border-current/35 px-1 font-sans text-[11px] leading-4 opacity-75">/</kbd>}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && hide()}
        aria-label="Search the site"
        className="m-0 mx-auto mt-[8vh] w-[min(560px,calc(100vw-32px))] rounded-lg border border-line bg-ink p-0 text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="border-b border-line p-3">
          <input
            ref={input}
            type="search"
            className="d-field"
            placeholder="Progress, news, a mod's name..."
            value={query}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results[at] ? `${listId}-${at}` : undefined}
            onChange={(e) => { setQuery(e.target.value); setAt(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setAt((a) => Math.min(a + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setAt((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); go(results[at]); }
            }}
          />
        </div>
        <ul id={listId} role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {!query && <li className="p-3 text-[14px] text-dim">Type a few letters. Arrows move, Enter opens, Esc closes.</li>}
          {query && !results.length && <li className="p-3 text-[14px] text-dim">Nothing found for “{query}”.</li>}
          {results.map((e, i) => (
            <li key={`${e.h}-${i}`} id={`${listId}-${i}`} role="option" aria-selected={i === at}>
              <a
                href={e.h}
                onClick={(ev) => { ev.preventDefault(); go(e); }}
                onMouseMove={() => setAt(i)}
                className={`block rounded-md px-3 py-2 no-underline ${i === at ? "bg-amber/12 text-hi" : "text-body"}`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[14px] font-semibold text-gold">{e.t}</span>
                  <span className="flex-none text-[12px] text-dim">{e.k}</span>
                </span>
                {e.d && <span className="mt-0.5 line-clamp-1 block text-[13px] leading-snug text-soft">{e.d}</span>}
              </a>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
