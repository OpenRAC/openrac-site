import type { ReactNode } from "react";
import { ALSO_WORKED_ON, DISCORD_URL, PROJECTS, type ProjectId } from "@/lib/projects";
import type { Commit } from "@/lib/activity";
import Section from "./Section";

function Cards({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] sm:gap-5">
      {items.map(([title, text], i) => (
        <div key={title} className="surface relative overflow-hidden p-5 sm:p-6">
          <span aria-hidden className="absolute -top-1.5 right-3.5 font-orbitron text-[72px] font-bold leading-none text-brand/15 sm:text-[84px]">{i + 1}</span>
          <h3 className="relative mb-2 font-orbitron text-[19px] font-bold text-gold">{title}</h3>
          <p className="relative text-soft">{text}</p>
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
          ["Say hello", "Join the Discord, tell us what you are curious about and pick a starting point with people who have done it before."],
          ["Set up", "Follow the setup guide of the project you like. You will need your own legally obtained copy of the game, we never provide one."],
          ["Pick a function", "Take a small one, get it to compile to the same bytes and open a pull request. Reviews, notes and tooling help just as much."],
        ]}
      />
      <div className="mt-7 grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
        <a href={DISCORD_URL} className="btn btn-primary">
          Join our Discord
        </a>
        {PROJECTS.filter((p) => p.repo).map((p) => (
          <a key={p.id} href={p.contributing ?? `https://github.com/${p.repo}`} className="btn btn-sm justify-start sm:justify-center">
            Contribute to {p.name}
          </a>
        ))}
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

function ResourceGrid({ title, items }: { title: string; items: Resource[] }) {
  return (
    <div>
      <h3 className="mb-3 font-orbitron text-sm font-bold uppercase tracking-[.2em] text-lav">{title}</h3>
      <div className="grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] sm:gap-3.5">
        {items.map(({ title, href, text }) => (
          <a key={href} href={href} className="surface surface-link block px-5 py-4 no-underline sm:py-[18px]">
            <b className="mb-1 block font-orbitron text-base font-bold text-gold">{title}</b>
            <span className="text-sm text-soft">{text}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function Resources() {
  // Each project's own introduction, so newcomers start from the people who know that game best.
  const guides = PROJECTS.flatMap((p) =>
    p.guide && p.repo ? [{ title: p.guide.label, href: p.guide.url, text: `${p.name} · ${p.repo.split("/")[1]}` }] : [],
  );
  return (
    <Section id="resources" title="Resources" sub="Tools, guides and related work that decompilation projects like these rely on.">
      <div className="grid gap-9">
        <ResourceGrid title="Project guides" items={guides} />
        <ResourceGrid title="Tools" items={TOOLS} />
        <ResourceGrid title="Related community work" items={COMMUNITY} />
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
          <details key={q} className="rounded-2xl border border-line bg-panel px-4 transition-colors open:border-brand open:bg-panel-hi sm:px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3.5 font-semibold">
              {q}
              <span aria-hidden className="plus flex-none font-orbitron text-[26px] leading-none text-brand transition-transform">+</span>
            </summary>
            {typeof a === "string" ? <p className="pb-4 text-soft">{a}</p> : a}
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
      <div data-reveal className="rounded-2xl border border-brand/70 bg-gradient-to-br from-brand/10 to-brand/[0.03] p-5 text-body sm:p-6">
        <h2 className="mb-2 font-audiowide text-[22px]">Legal</h2>
        <p className="mb-3">
          OpenRAC is an independent, unofficial fan project. It is not affiliated with, endorsed by or sponsored by Sony Interactive Entertainment or Insomniac Games.
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
