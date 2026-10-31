"use client";

import { useMemo, useState } from "react";
import { slimChangeSet, type SlimMod } from "@/lib/mods/slim";
import InstallButton from "./InstallButton";
import Sheet from "./Sheet";

const row = "flex items-center justify-between gap-3 rounded-xl border border-line bg-ink/60 px-3.5 py-2.5";

/**
 * CKAN's "Apply changes" for the web: what was picked, what comes with it, what the authors
 * recommend (ticked) or suggest (not ticked), and anything that stops the install. One native-code
 * warning for the whole set, naming the mods, rather than one per mod (people stop reading repeated
 * warnings). The launcher shows the same screen again and has the last word.
 */
export default function ChangeSetDialog({ mods, picked, open, onClose, onDone }: { mods: SlimMod[]; picked: string[]; open: boolean; onClose: () => void; onDone: () => void }) {
  const [extra, setExtra] = useState<Record<string, boolean>>({});
  const base = useMemo(() => slimChangeSet(mods, picked), [mods, picked]);
  const chosenExtras = [...base.recommends.filter((m) => extra[m.id] !== false), ...base.suggests.filter((m) => extra[m.id] === true)].map((m) => m.id);
  const key = [...picked, ...chosenExtras].join();
  const cs = useMemo(() => slimChangeSet(mods, key ? key.split(",") : []), [mods, key]);
  const blocked = cs.conflicts.length > 0 || cs.missing.length > 0;
  const total = cs.install.length;
  const devOnly = cs.install.some(({ mod }) => mod.works !== "release");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={blocked ? "Can't install this set yet" : `Install ${total} mod${total === 1 ? "" : "s"}`}
      actions={
        !blocked && (
          <InstallButton mods={[...picked, ...chosenExtras].map((id) => ({ id }))} label={`Install ${total} mod${total === 1 ? "" : "s"}`} devOnly={devOnly} onInstalled={onDone} />
        )
      }
    >
      <div className="grid gap-5 text-[15px]">
        {cs.conflicts.map(({ a, b }) => (
          <p key={a.id + b.id} className="rounded-xl border-l-4 border-amber bg-amber/10 px-4 py-3 text-soft">
            <b className="text-gold">{a.name}</b> and <b className="text-gold">{b.name}</b> can&apos;t run together. Untick one of them to go on.
          </p>
        ))}
        {cs.missing.length > 0 && <p className="rounded-xl border-l-4 border-amber bg-amber/10 px-4 py-3 text-soft">Something this set needs is not in the mod list any more: {cs.missing.join(", ")}.</p>}

        <section>
          <h3 className="mb-2 font-orbitron text-[12px] font-bold uppercase tracking-[.2em] text-hi">You picked</h3>
          <ul className="grid gap-2">
            {cs.install
              .filter((x) => !x.auto && picked.includes(x.mod.id))
              .map(({ mod }) => (
                <li key={mod.id} className={row}>
                  <span className="font-orbitron font-bold text-gold">{mod.name}</span>
                  <span className="text-[13px] text-dim tabular-nums">v{mod.version}</span>
                </li>
              ))}
          </ul>
        </section>

        {cs.install.some((x) => x.auto) && (
          <section>
            <h3 className="mb-1 font-orbitron text-[12px] font-bold uppercase tracking-[.2em] text-hi">Also installs</h3>
            <p className="mb-2 text-[14px] text-dim">They are needed. The launcher removes them again once nothing uses them.</p>
            <ul className="grid gap-2">
              {cs.install
                .filter((x) => x.auto)
                .map(({ mod }) => (
                  <li key={mod.id} className={row}>
                    <span className="text-hi">{mod.name}</span>
                    <span className="text-[13px] text-dim tabular-nums">v{mod.version}</span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {(base.recommends.length > 0 || base.suggests.length > 0) && (
          <section>
            <h3 className="mb-2 font-orbitron text-[12px] font-bold uppercase tracking-[.2em] text-hi">Go well with it</h3>
            <ul className="grid gap-2">
              {[...base.recommends.map((m) => [m, true] as const), ...base.suggests.map((m) => [m, false] as const)].map(([m, recommended]) => (
                <li key={m.id}>
                  <label className={`${row} cursor-pointer`}>
                    <span className="min-w-0">
                      <span className="text-hi">{m.name}</span>
                      <span className="block text-[13px] text-dim">{recommended ? "Recommended by the author" : "Suggested by the author"}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={extra[m.id] ?? recommended}
                      onChange={(e) => setExtra((x) => ({ ...x, [m.id]: e.target.checked }))}
                      className="size-[18px] flex-none accent-amber"
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        )}

        {cs.native.length > 0 && (
          <p className="rounded-xl border-l-4 border-amber bg-amber/10 px-4 py-3 text-soft">
            <b className="text-gold">{cs.native.map((m) => m.name).join(", ")}</b> {cs.native.length === 1 ? "runs" : "run"} native code on your computer, outside the game&apos;s script sandbox. Every
            file is checked against the hashes in the signed mod list before it is used.
          </p>
        )}
        {devOnly && <p className="text-[14px] text-dim">Some of these need the dev build of the launcher. On a release, the launcher installs the newest versions it can run, and says which.</p>}
      </div>
    </Sheet>
  );
}
