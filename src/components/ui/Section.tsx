import type { ReactNode } from "react";
import SectionArt from "@/components/ui/SectionArt";

/** The small uppercase heading over a list or panel inside a section. */
export const SUBHEADING = "mb-2 font-orbitron text-[12px] font-bold uppercase tracking-[.2em] text-hi";

/**
 * A section with the shared heading style and its drawing (SectionArt). Reveals on scroll. A link to it stops with its
 * heading 20 px under the header, not at the top of its padding (the negative scroll margin).
 */
export default function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} data-reveal="fade" className="scroll-mt-[-12px] py-8 sm:scroll-mt-[-28px] sm:py-12">
      <div className="mb-2 flex items-center gap-3 sm:gap-5">
        <SectionArt id={id} className="h-12 w-auto sm:h-16" />
        <h2 className="min-w-0 leading-tight bg-gradient-to-r from-text to-soft bg-clip-text font-audiowide text-[clamp(24px,3.4vw,32px)] text-transparent">{title}</h2>
      </div>
      {sub && <p className="mb-4 max-w-[760px] text-dim sm:mb-5">{sub}</p>}
      {children}
    </section>
  );
}
