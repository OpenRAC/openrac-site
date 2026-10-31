"use client";

import { useState } from "react";
import { IMPACT_LABEL } from "@/lib/mods/logic";
import { issueUrl, type Check, type SubmitCheck } from "@/lib/mods/submit";
import type { Impact } from "@/lib/mods/types";

const IMPACTS: Impact[] = ["cosmetic", "gameplay", "speedrun-safe", "touches-saves", "online"];
const input = "h-12 w-full rounded-xl border border-white/15 bg-[color-mix(in_srgb,white_3%,var(--color-ink))] px-4 text-[16px] text-text placeholder:text-dim focus:border-amber focus:outline-none";
const label = "mb-1.5 block font-orbitron text-[11px] font-bold uppercase tracking-[.2em] text-dim";
const chip = (on: boolean) => `btn btn-sm min-h-11 ${on ? "!border-amber text-amber" : "text-soft"}`;

function CheckList({ checks }: { checks: Check[] }) {
  return (
    <ul className="grid gap-1.5">
      {checks.map((c, i) => (
        <li key={i} className="flex gap-2.5 text-[15px]">
          <span aria-hidden className={`mt-0.5 flex size-5 flex-none items-center justify-center rounded-full text-[12px] font-bold ${c.ok ? "bg-amber/20 text-amber" : "bg-white/10 text-soft"}`}>
            {c.ok ? "✓" : "!"}
          </span>
          <span className={c.ok ? "text-soft" : "text-hi"}>
            <span className="sr-only">{c.ok ? "Done: " : "To fix: "}</span>
            {c.label}
            {!c.ok && c.fix && (
              <span className="block text-[14px] text-dim">
                {c.fix}{" "}
                {c.link && (
                  <a href={c.link} className="text-amber">
                    How
                  </a>
                )}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="surface relative overflow-hidden p-5 sm:p-6">
      <span aria-hidden className="absolute -top-1.5 right-3.5 font-orbitron text-[72px] font-bold leading-none text-brand/15">
        {n}
      </span>
      <h2 className="relative mb-4 font-orbitron text-[19px] font-bold text-gold">{title}</h2>
      <div className="relative">{children}</div>
    </section>
  );
}

/**
 * Listing a mod without git or JSON: paste the repository, see what is ready and what to fix, choose
 * tags, then GitHub's issue form opens filled in. Pictures are dropped into that form; a bot checks it
 * again, optimizes the pictures and opens the listing for a maintainer to merge.
 */
export default function SubmitWizard({ indexRepo, tags, mods }: { indexRepo: string; tags: string[]; mods: { id: string; name: string; version: string }[] }) {
  const [kind, setKind] = useState<"Mod" | "Modpack">("Mod");
  const [repo, setRepo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SubmitCheck | null>(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [tagOn, setTagOn] = useState<string[]>([]);
  const [impact, setImpact] = useState<Impact[]>([]);
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [video, setVideo] = useState("");
  const [bugs, setBugs] = useState("");
  const [discord, setDiscord] = useState("");

  const toggle = <T,>(list: T[], set: (v: T[]) => void, v: T) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/mods/submit/check?repo=${encodeURIComponent(repo.trim())}`);
      const body = await res.json();
      if ("error" in body) setError(body.error);
      else {
        setResult(body);
        setPicked((body as SubmitCheck).mods.filter((m) => m.checks.every((c) => c.ok)).map((m) => m.id));
      }
    } catch {
      setError("The check could not run. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const ready = kind === "Modpack" ? name.trim() && picked.length >= 2 && description.trim() : result?.ready && picked.length > 0;
  const submit = () => {
    const fields: Record<string, string> = {
      kind,
      title: kind === "Mod" ? `Submit mod: ${picked.join(", ")}` : `Submit modpack: ${name.trim()}`,
      repo: kind === "Mod" ? (result?.repo ?? "") : "",
      mods: kind === "Mod" ? picked.join(",") : picked.map((id) => `${id}@>=${mods.find((m) => m.id === id)?.version ?? "0.0.0"}`).join(","),
      name: kind === "Modpack" ? name.trim() : "",
      description: description.trim(),
      tags: tagOn.join(","),
      impact: impact.join(","),
      video: video.trim(),
      bugs: bugs.trim(),
      discord: discord.trim(),
    };
    window.open(issueUrl(indexRepo, fields), "_blank", "noopener");
  };

  return (
    <div className="grid gap-5">
      <div role="radiogroup" aria-label="What are you listing" className="flex gap-2">
        {(["Mod", "Modpack"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => (setKind(k), setPicked([]))} className={chip(kind === k)}>
            {k === "Mod" ? "A mod" : "A modpack"}
          </button>
        ))}
      </div>

      {kind === "Mod" ? (
        <Step n={1} title="Your repository">
          <form onSubmit={check} className="flex flex-wrap gap-2.5">
            <label className="min-w-0 flex-1 basis-[280px]">
              <span className="sr-only">GitHub repository address</span>
              <input className={input} type="url" inputMode="url" required placeholder="https://github.com/you/your-mod" value={repo} onChange={(e) => setRepo(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Checking…" : "Check it"}
            </button>
          </form>
          <p role="status" aria-live="polite" className="mt-3 text-[15px] text-amber">
            {error}
          </p>
          {result && (
            <div className="mt-2 grid gap-5">
              <CheckList checks={result.checks} />
              {result.mods.map((m) => (
                <div key={m.path || m.id} className="rounded-xl border border-line bg-ink/60 p-4">
                  <label className="mb-3 flex items-center gap-3">
                    <input type="checkbox" className="size-[18px] accent-amber" checked={picked.includes(m.id)} disabled={!m.checks.every((c) => c.ok)} onChange={() => toggle(picked, setPicked, m.id)} />
                    <span className="font-orbitron font-bold text-gold">{m.name}</span>
                    <span className="text-[13px] text-dim">
                      {m.id} · v{m.version} · {m.type}
                    </span>
                  </label>
                  <CheckList checks={m.checks} />
                </div>
              ))}
            </div>
          )}
        </Step>
      ) : (
        <Step n={1} title="What goes in it">
          <label className="mb-4 block">
            <span className={label}>Name</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Randomizer night" />
          </label>
          <fieldset>
            <legend className={label}>Mods (at least two)</legend>
            <div className="grid max-h-[320px] gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
              {mods.map((m) => (
                <label key={m.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-white/5">
                  <input type="checkbox" className="size-[18px] accent-amber" checked={picked.includes(m.id)} onChange={() => toggle(picked, setPicked, m.id)} />
                  <span className="text-hi">{m.name}</span>
                  <span className="text-[13px] text-dim">v{m.version} or newer</span>
                </label>
              ))}
            </div>
          </fieldset>
        </Step>
      )}

      <Step n={2} title="How players find it">
        <label className="mb-4 block">
          <span className={label}>One line about it ({300 - description.length} left)</span>
          <textarea className={`${input} h-24 py-3`} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it does, in plain words." />
        </label>
        <fieldset className="mb-4">
          <legend className={label}>Tags</legend>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button key={t} type="button" aria-pressed={tagOn.includes(t)} onClick={() => toggle(tagOn, setTagOn, t)} className={chip(tagOn.includes(t))}>
                {t}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mb-4">
          <legend className={label}>What it changes</legend>
          <div className="flex flex-wrap gap-2">
            {IMPACTS.map((i) => (
              <button key={i} type="button" aria-pressed={impact.includes(i)} onClick={() => toggle(impact, setImpact, i)} className={chip(impact.includes(i))}>
                {IMPACT_LABEL[i]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <label>
            <span className={label}>YouTube video</span>
            <input className={input} type="url" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtu.be/…" />
          </label>
          <label>
            <span className={label}>Bug reports</span>
            <input className={input} type="url" value={bugs} onChange={(e) => setBugs(e.target.value)} placeholder="Issues link" />
          </label>
          <label>
            <span className={label}>Discord</span>
            <input className={input} type="url" value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="Invite link" />
          </label>
        </div>
      </Step>

      <Step n={3} title="Send it">
        <p className="mb-4 max-w-[640px] text-soft">
          GitHub opens with the form filled in. Drag your screenshots into it, tick that it follows the content rules, and press <b className="text-hi">Create</b>. A bot checks it again, optimizes the pictures and opens the listing; you are told on the issue when it is live.
        </p>
        <button type="button" className="btn btn-primary" disabled={!ready} onClick={submit}>
          Open the submission on GitHub
        </button>
        {!ready && <p className="mt-3 text-[14px] text-dim">{kind === "Mod" ? "Check your repository first; every check of at least one mod must pass." : "Give it a name, a line about it, and at least two mods."}</p>}
      </Step>
    </div>
  );
}
