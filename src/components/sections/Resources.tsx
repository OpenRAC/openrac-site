import { Arrow } from "@/components/ui/icons";
import Section, { SUBHEADING } from "@/components/ui/Section";
import { listName, PROJECTS } from "@/lib/projects";

/** "Resources": each project's guide, the tools the projects use, and related community work. */
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
      <h3 className={SUBHEADING}>{title}</h3>
      <ul>
        {items.map(({ title, href, text }) => (
          <li key={href} className="border-t border-line first:border-0">
            <a href={href} className="group flex items-start gap-3 py-3 no-underline">
              <span className="min-w-0">
                <b className="block font-orbitron text-[15px] font-bold text-gold transition-colors group-hover:text-amber">{title}</b>
                <span className="mt-0.5 block text-sm leading-snug text-soft">{text}</span>
              </span>
              <Arrow />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Three lists side by side: project guides, tools, related community work. */
export default function Resources() {
  // Each project's own introduction, so newcomers start from the people who know that game best.
  const guides = PROJECTS.flatMap((p) =>
    p.guide && p.repo ? [{ title: listName(p), href: p.guide.url, text: `${p.guide.label} · ${p.repo.split("/")[1]}` }] : [],
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
