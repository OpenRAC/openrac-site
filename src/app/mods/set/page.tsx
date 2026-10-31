import type { Metadata } from "next";
import Link from "next/link";
import Section from "@/components/ui/Section";
import { TypeBadge } from "@/components/mods/Badges";
import InstallButton from "@/components/mods/InstallButton";
import ModImage from "@/components/mods/ModImage";
import { getModCatalog } from "@/lib/mods";
import { DISC_LABEL, GAME_LABEL, isRevoked, parseSetup } from "@/lib/mods/logic";
import { slim } from "@/lib/mods/slim";

export const metadata: Metadata = {
  title: "A shared mod setup",
  description: "Someone's set of OpenRAC mods, at exact versions, to install in one click.",
  // Every link is someone's own combination: useful to its reader, not to a search engine.
  robots: { index: false, follow: true },
};

/**
 * A "Share my setup" link from the launcher: the mods and exact versions a friend plays with, for a
 * multiplayer or randomizer session. One button installs exactly that set; the launcher pins those
 * versions until the player unpins them.
 */
export default async function SetupPage(props: PageProps<"/mods/set">) {
  const q = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const entries = parseSetup(one(q.m));
  const game = one(q.g);
  const disc = one(q.d);
  const { catalog } = await getModCatalog();
  const byId = new Map(catalog.mods.map((m) => [m.id, m]));
  const rows = entries.map((e) => {
    const mod = byId.get(e.id);
    const version = mod?.versions.find((v) => v.version === e.version);
    const problem = !mod ? "Not in the mod list any more" : !version ? `Version ${e.version} is not listed` : isRevoked(catalog.revoked, e.id, e.version) ? "This version was withdrawn" : undefined;
    return { ...e, mod: mod && slim(mod, catalog), problem };
  });
  const installable = rows.filter((r) => !r.problem);

  return (
    <main className="mx-auto max-w-[1080px] px-4 pt-6">
      <Section
        id="set"
        title="A shared mod setup"
        sub={`${entries.length ? `${entries.length} mod${entries.length === 1 ? "" : "s"} at exact versions` : "This link lists no mods"}${game ? ` for ${GAME_LABEL[game] ?? game}${disc ? ` (${DISC_LABEL[disc] ?? disc})` : ""}` : ""}. Install them all to play with the same set.`}
      >
        {rows.length > 0 && (
          <ul className="mb-6 grid gap-2.5">
            {rows.map((r) => (
              <li key={r.id} className="surface flex items-center gap-4 p-3 pr-5">
                {r.mod?.card ? <ModImage img={r.mod.card} sizes="96px" className="aspect-video w-24 flex-none rounded-lg object-cover" /> : <span aria-hidden className="aspect-video w-24 flex-none rounded-lg bg-gradient-to-br from-panel-hi to-ink" />}
                <div className="min-w-0 flex-1">
                  {r.mod ? (
                    <Link href={`/mods/${r.id}`} className="font-orbitron font-bold text-gold no-underline hover:text-amber">
                      {r.mod.name}
                    </Link>
                  ) : (
                    <span className="font-orbitron font-bold text-soft">{r.id}</span>
                  )}
                  <p className="text-[14px] tabular-nums text-dim">
                    v{r.version}
                    {r.problem && <span className="text-amber"> · {r.problem}</span>}
                  </p>
                </div>
                {r.mod && <TypeBadge type={r.mod.type} />}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {installable.length > 0 && <InstallButton mods={installable.map((r) => ({ id: r.id, version: r.version }))} label={`Install ${installable.length === entries.length ? "all" : installable.length} at these versions`} devOnly={installable.some((r) => r.mod?.works !== "release")} />}
          <Link href="/mods" className="btn">
            Browse mods
          </Link>
        </div>
        {installable.length < rows.length && <p className="mt-4 text-[15px] text-dim">The mods marked above cannot be installed at that version; the rest still can.</p>}
        <p className="mt-6 max-w-[640px] text-[14px] text-dim">The launcher installs what each of these needs too, and keeps these versions until you unpin them, so your set stays the same as your friend&apos;s.</p>
      </Section>
    </main>
  );
}
