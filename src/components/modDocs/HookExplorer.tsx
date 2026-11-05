"use client";

import { useEffect, useMemo, useState } from "react";
import { HOOK_IDEAS, HOOK_MODES, HOOK_TOPICS, type HookMode, hookParams, hookStubC, hookStubCpp, hookStubLuau, hookTopic, plainAbout } from "@/lib/modDocs/logic";
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
 * The game's hook points for someone who has never seen them: ideas to start from, the hook
 * points by what part of the game they touch, a search, and for the one picked what it does and a
 * whole mod that takes it (wrap, before, after or replace; Luau, C or C++), made from its signature.
 */
export default function HookExplorer({ hooks, game, discs, manifestHref, scripts }: { hooks: Hook[]; game: string; discs: string[]; manifestHref: string; scripts: boolean }) {
  const key = (h: Hook) => h.id || h.name;
  const ideas = HOOK_IDEAS.filter((i) => hooks.some((h) => h.id === i.id && !h.experimental));
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string>("all");
  const [selected, setSelected] = useState<string>(() => key(hooks.find((h) => h.id === ideas[0]?.id) ?? hooks.find((h) => !h.experimental) ?? hooks[0]));
  const [mode, setMode] = useState<HookMode>("wrap");
  const [lang, setLang] = useState<Lang>(scripts ? "luau" : "c");
  const [modId, setModId] = useState("my-mod");
  const [shown, setShown] = useState(PAGE);

  const topics = useMemo(() => {
    const count = new Map<string, number>();
    for (const h of hooks) count.set(hookTopic(h), (count.get(hookTopic(h)) ?? 0) + 1);
    const known = HOOK_TOPICS.filter((t) => count.has(t.topic)).map((t) => ({ ...t, n: count.get(t.topic)! }));
    if (count.has("other")) known.push({ topic: "other", label: "Other", what: "", parts: [], n: count.get("other")! });
    if (count.has("experimental")) known.push({ topic: "experimental", label: "Experimental", what: "every moby's update, from the behaviour catalogue", parts: [], n: count.get("experimental")! });
    return known;
  }, [hooks]);

  const pick = (x: Hook, scroll = true) => {
    setSelected(key(x));
    history.replaceState(null, "", `#${key(x)}`);
    if (scroll && window.matchMedia("(max-width: 1023px)").matches) document.getElementById("hook-detail")?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  // A link to a hook point (#rac1.player.take_damage, from the search or another page) picks it.
  useEffect(() => {
    const fromHash = () => {
      const want = decodeURIComponent(location.hash.slice(1));
      const h = hooks.find((x) => key(x) === want || x.name === want || x.aliases.includes(want));
      if (!h) return;
      setSelected(key(h));
      setTopic(hookTopic(h));
      document.getElementById("hook-detail")?.scrollIntoView({ block: "start" });
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [hooks]);

  const list = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    // A search looks everywhere; without one, the topic picked (stable hook points for "all").
    return hooks
      .filter((h) => (words.length ? true : topic === "all" ? !h.experimental : hookTopic(h) === topic))
      .filter((h) => {
        const text = `${h.id} ${h.name} ${h.aliases.join(" ")} ${h.about} ${h.classes.join(" ")}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .sort((a, b) => Number(a.experimental) - Number(b.experimental));
  }, [hooks, query, topic]);

  const h = hooks.find((x) => key(x) === selected) ?? hooks[0];
  const id = ID.test(modId) ? modId : "my-mod";
  const code = lang === "luau" ? hookStubLuau(h, mode) : lang === "cpp" ? hookStubCpp(h, game, id, mode) : hookStubC(h, game, id, mode);
  const why =
    lang === "luau" && !scripts ? "Script mods came with SDK 1.1. Pick a newer version to see the Luau code." : lang === "luau" ? "This hook point has no id, so a script cannot name it." : lang === "cpp" ? "The C++ header of this release has no type for this hook point. Use the C code, or a newer SDK." : "";
  const params = hookParams(h);
  const ret = h.signature.split("(")[0];
  const sig = `${ret} ${key(h).split(".").pop()}(${params.map((p) => `${p.type} ${p.name}`).join(", ")})`;
  const shownDiscs = (discs.length ? discs.filter((d) => d in h.symbols) : Object.keys(h.symbols)).map((d) => d.toUpperCase());
  const also = [h.id ? h.name : "", ...h.aliases].filter(Boolean);

  return (
    <div className="grid gap-6">
      {ideas.length > 0 && (
        <div className="grid gap-2">
          <p className="text-[13px] font-semibold text-hi">Not sure where to start? Try one of these</p>
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((i) => {
              const x = hooks.find((y) => y.id === i.id)!;
              return (
                <li key={i.id}>
                  <button type="button" onClick={() => { setQuery(""); setTopic(hookTopic(x)); pick(x); }} aria-pressed={key(x) === key(h)} className={`flex min-h-8 w-full items-center gap-2 rounded-md border px-2.5 py-1 text-left text-[13px] transition-colors ${key(x) === key(h) ? "border-amber/45 text-amber" : "border-white/12 text-soft hover:border-white/25 hover:text-hi"}`}>
                    <span aria-hidden className="text-dim">→</span>
                    {i.idea}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="grid content-start gap-2.5">
          <input type="search" className="d-field" placeholder="Search hook points" aria-label="Search hook points" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} />
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Part of the game">
            {[{ topic: "all", label: "All", n: hooks.filter((x) => !x.experimental).length, what: "every stable hook point" }, ...topics].map((t) => (
              <button
                key={t.topic}
                type="button"
                role="radio"
                aria-checked={!query && topic === t.topic}
                title={t.what}
                onClick={() => { setQuery(""); setTopic(t.topic); setShown(PAGE); }}
                className={`h-7 rounded-md px-2 text-[12.5px] transition-colors ${!query && topic === t.topic ? "bg-white/10 text-hi" : "text-soft hover:bg-white/5 hover:text-hi"}`}
              >
                {t.label} <span className={!query && topic === t.topic ? "text-soft" : "text-dim"}>{t.n}</span>
              </button>
            ))}
          </div>
          <p className="text-[12.5px] text-dim" aria-live="polite">
            {query ? `${list.length} found` : topics.find((t) => t.topic === topic)?.what || (topic === "all" ? "The stable hook points. Pick a part of the game, or search." : "")}
          </p>
          <ul className="d-card max-h-[460px] overflow-y-auto p-1 [scrollbar-width:thin]">
            {list.slice(0, shown).map((x) => (
              <li key={key(x)}>
                <button
                  type="button"
                  onClick={() => pick(x)}
                  aria-pressed={key(x) === key(h)}
                  className={`block w-full rounded-md px-2.5 py-1.5 text-left transition-colors ${key(x) === key(h) ? "bg-white/8" : "hover:bg-white/5"}`}
                >
                  <span className={`line-clamp-2 block text-[13.5px] leading-snug ${key(x) === key(h) ? "text-hi" : "text-body"}`}>{shortAbout(x) || key(x)}</span>
                  <span className={`block truncate font-mono text-[11.5px] ${key(x) === key(h) ? "text-soft" : "text-dim"}`}>{key(x)}</span>
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
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 font-mono text-[16px] font-semibold text-gold [overflow-wrap:anywhere]">{key(h)}</h3>
              {h.experimental && <span className="badge border-brand/50 text-brand">Experimental</span>}
            </div>
            {h.about && <p className="text-[15px] leading-relaxed text-body">{plainAbout(h)}</p>}
            <div tabIndex={0} aria-label="Signature" className="overflow-x-auto rounded-md border border-line bg-ink-deep px-3 py-2 [scrollbar-width:thin]">
              <code className="whitespace-pre font-mono text-[13px] text-hi">{sig}</code>
            </div>
            <p className="text-[12.5px] text-dim">
              {[also.length ? `Also named ${also.join(", ")}` : "", shownDiscs.length ? `Discs: ${shownDiscs.join(", ")}` : "", h.classes.length ? `Moby classes: ${h.classes.join(", ")}` : ""].filter(Boolean).join(" · ")}
            </p>
            {h.experimental && <p className="text-[13px] text-soft">From the behaviour catalogue: its id stays, its name and fields may change. Check the moby&apos;s class in your hook when several classes share it.</p>}
          </div>

          <div className="d-card grid gap-3 p-4">
            <p className="text-[13px] font-semibold text-hi">Start a mod with it</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="d-seg" role="radiogroup" aria-label="How to use the hook point">
                {HOOK_MODES.map((m) => (
                  <button key={m.mode} type="button" role="radio" aria-checked={mode === m.mode} onClick={() => setMode(m.mode)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="d-seg" role="radiogroup" aria-label="Language">
                {LANGS.map((l) => (
                  <button key={l.lang} type="button" role="radio" aria-checked={lang === l.lang} onClick={() => setLang(l.lang)}>
                    {l.label}
                  </button>
                ))}
              </div>
              {lang !== "luau" && (
                <label className="flex items-center gap-2 text-[13px] text-soft">
                  Mod id
                  <input className="d-field h-[30px] w-[140px] font-mono text-[13px]" value={modId} onChange={(e) => setModId(e.target.value)} spellCheck={false} aria-invalid={!ID.test(modId)} />
                </label>
              )}
            </div>
            <p className="text-[13.5px] text-soft">{HOOK_MODES.find((m) => m.mode === mode)!.what}</p>
            {lang !== "luau" && !ID.test(modId) && <p className="text-[13px] text-brand">A mod id is lower-case letters and digits, joined by single hyphens. The code uses “my-mod” until then.</p>}
            {code ? <Code code={code} lang={lang} title={lang === "luau" ? "main.luau" : lang === "cpp" ? "src/mod.cpp" : "src/mod.c"} className="my-0" /> : <p className="rounded-lg border border-line p-3 text-[14px] text-soft">{why}</p>}
            <p className="text-[13.5px] text-soft">
              Name it in your manifest too: <code className="text-gold">&quot;hooks&quot;: [&quot;{key(h)}&quot;]</code>.{" "}
              <a className="text-amber underline" href={`${manifestHref}?hooks=${encodeURIComponent(key(h))}&type=${lang === "luau" ? "script" : "native"}`}>
                Open it in the manifest builder
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The first sentence of a hook point's description, without the game's function name. */
function shortAbout(h: Hook): string {
  const t = plainAbout(h);
  const m = t.match(/^(.{20,}?[.:;])(\s|$)/);
  return (m ? m[1] : t).replace(/[:;]$/, "");
}
