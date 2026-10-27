import Section from "@/components/ui/Section";

/** "Our view on AI": how the projects use AI assistants and where the line is. */
export default function AiView() {
  return (
    <Section id="ai" title="Our view on AI">
      <aside className="mb-8 mt-5 max-w-[760px] border-l-4 border-brand py-1.5 pl-5 font-audiowide text-[clamp(18px,2.6vw,24px)] leading-snug text-hi">
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
