"use client";

import { useEffect, useMemo, useState } from "react";
import { HOOK_MODES, type HookMode, hookParams, hookStubC, hookStubCpp, hookStubLuau } from "@/lib/modDocs/logic";
import type { Hook } from "@/lib/modDocs/types";
import Code from "./Code";

type Lang = "luau" | "c" | "cpp";
const LANGS: { lang: Lang; label: string }[] = [
  { lang: "luau", label: "Luau script" },
  { lang: "c", label: "C" },
  { lang: "cpp", label: "C++" },
];
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PAGE = 40;

/**
 * Every hook point of a game, searchable, and for the one picked: what it is, its parameters, and a
 * whole mod that takes it, written for the way (wrap, before, after, replace) and the language
 * picked. The code is made from the hook point's own signature, so it is what the SDK expects.
 */
export default function HookExplorer({ hooks, game, discs, manifestHref, scripts }: { hooks: Hook[]; game: string; discs: string[]; manifestHref: string; scripts: boolean }) {
  const key = (h: Hook) => h.id || h.name;
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<"stable" | "all" | "experimental">("stable");
  const [selected, setSelected] = useState<string>(() => key(hooks.find((h) => !h.experimental && h.id === `${game}.player.turn_to_heading`) ?? hooks[0]));
  const [mode, setMode] = useState<HookMode>("wrap");
  const [lang, setLang] = useState<Lang>(scripts ? "luau" : "c");
  const [modId, setModId] = useState("my-mod");
  const [shown, setShown] = useState(PAGE);

  // A link to a hook point (#rac1.player.take_damage, from the search or another page) picks it.
  useEffect(() => {
    const pick = () => {
      const want = decodeURIComponent(location.hash.slice(1));
      const h = hooks.find((x) => key(x) === want || x.name === want || x.aliases.includes(want));
      if (!h) return;
      setSelected(key(h));
      if (h.experimental) setShow((s) => (s === "stable" ? "all" : s));
      document.getElementById("hook-detail")?.scrollIntoView({ block: "start" });
    };
    pick();
    window.addEventListener("hashchange", pick);
    return () => window.removeEventListener("hashchange", pick);
  }, [hooks]);

  const list = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return hooks.filter((h) => {
      if (show === "stable" && h.experimental) return false;
      if (show === "experimental" && !h.experimental) return false;
      const text = `${h.id} ${h.name} ${h.aliases.join(" ")} ${h.about} ${h.classes.join(" ")}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [hooks, query, show]);

  const h = hooks.find((x) => key(x) === selected) ?? hooks[0];
  const id = ID.test(modId) ? modId : "my-mod";
  const code = lang === "luau" ? hookStubLuau(h, mode) : lang === "cpp" ? hookStubCpp(h, game, id, mode) : hookStubC(h, game, id, mode);
  const why =
    lang === "luau" && !scripts ? "Script mods came with SDK 1.1. Pick a newer version to see the Luau code." : lang === "luau" ? "This hook point has no id, so a script cannot name it." : lang === "cpp" ? "The C++ header of this release has no type for this hook point. Use the C code, or a newer SDK." : "";
  const params = hookParams(h);
  const stableCount = hooks.filter((x) => !x.experimental).length;

  const pick = (x: Hook) => {
    setSelected(key(x));
    history.replaceState(null, "", `#${key(x)}`);
    if (window.matchMedia("(max-width: 1023px)").matches) document.getElementById("hook-detail")?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="grid content-start gap-3">
        <input type="search" className="d-field" placeholder="Search hook points" aria-label="Search hook points" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} />
        <div className="d-seg self-start" role="radiogroup" aria-label="Which hook points">
          {([["stable", `Stable (${stableCount})`], ["all", `All (${hooks.length})`], ["experimental", "Experimental"]] as const).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={show === v} onClick={() => { setShow(v); setShown(PAGE); }}>
              {label}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-dim" aria-live="polite">
          {list.length} hook point{list.length === 1 ? "" : "s"}
        </p>
        <ul className="d-card max-h-[520px] overflow-y-auto p-1.5 [scrollbar-width:thin]">
          {list.slice(0, shown).map((x) => (
            <li key={key(x)}>
              <button
                type="button"
                onClick={() => pick(x)}
                aria-pressed={key(x) === key(h)}
                className={`block w-full rounded-lg px-3 py-2 text-left transition-colors ${key(x) === key(h) ? "bg-amber/12" : "hover:bg-white/5"}`}
              >
                <span className={`block truncate font-mono text-[13px] ${key(x) === key(h) ? "text-amber" : "text-gold"}`}>{key(x)}</span>
                <span className={`block truncate text-[12px] ${key(x) === key(h) ? "text-soft" : "text-dim"}`}>
                  {x.signature}
                  {x.about ? ` · ${x.about}` : ""}
                </span>
              </button>
            </li>
          ))}
          {list.length > shown && (
            <li>
              <button type="button" className="d-btn mt-1 w-full" onClick={() => setShown((s) => s + PAGE * 2)}>
                Show more ({list.length - shown} left)
              </button>
            </li>
          )}
          {!list.length && <li className="p-3 text-[14px] text-dim">No hook point matches.</li>}
        </ul>
      </div>

      <div id="hook-detail" className="grid min-w-0 scroll-mt-20 content-start gap-4">
        <div className="d-card grid gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 font-mono text-[18px] font-semibold text-gold [overflow-wrap:anywhere]">{key(h)}</h3>
            {h.experimental && <span className="badge border-brand/50 text-brand">Experimental</span>}
          </div>
          {h.about && <p className="text-[15px] leading-relaxed text-body">{h.about}</p>}
          <dl className="grid gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-[max-content_1fr]">
            {h.id && (
              <>
                <dt className="text-dim">Alias</dt>
                <dd className="font-mono text-hi [overflow-wrap:anywhere]">{[h.name, ...h.aliases].join(", ")}</dd>
              </>
            )}
            <dt className="text-dim">Signature</dt>
            <dd className="font-mono text-hi">{h.signature}</dd>
            <dt className="text-dim">Parameters</dt>
            <dd className="text-hi">
              {params.length ? (
                params.map((p, i) => (
                  <span key={p.name}>
                    {i > 0 && ", "}
                    <code className="text-gold">{p.name}</code> <span className="text-dim">{p.type}</span>
                  </span>
                ))
              ) : (
                <span className="text-dim">none</span>
              )}
            </dd>
            {Object.keys(h.symbols).length > 0 && (
              <>
                <dt className="text-dim">Discs</dt>
                <dd className="text-hi">{(discs.length ? discs.filter((d) => d in h.symbols) : Object.keys(h.symbols)).map((d) => d.toUpperCase()).join(", ")}</dd>
              </>
            )}
            {h.classes.length > 0 && (
              <>
                <dt className="text-dim">Moby classes</dt>
                <dd className="text-hi">{h.classes.join(", ")}</dd>
              </>
            )}
          </dl>
          {h.experimental && <p className="text-[13.5px] text-soft">Experimental: this hook point comes from the behaviour catalogue, which names the game&apos;s internals. Its id stays; its name and fields may change. Check the moby&apos;s class in your hook when several classes share it.</p>}
        </div>

        <div className="d-card grid gap-3 p-4">
          <p className="text-[12.5px] font-semibold text-hi">Start a mod with this hook point</p>
          <div className="grid gap-2">
            <span className="text-[13px] font-semibold text-soft">1. How do you want to use it?</span>
            <div className="d-seg flex-wrap self-start" role="radiogroup" aria-label="How to use the hook point">
              {HOOK_MODES.map((m) => (
                <button key={m.mode} type="button" role="radio" aria-checked={mode === m.mode} onClick={() => setMode(m.mode)}>
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[14px] text-body">{HOOK_MODES.find((m) => m.mode === mode)!.what}</p>
          </div>
          <div className="grid gap-2">
            <span className="text-[13px] font-semibold text-soft">2. Which language?</span>
            <div className="d-seg self-start" role="radiogroup" aria-label="Language">
              {LANGS.map((l) => (
                <button key={l.lang} type="button" role="radio" aria-checked={lang === l.lang} onClick={() => setLang(l.lang)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          {lang !== "luau" && (
            <label className="grid max-w-[320px] gap-1.5">
              <span className="text-[13px] font-semibold text-soft">3. Your mod&apos;s id</span>
              <input className="d-field font-mono" value={modId} onChange={(e) => setModId(e.target.value)} spellCheck={false} aria-invalid={!ID.test(modId)} />
              {!ID.test(modId) && <span className="text-[13px] text-brand">Lower-case letters and digits, joined by single hyphens. The code uses “my-mod” until then.</span>}
            </label>
          )}
          {code ? <Code code={code} lang={lang} title={lang === "luau" ? "main.luau" : lang === "cpp" ? "src/mod.cpp" : "src/mod.c"} className="my-0" /> : <p className="rounded-lg border border-line p-3 text-[14px] text-soft">{why}</p>}
          <p className="text-[14px] text-body">
            List it in your manifest too, so the launcher can show which mods share it:{" "}
            <code className="text-gold">&quot;hooks&quot;: [&quot;{key(h)}&quot;]</code>.{" "}
            <a className="font-semibold text-amber underline" href={`${manifestHref}?hooks=${encodeURIComponent(key(h))}&type=${lang === "luau" ? "script" : "native"}`}>
              Open it in the manifest builder
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
