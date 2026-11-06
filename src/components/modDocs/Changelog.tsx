import { docsHref, REPO } from "@/lib/modDocs/logic";
import type { PartDiff, Release } from "@/lib/modDocs/types";

const PARTS: { key: keyof Release["changes"]["api"]; label: string }[] = [
  { key: "c", label: "C interface" },
  { key: "cpp", label: "C++ layer" },
  { key: "luau", label: "Luau API" },
  { key: "hooks", label: "Hook points" },
  { key: "fields", label: "Script fields" },
];

/** Where a changed name is documented in that release. */
function nameHref(part: string, name: string, version: string, latest: string, games: Release["hooks"] = []): string {
  const at = (path: string, hash: string) => `${docsHref(version, path, latest)}#${encodeURI(hash)}`;
  if (part === "c") return at("reference/c-api", name);
  if (part === "cpp") return at("reference/cpp-api", name);
  if (part === "luau") return at("reference/luau-api", name);
  if (part === "fields") {
    const [game, field] = name.split(":");
    return at(`reference/hooks-${game}`, `field-${field}`);
  }
  // A name without an id ("Hero_TakeDamage") belongs to the game whose hook points have it.
  const game = name.includes(".") ? name.split(".")[0] : (games.find((g) => g.hooks.some((h) => h.name === name || h.aliases.includes(name)))?.game ?? games[0]?.game ?? "rac1");
  return at(`reference/hooks-${game}`, name);
}

function Names({ names, part, version, latest, games, most = 24 }: { names: string[]; part: string; version: string; latest: string; games: Release["hooks"]; most?: number }) {
  const shown = names.slice(0, most);
  return (
    <span className="flex flex-wrap gap-1.5">
      {shown.map((n) => (
        <a key={n} href={nameHref(part, n, version, latest, games)} className="rounded-md bg-umber px-1.5 py-0.5 font-mono text-[12.5px] text-gold no-underline hover:bg-umber-hi">
          {n}
        </a>
      ))}
      {names.length > most && <span className="px-1 text-[13px] text-dim">and {names.length - most} more</span>}
    </span>
  );
}

function PartChanges({ part, label, d, r, latest }: { part: string; label: string; d: PartDiff; r: Release; latest: string }) {
  if (!d.added.length && !d.removed.length && !d.changed.length) return null;
  return (
    <div className="grid gap-2">
      <p className="font-semibold text-hi">{label}</p>
      {d.added.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-[90px_1fr]">
          <span className="text-[13px] font-semibold text-amber">Added {d.added.length}</span>
          <Names names={d.added} part={part} version={r.version} latest={latest} games={r.hooks} />
        </div>
      )}
      {d.changed.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-[90px_1fr]">
          <span className="text-[13px] font-semibold text-soft">Changed {d.changed.length}</span>
          <ul className="grid gap-1 text-[13px]">
            {d.changed.slice(0, 12).map((c) => (
              <li key={c.name} className="font-mono text-body [overflow-wrap:anywhere]">
                <a href={nameHref(part, c.name, r.version, latest, r.hooks)} className="text-gold underline decoration-gold/40 underline-offset-2">
                  {c.name}
                </a>
                : <span className="text-dim line-through">{c.from}</span> → {c.to}
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.removed.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-[90px_1fr]">
          <span className="text-[13px] font-semibold text-brand">Removed {d.removed.length}</span>
          <span className="flex flex-wrap gap-1.5">
            {d.removed.map((n) => (
              <span key={n} className="rounded-md bg-brand/10 px-1.5 py-0.5 font-mono text-[12.5px] text-soft line-through">
                {n}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}

/** Every release, newest first: its interface, the pull requests that changed the SDK, and what its API added, changed or removed. */
export default function Changelog({ releases, latest }: { releases: Release[]; latest: string }) {
  return (
    <div className="grid gap-6">
      {releases.map((r) => {
        const total = PARTS.reduce((n, p) => n + r.changes.api[p.key].added.length + r.changes.api[p.key].removed.length + r.changes.api[p.key].changed.length, 0);
        const first = !r.changes.since;
        return (
          <section key={r.version} id={`v${r.version}`} className="d-card grid scroll-mt-20 gap-4 p-4">
            <header className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[19px] text-hi font-semibold tracking-tight">
                <a href={docsHref(r.version, "", latest)} className="no-underline hover:text-amber">
                  SDK {r.version}
                </a>
                {r.version === latest && <span className="ml-2 align-middle text-[12px] font-semibold text-amber">latest</span>}
              </h2>
              <p className="text-[13.5px] text-dim">
                <time dateTime={r.date}>{r.date}</time> · interface {r.interface} ·{" "}
                <a href={`${REPO}/releases/tag/${r.tag}`} className="text-soft underline" rel="noopener">
                  release on GitHub
                </a>
              </p>
            </header>
            {r.changes.commits.length > 0 && (
              <ul className="grid gap-1.5 text-[14.5px] text-body">
                {r.changes.commits.map((c) => (
                  <li key={c.sha} className="flex gap-2">
                    <span aria-hidden className="text-brand">
                      •
                    </span>
                    <span>
                      {c.subject}{" "}
                      {c.pr ? (
                        <a href={`${REPO}/pull/${c.pr}`} className="text-[13px] text-amber" rel="noopener">
                          #{c.pr}
                        </a>
                      ) : (
                        <a href={`${REPO}/commit/${c.sha}`} className="font-mono text-[12.5px] text-dim" rel="noopener">
                          {c.sha.slice(0, 7)}
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {first ? (
              <p className="text-[14px] text-soft">The first release of the SDK.</p>
            ) : total ? (
              <div className="grid gap-4 border-t border-line pt-4">
                {PARTS.map((p) => (
                  <PartChanges key={p.key} part={p.key} label={p.label} d={r.changes.api[p.key]} r={r} latest={latest} />
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-soft">No change to the API since {r.changes.since}: fixes and docs only.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
