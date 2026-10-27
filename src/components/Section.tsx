import type { ReactNode } from "react";

/**
 * Numbered section with the shared heading style. Reveals on scroll. A link to it stops with its
 * number 20 px under the header, not at the top of its padding (the negative scroll margin).
 */
export default function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} data-reveal="fade" className="scroll-mt-[-28px] py-12 sm:scroll-mt-[-52px] sm:py-[72px]">
      <span className="sec-num mb-1.5 block font-orbitron text-[13px] font-bold tracking-[.3em] text-brand after:mt-2 after:block after:h-[3px] after:w-11 after:rounded-sm after:bg-brand after:content-['']" />
      <h2 className="mb-2 leading-tight bg-gradient-to-r from-text to-soft bg-clip-text font-audiowide text-[clamp(26px,4vw,38px)] text-transparent">{title}</h2>
      {sub && <p className="mb-6 max-w-[760px] text-dim sm:mb-8">{sub}</p>}
      {children}
    </section>
  );
}
