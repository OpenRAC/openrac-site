"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { checkManifest, fieldOf, parseManifestJson, PLATFORMS, plain } from "@/lib/modDocs/manifest";
import Code from "./Code";
import CopyButton from "./CopyButton";

type Obj = Record<string, unknown>;
type Setting = Obj & { key: string; name: string; type: string };

const LIB_EXT: Record<string, string> = { macos: "dylib", linux: "so", windows: "dll", android: "so" };

function HelpText({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`)/g).map((p, i) => (p.startsWith("`") && p.length > 1 ? <code key={i} className="text-soft">{p.slice(1, -1)}</code> : p.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")))}</>;
}

/** Where the guide's help for a field stops being a hint: its first clause, if the rest is long. */
function hintEnd(text: string): number {
  let code = false;
  for (let i = 12; i < text.length - 1; i++) {
    if (text[i] === "`") code = !code;
    else if (!code && (text[i] === "." || text[i] === ":" || text[i] === ";") && text[i + 1] === " ") return i + 1;
  }
  return text.length;
}

/** The guide's help under a field: a one-line hint, and the rest when asked for. */
function Help({ text }: { text?: string }) {
  if (!text) return null;
  const end = hintEnd(text);
  const hint = text.slice(0, end).replace(/[:;]$/, ".");
  const rest = text.slice(end).trim();
  if (!rest || text.length < 90) {
    return (
      <span className="text-[13px] leading-snug text-dim">
        <HelpText text={text} />
      </span>
    );
  }
  return (
    <details className="group/h text-[13px] leading-snug text-dim">
      <summary className="cursor-pointer list-none">
        <HelpText text={hint} /> <span className="text-soft underline decoration-dotted underline-offset-2 group-open/h:hidden">More</span>
      </summary>
      <p className="mt-1">
        <HelpText text={rest} />
      </p>
    </details>
  );
}

function Field({ label, help, error, children }: { label: string; help?: string; error?: string[]; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-1">
      <label className="grid gap-1">
        <span className="text-[13px] font-semibold text-hi">{label}</span>
        {children}
      </label>
      <Help text={help} />
      {error?.map((e) => (
        <span key={e} className="text-[13px] text-brand">
          {e}
        </span>
      ))}
    </div>
  );
}

const pretty = (m: unknown) => JSON.stringify(plain(m), null, 2);

function starter(type: "script" | "native", iface: string, discs: string[], game: string): Obj {
  const base: Obj = { format: 2, id: "my-mod", name: "My mod", version: "0.1.0", author: "Your name", description: "What the mod does, in one line." };
  if (type === "script") return { ...base, type: "script", api: iface, scripts: ["main.luau"], games: { [game]: discs } };
  return { ...base, api: iface, games: { [game]: discs }, plugin: { "linux-x86_64": "lib/linux-x86_64/my_mod.so", "windows-x86_64": "lib/windows-x86_64/my_mod.dll" } };
}

/**
 * Builds a mod's openrac-mod.json from a form, or checks one pasted in: both sides edit the same
 * manifest, and every change is checked at once by the SDK's own rules (manifest.ts), with each
 * problem shown beside its field.
 */
