import type { ReactNode } from "react";
import Section from "@/components/ui/Section";
import { ALSO_WORKED_ON, DISCORD_URL, PROJECTS } from "@/lib/projects";

/** Every listed game with the projects working on it (from PROJECTS and ALSO_WORKED_ON), so it never goes stale. */
function OtherTitles() {
  // One row per game: a game with projects for several releases (Ratchet & Clank: PAL and NTSC-U) lists them all.
  const names = [...new Set(PROJECTS.map((g) => g.name))];
  const games = names.map((name) => {
    const own = PROJECTS.filter((g) => g.name === name);
    return {
      game: own[0],
      projects: [...own.map((g) => ({ repo: g.repo, region: g.region })), ...ALSO_WORKED_ON.filter((o) => own.some((g) => g.id === o.game))],
    };
  });
  return (
    <div className="grid gap-4 pb-5 text-soft">
      <p>
        Yes, and every one of them by an <b className="font-semibold text-hi">independent team</b>. Each project has its own people, its own
        repository and its own way of working. This page only gathers them in one place.
      </p>
      <ul className="grid gap-2">
        {games.map(({ game, projects }) => (
          <li key={game.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-line bg-ink/60 px-4 py-2.5">
            <span className="font-orbitron text-[15px] font-bold text-gold">{game.name}</span>
            <span className="text-[13px] text-dim">{game.year}</span>
            {game.phase === "research" && (
              <span className="rounded-full border border-amber/40 px-2 py-0.5 font-orbitron text-[10px] uppercase tracking-[.15em] text-amber">research phase</span>
            )}
            <span className="flex flex-wrap gap-x-3 gap-y-1 sm:ml-auto">
              {projects.map((p) =>
                p.repo ? (
                  <a key={p.repo} href={`https://github.com/${p.repo}`} className="text-[15px] text-amber no-underline hover:underline">
                    {p.repo.split("/")[1]}
                    {p.region && <span className="text-dim"> · {p.region}</span>}
                  </a>
                ) : null,
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border-l-4 border-brand bg-brand/10 px-4 py-3.5">
        <b className="mb-1 block font-orbitron text-[15px] text-gold">Working on a Ratchet &amp; Clank decompilation?</b>
        <p>
          We offer every team the same thing: one shared place where people can follow your progress next to the others, measured the same way and
          linked straight to your repository. It is an invitation, never a requirement. Nobody has to join OpenRAC or move a project under it, and
          the offer stands for everyone.
        </p>
        <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
          <a href={DISCORD_URL} className="font-semibold text-amber no-underline hover:underline">Say hi on Discord</a>
          <a href="https://github.com/OpenRAC/openrac-site/issues" className="font-semibold text-amber no-underline hover:underline">or open an issue</a>
        </p>
      </div>
    </div>
  );
}

/** Also served as text in /llms-full.txt (the plain-text answers). */
export const FAQ: readonly (readonly [string, ReactNode])[] = [
  ["Is this a port or a way to play the game for free?", "No. OpenRAC contains no game assets, no game code and no game binaries. To build anything you need your own legally obtained copy of the game."],
  ["How is this different from OpenGOAL?", "OpenGOAL targets a different game and toolchain. OpenRAC follows the same spirit: understand a classic game, document it, and make it possible to study and preserve. Our method is byte-matching decompilation."],
  ["Will there be a PC port?", "That is a possible long-term outcome of a finished decompilation, but it is not a current goal. Right now the goal is a complete, accurate source reconstruction of each game, one title at a time."],
  ["Will there be mod support on release, or will it be added later?", "Our main priority is to decompile the entire game first. Once that is done, we will look into adding extras and new features, so mod support would be explored after the decompilation is complete."],
  ["What do “matched” and “percent” mean?", "A function or method is matched when the reconstructed code compiles to exactly the same instructions or bytecode as the retail build. The percentages reflect verified code and functions divided by the totals."],
  ["Are the other titles being worked on?", <OtherTitles key="other" />],
  ["How can I help?", "Read CONTRIBUTING.md on GitHub. Reviewing, documenting function behavior, and improving tooling all help, not just writing matches."],
  ["Do you accept assets or dumps from the game?", "No. Please do not upload or link game files, dumps or other copyrighted material to issues, pull requests or the community channels."],
];

/** "FAQ": each question opens in place (plain <details>, no script). */
export default function Faq() {
  return (
    <Section id="faq" title="FAQ" sub="The short answers.">
      <div className="grid gap-2.5">
        {FAQ.map(([q, a]) => (
          <details key={q} className="group surface px-4 open:border-brand open:bg-panel-hi hover:border-brand/70 sm:px-5">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[16px] font-semibold text-text sm:text-[17px]">
              {q}
              {/* A real button-looking control, so it is plain that the row opens. */}
              <span
                aria-hidden
                className="plus flex size-9 flex-none items-center justify-center rounded-full border border-brand/50 bg-brand/15 font-orbitron text-[20px] leading-none text-amber transition group-hover:bg-brand group-hover:text-[#1a0d00] group-open:bg-brand group-open:text-[#1a0d00]"
              >
                +
              </span>
            </summary>
            {typeof a === "string" ? <p className="pb-5 text-soft">{a}</p> : a}
          </details>
        ))}
      </div>
    </Section>
  );
}
