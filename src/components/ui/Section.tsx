import type { ReactNode } from "react";
import SectionArt from "@/components/ui/SectionArt";

/** The small uppercase heading over a list or panel inside a section. */
export const SUBHEADING = "mb-2 font-orbitron text-[12px] font-bold uppercase tracking-[.2em] text-hi";

/**
 * A section with the shared heading style and its drawing (SectionArt). Reveals on scroll. A link to it stops with its
 * heading 20 px under the header, not at the top of its padding (the negative scroll margin).
 */
export default function Section({ id, title, sub, compact, children }: { id: string; title: string; sub?: string; compact?: boolean; children: ReactNode }) {
  // `compact`: the same look with less air around it, for pages that list many things (/mods).
  return (
    <section id={id} data-reveal="fade" className={compact ? "scroll-mt-[-20px] py-8 sm:scroll-mt-[-32px] sm:py-12" : "scroll-mt-[-28px] py-12 sm:scroll-mt-[-52px] sm:py-[72px]"}>
      <div className="mb-2 flex items-center gap-3 sm:gap-5">
        <SectionArt id={id} className={compact ? "h-12 w-auto sm:h-16" : "h-14 w-auto sm:h-[76px]"} />
        <h2 className={`min-w-0 leading-tight bg-gradient-to-r from-text to-soft bg-clip-text font-audiowide text-transparent ${compact ? "text-[clamp(24px,3.4vw,32px)]" : "text-[clamp(26px,4vw,38px)]"}`}>{title}</h2>
      </div>
      {sub && <p className={`max-w-[760px] text-dim ${compact ? "mb-4 sm:mb-5" : "mb-6 sm:mb-8"}`}>{sub}</p>}
      {children}
    </section>
  );
}
