"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { type Entry, find } from "@/lib/modDocs/search";

/**
 * Search over a release's docs: pages, headings, every C, C++ and Luau name and every hook point.
 * Opens with the button, "/" or Ctrl+K (Cmd+K); arrows and Enter pick. The list is fetched once, on
 * first open (/mods/docs/search/<version>).
 */
export default function Search({ version, label = "Search the docs" }: { version: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();

  const show = useCallback(() => {
    setOpen(true);
    dialog.current?.showModal();
    setTimeout(() => input.current?.focus(), 0);
  }, []);
  const hide = useCallback(() => {
    dialog.current?.close();
    setOpen(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  useEffect(() => {
    if (!open || entries) return;
    fetch(`/mods/docs/search/${version}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((e: Entry[]) => setEntries(e))
      .catch(() => setFailed(true));
  }, [open, entries, version]);

  const results = entries ? find(entries, query) : [];
  const go = (e: Entry | undefined) => {
    if (!e) return;
    hide();
    router.push(e.h);
  };

  return (
    <>
      <button type="button" onClick={show} className="field flex items-center gap-2 text-left text-[15px] text-dim">
        <svg viewBox="0 0 16 16" aria-hidden className="size-4 flex-none fill-none stroke-current stroke-2">
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3.5 3.5" strokeLinecap="round" />
        </svg>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <kbd className="hidden rounded border border-white/15 px-1.5 text-[11px] text-dim sm:inline">/</kbd>
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialog.current && hide()}
        aria-label="Search the docs"
        className="m-0 mx-auto mt-[8vh] w-[min(640px,calc(100vw-32px))] rounded-2xl border border-line bg-ink p-0 text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="border-b border-line p-3">
          <input
            ref={input}
            type="search"
            className="field"
            placeholder="hook, setting_int, on_pad, rac1.player..."
            value={query}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={results[at] ? `${listId}-${at}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setAt(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setAt((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setAt((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[at]);
              }
            }}
          />
        </div>
        <ul id={listId} role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {failed && <li className="p-3 text-[14px] text-soft">The search list could not be loaded. Try again in a moment.</li>}
          {!failed && !entries && open && <li className="p-3 text-[14px] text-dim">Loading…</li>}
          {entries && query && !results.length && <li className="p-3 text-[14px] text-dim">Nothing found for “{query}”.</li>}
          {entries && !query && <li className="p-3 text-[14px] text-dim">Type a name or a few words. Arrows move, Enter opens, Esc closes.</li>}
          {results.map((e, i) => (
            <li key={`${e.h}-${i}`} id={`${listId}-${i}`} role="option" aria-selected={i === at}>
              <a
                href={e.h}
                onClick={(ev) => {
                  ev.preventDefault();
                  go(e);
                }}
                onMouseMove={() => setAt(i)}
                className={`block rounded-xl px-3 py-2 no-underline ${i === at ? "bg-amber/12 text-hi" : "text-body"}`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-mono text-[14px] text-gold">{e.t}</span>
                  <span className="flex-none text-[11px] font-semibold uppercase tracking-wider text-dim">{e.k}</span>
                </span>
                {e.d && <span className="mt-0.5 block truncate text-[13px] text-soft">{e.d}</span>}
              </a>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
