"use client";

import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";

import { find, prepare, type Entry } from "@/lib/search";
import { PLACES } from "@/lib/searchIndex.places";

/** Until the full list is in (or if it cannot be fetched), the site's own places answer. */
const FIRST = prepare(PLACES);

/**
 * Search over the whole site (see lib/searchIndex): pages, projects, mods, the SDK docs and the news. Opens with the button, "/"
 * or Ctrl+K (Cmd+K); arrows and Enter pick. `compact` draws the button as a bare mark (the phone bar).
 */
export default function SiteSearch({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const list = useMemo(() => (entries ? prepare(entries) : FIRST), [entries]);
  const loaded = useRef(false);
  const [at, setAt] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();

  const show = useCallback(() => {
    // The list is fetched once, on first open.
    if (!loaded.current) {
      loaded.current = true;
      fetch("/search.json")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j: Entry[]) => Array.isArray(j) && setEntries(j))
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


  // Scoring a few thousand entries can take a moment on a slow phone: typing stays smooth, the list follows.
  const typed = useDeferredValue(query);
  const results = useMemo(() => find(list, typed), [list, typed]);
  const go = (e: Entry | undefined) => {
    if (!e) return;
    hide();
    router.push(e.h);
  };

  return (
    <>
      <button type="button" onClick={show} aria-label={compact ? "Search" : undefined} title="Search (/)" className={className}>
        <svg viewBox="0 0 16 16" aria-hidden className={`${compact ? "size-5" : "size-[15px]"} flex-none fill-none stroke-current stroke-2`}>
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3.5 3.5" strokeLinecap="round" />
        </svg>
        {!compact && <span className="min-w-0 flex-1 truncate text-left">Search the site</span>}
        {!compact && <kbd className="rounded bg-navy px-1 font-sans text-[11px] leading-4 opacity-75">/</kbd>}
      </button>
      <dialog
        ref={dialog}
        onClick={(e) => e.target === dialog.current && hide()}
        aria-label="Search the site"
        className="m-0 mx-auto mt-[8vh] w-[min(560px,calc(100vw-32px))] rounded-xl bg-coal p-0 text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="border-b border-line p-3">
          <input
            ref={input}
            type="search"
            className="d-field"
            placeholder="A game, a mod, a hook, a news item..."
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
