import type { ReactNode } from "react";

/** Numbered section with the shared heading style. Reveals on scroll. */
export default function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} data-reveal className="py-14 sm:py-[72px]">
      <span className="sec-num mb-1.5 block font-orbitron text-[13px] font-bold tracking-[.3em] text-brand after:mt-2 after:block after:h-[3px] after:w-11 after:rounded-sm after:bg-brand after:content-['']" />
      <h2 className="mb-2 bg-gradient-to-r from-lav to-[#9ca1d4] bg-clip-text font-audiowide text-[clamp(26px,4vw,38px)] text-transparent">{title}</h2>
      {sub && <p className="mb-6 text-dim">{sub}</p>}
      {children}
    </section>
  );
}
