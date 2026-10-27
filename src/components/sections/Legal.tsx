/** The legal notice at the bottom of the home page (linked from the footer as /#legal). */
export default function Legal() {
  return (
    <section id="legal" className="pb-16 pt-4">
      <div data-reveal className="surface p-5 text-[15px] text-body sm:p-6">
        <h2 className="mb-2 font-audiowide text-[22px] text-hi">Legal</h2>
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