export default function ManifestBuilder({
  iface,
  sdk,
  rules,
  game,
  discs,
  keys,
  hookNames,
  hookIds,
  help,
  examples,
}: {
  iface: string;
  sdk: string;
  /** The SDK release whose package_mod.py the checks follow: the newest. */
  rules: string;
  game: string;
  discs: string[];
  keys: string[];
  hookNames: Record<string, string[]>;
  hookIds: string[];
  help: Record<string, string>;
  examples: { title: string; json: string }[];
}) {
  const minor = Number(iface.split(".")[1] ?? 0);
  const apis = Array.from({ length: minor + 1 }, (_, i) => `1.${i}`).reverse();
  const scriptsAllowed = minor >= 1;
  // The hook explorer's "Open it in the manifest builder" link: ?hooks=<id>&type=script|native.
  const query = useSearchParams();
  const [text, setText] = useState(() => {
    const hooks = query.get("hooks")?.split(",").filter(Boolean);
    const type = query.get("type") === "native" || !scriptsAllowed ? "native" : "script";
    return pretty({ ...starter(type, iface, discs, game), ...(hooks?.length ? { hooks } : {}) });
  });
  const [hookInput, setHookInput] = useState("");

  const parsed = useMemo(() => {
    try {
      return { value: parseManifestJson(text), error: null as string | null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [text]);
  const m: Obj | null = parsed.value && typeof parsed.value === "object" && !Array.isArray(parsed.value) ? (plain(parsed.value) as Obj) : null;
  const errors = parsed.value !== null ? checkManifest(parsed.value, { keys, hookNames }) : [];
  const by = (field: string) => errors.filter((e) => fieldOf(e) === field);

  /** Changes the manifest from the form: the JSON is rewritten, in the same field order. */
  const set = (patch: Obj) => {
    if (!m) return;
    const next: Obj = { ...m };
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") delete next[k];
      else next[k] = v;
    }
    setText(pretty(next));
  };
  const str = (k: string) => (m && typeof m[k] === "string" ? (m[k] as string) : "");
  const kind = m?.type === "script" ? "script" : "native";
  const gameDiscs: string[] = m && m.games && typeof m.games === "object" && Array.isArray((m.games as Obj)[game]) ? ((m.games as Obj)[game] as string[]) : [];
  const hooks: string[] = Array.isArray(m?.hooks) ? (m!.hooks as string[]) : [];
  const settings: Setting[] = Array.isArray(m?.settings) ? (m!.settings as Setting[]) : [];
  const plugin = m?.plugin && typeof m.plugin === "object" ? (m.plugin as Record<string, string>) : {};
  const libName = (str("id") || "my-mod").replace(/-/g, "_");

  const setSetting = (i: number, patch: Obj) => set({ settings: settings.map((s, j) => (j === i ? Object.fromEntries(Object.entries({ ...s, ...patch }).filter(([, v]) => v !== undefined)) : s)) });
  const newSetting = (type: string): Setting => {
    const n = settings.length + 1;
    const base = { key: `option_${n}`, name: `Option ${n}`, type };
    if (type === "bool") return { ...base, default: false };
    if (type === "int") return { ...base, default: 1, min: 0, max: 10 };
    if (type === "float") return { ...base, default: 1, min: 0, max: 2, step: 0.1 };
    if (type === "choice") return { ...base, default: "a", choices: [{ value: "a", name: "First" }, { value: "b", name: "Second" }] };
    if (type === "keybind") return { ...base, default: keys.includes("KeyF") ? "KeyF" : (keys[0] ?? "") };
    return { ...base, default: "" };
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text.endsWith("\n") ? text : `${text}\n`], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "openrac-mod.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form className="grid content-start gap-5" onSubmit={(e) => e.preventDefault()} aria-label="The manifest's fields">
        {!m && <p className="rounded-lg border-l-2 border-brand bg-brand/10 px-4 py-3 text-[14px] text-soft">The form needs the JSON on the right to be an object. Fix the JSON, or press Reset.</p>}
        <fieldset disabled={!m} className="grid gap-4 disabled:opacity-50">
          <div className="grid gap-2">
            <span className="text-[13.5px] font-semibold text-hi">Kind of mod</span>
            <div className="d-seg self-start" role="radiogroup" aria-label="Kind of mod">
              <button type="button" role="radio" aria-checked={kind === "script"} disabled={!scriptsAllowed} onClick={() => set({ type: "script", plugin: undefined, scripts: m?.scripts ?? ["main.luau"], api: Number((str("api") || "1.1").split(".")[1]) >= 1 ? str("api") || iface : iface })}>
                Script (Luau)
              </button>
              <button type="button" role="radio" aria-checked={kind === "native"} onClick={() => set({ type: undefined, scripts: undefined, plugin: Object.keys(plugin).length ? plugin : { "linux-x86_64": `lib/linux-x86_64/${libName}.so` } })}>
                Native (C, C++)
              </button>
            </div>
            <Help text={kind === "script" ? "Runs everywhere, Android included. Sandboxed. No compiler needed." : "A library you build for each platform. The SDK's CMake fills in `plugin` for you."} />
          </div>

          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="Id" help={help.id} error={by("id")}>
              <input className="d-field font-mono" value={str("id")} onChange={(e) => set({ id: e.target.value })} spellCheck={false} />
            </Field>
            <Field label="Name" help={help.name} error={by("name")}>
              <input className="d-field" value={str("name")} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="Version" help={help.version} error={by("version")}>
              <input className="d-field font-mono" value={str("version")} onChange={(e) => set({ version: e.target.value })} spellCheck={false} />
            </Field>
            <Field label="Interface (api)" help={help.api} error={by("api")}>
              <select className="d-field w-full" value={str("api")} onChange={(e) => set({ api: e.target.value })}>
                {!apis.includes(str("api")) && <option value={str("api")}>{str("api") || "(none)"}</option>}
                {apis.map((a) => (
                  <option key={a} value={a} disabled={kind === "script" && a === "1.0"}>
                    {a}
                    {a === iface ? " (this SDK)" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Author" help={help.author}>
              <input className="d-field" value={str("author")} onChange={(e) => set({ author: e.target.value })} />
            </Field>
            <Field label="License" error={by("license")}>
              <input className="d-field" value={str("license")} placeholder="MIT" onChange={(e) => set({ license: e.target.value })} />
            </Field>
            <Field label="Description" error={by("description")}>
              <input className="d-field" value={str("description")} onChange={(e) => set({ description: e.target.value })} />
            </Field>
            <Field label="Homepage" help={help.homepage} error={by("homepage")}>
              <input className="d-field" value={str("homepage")} placeholder="https://github.com/you/your-mod" onChange={(e) => set({ homepage: e.target.value })} />
            </Field>
          </div>

          <div className="grid gap-2">
            <span className="text-[13.5px] font-semibold text-hi">Games and discs</span>
            <div className="flex flex-wrap gap-2">
              {discs.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="d-btn"
                  aria-pressed={gameDiscs.includes(d)}
                  onClick={() => {
                    const next = gameDiscs.includes(d) ? gameDiscs.filter((x) => x !== d) : [...gameDiscs, d];
                    set({ games: next.length ? { ...((m?.games as Obj) ?? {}), [game]: next } : undefined });
                  }}
                >
                  {game} · {d.toUpperCase()}
                </button>
              ))}
            </div>
            <Help text={help.games} />
            {by("games").map((e) => (
              <span key={e} className="text-[13px] text-brand">
                {e}
              </span>
            ))}
          </div>

          {kind === "script" ? (
            <Field label="Scripts" help={help.scripts} error={by("scripts")}>
              <input className="d-field font-mono" value={Array.isArray(m?.scripts) ? (m!.scripts as string[]).join(", ") : ""} onChange={(e) => set({ scripts: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} spellCheck={false} />
            </Field>
          ) : (
            <div className="grid gap-2">
              <span className="text-[13.5px] font-semibold text-hi">Platforms (plugin)</span>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="d-btn font-mono"
                    aria-pressed={p in plugin}
                    onClick={() => {
                      const next = { ...plugin };
                      if (p in next) delete next[p];
                      else next[p] = `lib/${p}/${libName}.${LIB_EXT[p.split("-")[0]] ?? "so"}`;
                      set({ plugin: Object.keys(next).length ? next : undefined });
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Help text="You do not write `plugin` by hand in a real mod: the SDK's CMake fills in what it built. Here it lets you see the shape." />
              {by("plugin").map((e) => (
                <span key={e} className="text-[13px] text-brand">
                  {e}
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <span className="text-[13.5px] font-semibold text-hi">Hook points</span>
            <div className="flex flex-wrap gap-2">
              {hooks.map((h) => (
                <button key={h} type="button" className="d-btn font-mono" data-on onClick={() => set({ hooks: hooks.filter((x) => x !== h).length ? hooks.filter((x) => x !== h) : undefined })} aria-label={`Remove ${h}`}>
                  {h} <span aria-hidden>×</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="d-field font-mono"
                list="hook-ids"
                placeholder={hookIds[0] ?? "rac1.player.turn_to_heading"}
                value={hookInput}
                onChange={(e) => setHookInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hookInput.trim()) {
                    e.preventDefault();
                    set({ hooks: [...new Set([...hooks, hookInput.trim()])] });
                    setHookInput("");
                  }
                }}
                aria-label="Add a hook point"
              />
              <button type="button" className="d-btn flex-none" disabled={!hookInput.trim()} onClick={() => { set({ hooks: [...new Set([...hooks, hookInput.trim()])] }); setHookInput(""); }}>
                Add
              </button>
              <datalist id="hook-ids">
                {hookIds.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
            </div>
            <Help text={help.hooks} />
            {by("hooks").map((e) => (
              <span key={e} className="text-[13px] text-brand">
                {e}
              </span>
            ))}
          </div>

          <div className="grid gap-3">
            <span className="text-[13.5px] font-semibold text-hi">Settings players can change</span>
            {settings.map((s, i) => (
              <fieldset key={i} className="d-card grid gap-3 p-3">
                <legend className="sr-only">Setting {i + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Key">
                    <input className="d-field font-mono" value={String(s.key ?? "")} onChange={(e) => setSetting(i, { key: e.target.value })} spellCheck={false} />
                  </Field>
                  <Field label="Name">
                    <input className="d-field" value={String(s.name ?? "")} onChange={(e) => setSetting(i, { name: e.target.value })} />
                  </Field>
                  <Field label="Type">
                    <select className="d-field w-full" value={String(s.type)} onChange={(e) => set({ settings: settings.map((x, j) => (j === i ? { ...newSetting(e.target.value), key: s.key, name: s.name } : x)) })}>
                      {["bool", "int", "float", "choice", "string", "keybind"].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {s.type === "bool" && (
                    <Field label="Default">
                      <select className="d-field w-full" value={String(s.default)} onChange={(e) => setSetting(i, { default: e.target.value === "true" })}>
                        <option>true</option>
                        <option>false</option>
                      </select>
                    </Field>
                  )}
                  {(s.type === "int" || s.type === "float") &&
                    (["default", "min", "max", ...(s.type === "float" ? ["step"] : [])] as const).map((k) => (
                      <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                        <input className="d-field font-mono" inputMode="decimal" value={s[k] === undefined ? "" : String(s[k])} onChange={(e) => setSetting(i, { [k]: e.target.value === "" ? undefined : Number.isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) })} />
                      </Field>
                    ))}
                  {(s.type === "string" || s.type === "keybind" || s.type === "choice") && (
                    <Field label="Default">
                      <input className="d-field font-mono" list={s.type === "keybind" ? "bind-names" : undefined} value={String(s.default ?? "")} onChange={(e) => setSetting(i, { default: e.target.value })} spellCheck={false} />
                    </Field>
                  )}
                  {s.type === "string" && (
                    <Field label="Max length">
                      <input className="d-field font-mono" inputMode="numeric" value={s.max_length === undefined ? "" : String(s.max_length)} onChange={(e) => setSetting(i, { max_length: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    </Field>
                  )}
                </div>
                {s.type === "choice" && (
                  <Field label="Choices, one per line: value = name">
                    <textarea
                      className="d-field min-h-[88px] font-mono"
                      value={(Array.isArray(s.choices) ? (s.choices as Obj[]) : []).map((c) => `${c.value} = ${c.name}`).join("\n")}
                      onChange={(e) => setSetting(i, { choices: e.target.value.split("\n").filter((l) => l.trim()).map((l) => { const [v, ...n] = l.split("="); return { value: v.trim(), name: n.join("=").trim() || v.trim() }; }) })}
                    />
                  </Field>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="grid gap-1">
                    {errors.filter((e) => e.startsWith(`setting ${s.key}:`) || e.startsWith(`settings[${i}]`)).map((e) => (
                      <span key={e} className="text-[13px] text-brand">
                        {e}
                      </span>
                    ))}
                  </span>
                  <button type="button" className="d-btn" onClick={() => set({ settings: settings.filter((_, j) => j !== i).length ? settings.filter((_, j) => j !== i) : undefined })}>
                    Remove
                  </button>
                </div>
              </fieldset>
            ))}
            <datalist id="bind-names">
              {keys.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-2">
              {["bool", "int", "float", "choice", "string", ...(minor >= 2 ? ["keybind"] : [])].map((t) => (
                <button key={t} type="button" className="d-btn" onClick={() => set({ settings: [...settings, newSetting(t)] })}>
                  + {t}
                </button>
              ))}
            </div>
            <Help text={help.settings} />
          </div>
          <p className="text-[13px] text-dim">
            Dependencies (<code>requires</code>), conflicts and load order are not in the form: write them in the JSON. The check covers them too.
          </p>
        </fieldset>
      </form>

      <div className="grid content-start gap-4 xl:sticky xl:top-4">
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-dim">
          <span className="mr-1">Examples:</span>
          {examples.map((e) => (
            <button key={e.title} type="button" className="d-btn h-7 px-2 text-[12.5px]" onClick={() => setText(e.json)}>
              {e.title}
            </button>
          ))}
          <button type="button" className="d-btn ml-auto h-7 px-2 text-[12.5px]" onClick={() => setText(pretty(starter(scriptsAllowed ? "script" : "native", iface, discs, game)))}>
            Reset
          </button>
        </div>
        <div className="overflow-hidden rounded-lg border border-line bg-ink-deep">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
            <span className="text-[12.5px] font-semibold text-dim">openrac-mod.json</span>
            <span className="flex gap-2">
              <CopyButton text={text} />
              <button type="button" onClick={download} className="d-btn h-6 px-2 text-[12px]">
                Download
              </button>
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            aria-label="The manifest as JSON: edit it, or paste your own"
            className="block min-h-[360px] w-full resize-y bg-transparent p-3.5 font-mono text-[13px] leading-[1.6] text-text outline-none"
          />
        </div>
        <div role="status" aria-live="polite" className={`rounded-lg border p-4 ${parsed.error || errors.length ? "border-brand/60 bg-brand/5" : "border-amber/50 bg-amber/5"}`}>
          {parsed.error ? (
            <>
              <p className="font-semibold text-hi">This is not valid JSON yet.</p>
              <p className="mt-1 font-mono text-[13px] text-soft">{parsed.error}</p>
            </>
          ) : errors.length ? (
            <>
              <p className="font-semibold text-hi">
                {errors.length} problem{errors.length > 1 ? "s" : ""} to fix
              </p>
              <ul className="mt-2 grid list-disc gap-1 pl-5 text-[14px] text-body">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="font-semibold text-amber">✓ The manifest passes every check.</p>
          )}
          <p className="mt-2 text-[12.5px] text-dim">
            Checked in your browser by the rules of SDK {rules}: the same as its <code>tools/package_mod.py --check</code>, without looking for the files it names.
            {sdk !== rules && <> Those are the newest rules; the tool of SDK {sdk} differs on a few fields.</>}
          </p>
        </div>
        {!parsed.error && !errors.length && kind === "script" && (
          <details className="rounded-lg border border-line">
            <summary className="cursor-pointer list-none px-3 py-2 text-[14px] font-semibold text-soft">
              <span className="plus mr-2 inline-block text-amber transition-transform">+</span>Reading the settings in your script
            </summary>
            <div className="border-t border-line px-3">
              <Code
                lang="luau"
                title="main.luau"
                code={settings.length ? settings.map((s) => `local ${String(s.key).replace(/\W/g, "_")} = openrac.setting(${JSON.stringify(s.key)})`).join("\n") : `-- add a setting, then read it:\n-- local value = openrac.setting("key")`}
              />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
