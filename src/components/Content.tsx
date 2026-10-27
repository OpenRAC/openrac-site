import type { ReactNode } from "react";
import { ALSO_WORKED_ON, DISCORD_URL, PROJECTS, type ProjectId } from "@/lib/projects";
import type { Commit } from "@/lib/activity";
import Section from "./Section";

/** Discord's mark (also on the header's button). */
export const DISCORD_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px] flex-none fill-current">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const ARROW = <span aria-hidden className="ml-auto flex-none text-brand transition-transform group-hover:translate-x-0.5">→</span>;

/** The small uppercase heading over a list or panel. */
const listTitle = "mb-2 font-orbitron text-[12px] font-bold uppercase tracking-[.2em] text-lav";

function Cards({ items }: { items: readonly (readonly [string, string, ReactNode?])[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] sm:gap-5">
      {items.map(([title, text, action], i) => (
        <div key={title} className="surface relative flex flex-col overflow-hidden p-5 sm:p-6">
          <span aria-hidden className="absolute -top-1.5 right-3.5 font-orbitron text-[72px] font-bold leading-none text-brand/15 sm:text-[84px]">{i + 1}</span>
          <h3 className="relative mb-2 font-orbitron text-[19px] font-bold text-gold">{title}</h3>
          <p className="relative text-soft">{text}</p>
          {action && <div className="relative mt-auto pt-4">{action}</div>}
        </div>
      ))}
    </div>
  );
}

