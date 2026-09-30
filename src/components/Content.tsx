import { DISCORD_URL } from "@/lib/projects";
import type { Commit } from "@/lib/activity";
import Section from "./Section";

const card =
  "group relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#20202c] to-ink p-6 transition hover:-translate-y-1 hover:border-brand";

function Cards({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
      {items.map(([title, text], i) => (
        <div key={title} className={card}>
          <span aria-hidden className="absolute -top-1.5 right-3.5 font-orbitron text-[84px] font-bold leading-none text-brand/15">{i + 1}</span>
          <h3 className="relative mb-2 font-orbitron text-[19px] font-bold text-gold">{title}</h3>
          <p className="relative text-soft">{text}</p>
        </div>
      ))}
    </div>
  );
}

const btn = "rounded-full border border-lav/40 bg-white/[0.03] px-5 py-2.5 font-semibold text-[#e8f0ff] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(0_0_0/0.4)]";

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
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={DISCORD_URL} className="rounded-full border border-amber bg-gradient-to-b from-amber to-[#ff8a00] px-5 py-2.5 font-semibold text-[#1a0d00] shadow-[0_6px_24px_rgb(255_138_0/0.35)] transition hover:-translate-y-0.5 hover:brightness-110">
          Join our Discord
        </a>
        <a href="https://github.com/Lynder063/rac1-decomp/blob/main/CONTRIBUTING.md" className={btn}>Contribute to Ratchet &amp; Clank</a>
        <a href="https://github.com/vetusmagnus/ratchet-uya-decomp/blob/main/CONTRIBUTING.md" className={btn}>Contribute to Up Your Arsenal</a>
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

export function Activity({ commits }: { commits: Commit[] }) {
  return (
    <Section id="activity" title="Recent activity" sub="The latest commits across the tracked projects, straight from GitHub.">
      {commits.length === 0 ? (
        <p className="text-dim">Could not load activity right now. See the repositories on GitHub.</p>
      ) : (
        <ul className="grid max-w-[820px] gap-2.5">
          {commits.map((c) => (
            <li key={c.url} className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 rounded-xl border border-line bg-panel px-4 py-3">
              <span className={`flex-none rounded-full px-2.5 py-1 font-orbitron text-[11px] font-semibold tracking-wider ${c.projectId === "uya" ? "bg-brand/20 text-[#ffc35a]" : "bg-lav/15 text-lav"}`}>{c.project}</span>
              <a href={c.url} className="order-3 basis-full truncate text-[#e3e9ff] no-underline hover:text-amber sm:order-none sm:basis-0 sm:flex-1">{c.message}</a>
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

const RESOURCES = [
  ["decomp.dev", "https://decomp.dev", "Progress tracking for decompilation projects."],
  ["decomp.me", "https://decomp.me", "Collaborative platform for matching single functions."],
  ["objdiff", "https://github.com/encounter/objdiff", "Compares compiled output against the original, instruction by instruction."],
  ["splat", "https://github.com/ethteck/splat", "Splits a binary into code and data segments."],
  ["RaC1 workflow", "https://github.com/Lynder063/rac1-decomp/blob/main/docs/WORKFLOW.md", "How a function goes from assembly to a match in this project."],
  ["Legal scope", "https://github.com/Lynder063/rac1-decomp/blob/main/LEGAL.md", "Exactly what the repositories do and do not contain."],
] as const;

export function Resources() {
  return (
    <Section id="resources" title="Resources" sub="Tools and reading that decompilation projects like ours rely on.">
      <div className="grid gap-3.5 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
        {RESOURCES.map(([title, href, text]) => (
          <a key={title} href={href} className="block rounded-[14px] border border-line bg-gradient-to-br from-[#20202c] to-ink px-5 py-[18px] no-underline transition hover:-translate-y-0.5 hover:border-brand">
            <b className="mb-1 block font-orbitron text-base font-bold text-gold">{title}</b>
            <span className="text-sm text-soft">{text}</span>
          </a>
        ))}
      </div>
    </Section>
  );
}

const FAQ = [
  ["Is this a port or a way to play the game for free?", "No. OpenRAC contains no game assets, no game code and no game binaries. To build anything you need your own legally obtained copy of the game."],
  ["How is this different from OpenGOAL?", "OpenGOAL targets a different game and toolchain. OpenRAC follows the same spirit: understand a classic game, document it, and make it possible to study and preserve. Our method is byte-matching decompilation."],
  ["Will there be a PC port?", "That is a possible long-term outcome of a finished decompilation, but it is not a current goal. Right now the goal is a complete, accurate source reconstruction of each game, one title at a time."],
  ["What do “matched” and “percent” mean?", "A function is matched when our C compiles to exactly the same instructions as the original. The percentages are matched functions divided by all functions, and matched code divided by all code. Small functions get matched first, so the code figure is the more honest one."],
  ["Are the other titles being worked on?", "Ratchet & Clank and Up Your Arsenal have active community projects. Going Commando is listed but not started. More titles will be added here as projects appear."],
  ["How can I help?", "Read CONTRIBUTING.md on GitHub. Reviewing, documenting function behavior, and improving tooling all help, not just writing matches."],
  ["Do you accept assets or dumps from the game?", "No. Please do not upload or link game files, dumps or other copyrighted material to issues, pull requests or the community channels."],
] as const;

export function Faq() {
  return (
    <Section id="faq" title="FAQ" sub="The short answers.">
      <div className="grid gap-2.5">
        {FAQ.map(([q, a]) => (
          <details key={q} className="rounded-[14px] border border-line bg-panel px-5 transition open:border-brand open:bg-panel-hi">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[18px] font-semibold">
              {q}
              <span aria-hidden className="plus flex-none font-orbitron text-[26px] leading-none text-brand transition-transform">+</span>
            </summary>
            <p className="pb-4 text-soft">{a}</p>
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
      <article className="max-w-[760px] text-[17px] text-[#c3cdea] [&_h3]:mb-1 [&_h3]:mt-7 [&_h3]:font-orbitron [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gold [&_p]:mb-3.5">
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
    <section id="legal" className="pb-16">
      <div data-reveal className="rounded-2xl border border-brand bg-gradient-to-br from-brand/10 to-brand/[0.03] p-[18px] sm:p-6">
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

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink-deep py-8 text-[13px] text-dim">
      <div className="mx-auto max-w-[1080px] px-4">
        <p className="max-w-[820px]">
          OpenRAC · unofficial community project · <a className="text-amber" href="https://github.com/Lynder063/rac1-decomp">GitHub</a> ·{" "}
          <a className="text-amber" href={DISCORD_URL}>Discord</a>
        </p>
        <p className="mt-2 max-w-[820px]">Progress is read from the projects&apos; repositories on the server and refreshed every ten minutes.</p>
      </div>
    </footer>
  );
}
