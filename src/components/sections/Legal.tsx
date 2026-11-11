/** The three points of the notice, each a short title and its sentence. */
const POINTS = [
  {
    title: "Unofficial",
    text: "OpenRAC is an independent fan project. It is not affiliated with, endorsed by or sponsored by the owners of the games or their publishers.",
  },
  {
    title: "No game files here",
    text: "This website and the decompilation repositories it links to hold no copyrighted game assets, no game code and no game binaries.",
  },
  {
    title: "Your own copy",
    text: "Every tool from these projects needs a legally obtained copy of the game. Nothing here replaces it.",
  },
];

/** A small gold shield: the mark of the notice. */
function Shield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 flex-none fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** The legal notice at the bottom of the home page (linked from the footer as /#legal): three short points, no panel. */
export default function Legal() {
  return (
    <section id="legal" className="pb-16 pt-6">
      <div data-reveal className="pt-6">
        <div className="mb-6 flex items-center gap-2.5 text-amber">
          <Shield />
          <h2 className="font-audiowide text-[20px] text-hi">Legal</h2>
        </div>
        <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {POINTS.map((p) => (
            <li key={p.title} className="border-l-2 border-amber/40 pl-4">
              <h3 className="mb-1 text-[15px] font-semibold text-hi">{p.title}</h3>
              <p className="text-[14px] leading-relaxed text-soft">{p.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[13px] text-dim">
          &quot;Ratchet &amp; Clank&quot; and related names, characters and logos are trademarks of their respective owners, used here only to name the games these projects study.
        </p>
      </div>
    </section>
  );
}