export function Contribute() {
  return (
    <Section id="contribute" title="Get involved" sub="You do not need to be a reverse engineer. Every project here welcomes newcomers.">
      <Cards
        items={[
          [
            "Say hello",
            "Join the Discord, tell us what you are curious about and pick a starting point with people who have done it before.",
            <a key="d" href={DISCORD_URL} className="btn btn-sm border-[#5865f2] bg-[#5865f2] text-white">
              {DISCORD_ICON}
              Discord
            </a>,
          ],
          ["Set up", "Follow the setup guide of the project you like. You will need your own legally obtained copy of the game, we never provide one."],
          ["Pick a function", "Take a small one, get it to compile to the same bytes and open a pull request. Reviews, notes and tooling help just as much."],
        ]}
      />
      {/* Every project's contributing guide, as one list rather than a wall of buttons. */}
      <div className="surface mt-5 px-5 pb-2 pt-4 sm:px-6">
        <h3 className={listTitle}>Contribute to</h3>
        <ul className="grid gap-x-8 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {PROJECTS.filter((p) => p.repo).map((p) => (
            <li key={p.id} className="border-t border-line first:border-0 min-[480px]:[&:nth-child(2)]:border-0 lg:[&:nth-child(-n+4)]:border-0">
              <a href={p.contributing ?? `https://github.com/${p.repo}`} className="group flex min-h-11 items-center gap-2.5 py-2 font-semibold text-text no-underline hover:text-amber">
                <i aria-hidden className="size-2 flex-none rounded-full" style={{ background: p.theme.text2 }} />
                <span className="min-w-0 truncate">{p.name}</span>
                {ARROW}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

const ago = (iso: string): string => {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
};

/** The project's colour on its activity tag, close to its card. */
const TAG: Record<ProjectId, string> = {
  rac1: "border-lav/30 bg-lav/15 text-lav",
  gc: "border-[#5a7fa6]/40 bg-[#5a7fa6]/25 text-[#9fd3ff]",
  uya: "border-brand/40 bg-brand/20 text-[#ffc35a]",
  deadlocked: "border-red-500/40 bg-red-950/60 text-[#ff6b6b]",
  gm: "border-[#00b4d8]/40 bg-[#00b4d8]/25 text-[#7dd3fc]",
  sm: "border-yellow-500/40 bg-yellow-950/60 text-[#facc15]",
  sac: "border-sky-500/40 bg-sky-950/60 text-[#38bdf8]",
};

export function Activity({ commits }: { commits: Commit[] }) {
  return (
    <Section id="activity" title="Recent activity" sub="The latest commits across the tracked projects, straight from GitHub.">
      {commits.length === 0 ? (
        <p className="text-dim">Could not load activity right now. See the repositories on GitHub.</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {commits.map((c) => (
            <li key={c.url} className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-xl border border-line bg-panel px-4 py-3">
              <span className={`flex-none rounded-full border px-2.5 py-1 font-orbitron text-[11px] font-semibold tracking-wider ${TAG[c.projectId]}`}>{c.project}</span>
              <a href={c.url} className="order-3 min-w-0 basis-full truncate text-[#e3e9ff] no-underline hover:text-amber sm:order-none sm:basis-0 sm:flex-1">{c.message}</a>
              <time dateTime={c.date} className="flex-none text-[13px] text-dim">{ago(c.date)}</time>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function HowItWorks() {
  return (
    <Section id="how" title="How it works" sub="Matching decompilation, in three steps.">
      <Cards
        items={[
          ["Disassemble", "Your own copy of the game is split into code and data. Nothing extracted from it is ever stored in the repository."],
          ["Rewrite", "We write plain C for each function and compile it with the same compiler and flags the original developers used."],
          ["Verify", "If the output matches the original bytes exactly, the function counts as done. The build and progress report are public and reproducible."],
        ]}
      />
    </Section>
  );
}

type Resource = { title: string; href: string; text: string };

const TOOLS: Resource[] = [
  { title: "ByteMatch", href: "https://bytematch.dev", text: "Progress tracking for decompilation projects, the same numbers shown here." },
  { title: "decomp.me", href: "https://decomp.me", text: "Match a single function together, right in the browser." },
  { title: "objdiff", href: "https://github.com/encounter/objdiff", text: "Compares compiled output against the original, instruction by instruction." },
  { title: "splat", href: "https://github.com/ethteck/splat", text: "Splits a binary into code and data segments." },
  { title: "spimdisasm", href: "https://github.com/Decompollaborate/spimdisasm", text: "The MIPS disassembler behind splat; the PS2's main CPU is MIPS." },
  { title: "m2c", href: "https://github.com/matt-kempster/m2c", text: "Turns MIPS assembly into a first draft of C to start a match from." },
  { title: "Ghidra", href: "https://github.com/NationalSecurityAgency/ghidra", text: "Reverse engineering suite for exploring code, data and call graphs." },
  { title: "PCSX2", href: "https://pcsx2.net", text: "PlayStation 2 emulator with a debugger, for watching the code run." },
];

const COMMUNITY: Resource[] = [
  { title: "Wrench", href: "https://github.com/chaoticgd/wrench", text: "Level editor and modding tools for the PlayStation 2 games, and years of format research." },
  { title: "ReRAC", href: "https://github.com/re-rac/rerac", text: "A native PC rewrite of Ratchet & Clank in Rust." },
  { title: "Himuro", href: "https://github.com/Mikompilation/Himuro", text: "Fatal Frame decompilation, with PS2 compiler research many projects build on." },
];

/** A column of links with a line about each: easier to scan than a grid of tiles. */
function ResourceList({ title, items }: { title: string; items: Resource[] }) {
  return (
    <div className="surface px-5 pb-2 pt-4 sm:px-6">
      <h3 className={listTitle}>{title}</h3>
      <ul>
        {items.map(({ title, href, text }) => (
          <li key={href} className="border-t border-line first:border-0">
            <a href={href} className="group flex items-start gap-3 py-3 no-underline">
              <span className="min-w-0">
                <b className="block font-orbitron text-[15px] font-bold text-gold transition-colors group-hover:text-amber">{title}</b>
                <span className="mt-0.5 block text-sm leading-snug text-soft">{text}</span>
              </span>
              {ARROW}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Resources() {
  // Each project's own introduction, so newcomers start from the people who know that game best.
  const guides = PROJECTS.flatMap((p) =>
    p.guide && p.repo ? [{ title: p.name, href: p.guide.url, text: `${p.guide.label} · ${p.repo.split("/")[1]}` }] : [],
  );
  return (
    <Section id="resources" title="Resources" sub="Tools, guides and related work that decompilation projects like these rely on.">
      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-3">
        <ResourceList title="Project guides" items={guides} />
        <ResourceList title="Tools" items={TOOLS} />
        <ResourceList title="Related community work" items={COMMUNITY} />
      </div>
    </Section>
  );
}

/** Every listed game with the projects working on it (from PROJECTS and ALSO_WORKED_ON), so it never goes stale. */
function OtherTitles() {
  const games = PROJECTS.map((g) => ({
    game: g,
    projects: [{ repo: g.repo, region: g.region }, ...ALSO_WORKED_ON.filter((o) => o.game === g.id)],
  }));
  return (
    <div className="grid gap-4 pb-5 text-soft">
      <p>
        Yes, and every one of them by an <b className="font-semibold text-lav">independent team</b>. Each project has its own people, its own
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

export function Faq() {
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

export function AiView() {
  return (
    <Section id="ai" title="Our view on AI">
      <aside className="mb-8 mt-5 max-w-[760px] border-l-4 border-brand py-1.5 pl-5 font-audiowide text-[clamp(22px,3.4vw,32px)] leading-tight text-lav">
        A wrong guess costs nothing and never ships. <em className="not-italic text-amber">The compiler is the judge.</em>
      </aside>
      <article className="max-w-[760px] text-base text-body sm:text-[17px] [&_h3]:mb-1 [&_h3]:mt-7 [&_h3]:font-orbitron [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gold [&_p]:mb-3.5">
        <p>Parts of this project are built with the help of AI coding assistants. We think that should be stated plainly rather than hidden, so here is how we use it and where we draw the line.</p>
        <h3>What it does here</h3>
        <p>Matching decompilation is unusually well suited to machine help because success is objective. A function either compiles to the original bytes or it does not. An assistant proposes C, the compiler judges it, and that result is the only thing that counts. A wrong guess costs nothing and never ships.</p>
        <h3>What it does not do</h3>
        <p>AI does not decide what the project is. People set the goals, review what lands, and answer for it. Every accepted function is reproducible from the public toolchain, so anyone can check the work without trusting the tool that helped write it.</p>
        <h3>Our rules</h3>
        <p>Plain, readable C only, with no tricks to force a match. No game assets or dumps are fed to any tool in a way that would end up in the repository. Contributors are welcome to use or avoid AI as they choose, and are responsible for what they submit either way.</p>
        <h3>Why we are open about it</h3>
        <p>Preservation work depends on trust. Saying how the work is done, and making it verifiable, lets people judge it on the evidence. We would rather explain a tool than have anyone wonder about it.</p>
      </article>
    </Section>
  );
}

export function Legal() {
  return (
    <section id="legal" className="pb-16 pt-4">
      <div data-reveal className="surface p-5 text-[15px] text-body sm:p-6">
        <h2 className="mb-2 font-audiowide text-[22px] text-lav">Legal</h2>
        <p className="mb-3">
          OpenRAC is an independent, unofficial fan project. It is not affiliated with, endorsed by or sponsored by the owners of the games or their publishers.
          &quot;Ratchet &amp; Clank&quot; and related names, characters and logos are trademarks of their respective owners and are used here only to identify the games this project studies.
        </p>
        <p>
          The source of this website contains no copyrighted game assets, no game code and no game binaries, and neither do the decompilation repositories it links to.
          A legally obtained copy of the game is required to use any tool from those projects. See LEGAL.md in the repository for details.
        </p>
      </div>
    </section>
  );
}
