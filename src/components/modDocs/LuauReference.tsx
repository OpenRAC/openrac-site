import type { Release } from "@/lib/modDocs/types";
import Code from "./Code";
import { InlineMarkdown, type LinkContext } from "./DocMarkdown";
import Entry, { Examples } from "./Entry";
import Since, { Tag } from "./Since";

export function luauToc() {
  return [{ id: "openrac", label: "The openrac table" }, { id: "types", label: "Types" }];
}

/** The `openrac` table a script mod sees (types/<game>.d.luau), with what scripts.md says of each member. */
export default function LuauReference({ r, ctx }: { r: Release; ctx: LinkContext }) {
  const luau = r.luau!;
  return (
    <div className="grid gap-10">
      <section id="openrac" className="grid scroll-mt-20 gap-3">
        <h2 className="font-orbitron text-[21px] font-bold text-hi">The openrac table</h2>
        <p className="max-w-[760px] text-[15px] text-body">
          A script mod sees one global, <code className="text-gold">openrac</code>, and the safe parts of Luau&apos;s library. For autocomplete, point your editor&apos;s Luau language server at the SDK&apos;s{" "}
          <code className="text-gold">{luau.file}</code>.
        </p>
        {luau.members.map((m) => {
          const name = m.global ? m.name : `openrac.${m.name}`;
          const isFn = m.type.trim().startsWith("(");
          return (
            <Entry key={name} id={name} title={isFn ? `${name}()` : name} badges={<><Since since={m.since} iface={r.interface} />{/experimental/i.test(m.about) && <Tag tone="warn">Experimental</Tag>}</>}>
              <Code code={`${m.global ? "" : "openrac."}${m.name}: ${m.type}`} lang="luau" title="Type" copy={false} className="my-0" />
              {m.about && (
                <p className="text-[15px] leading-relaxed text-body">
                  {m.usage && (
                    <>
                      <InlineMarkdown ctx={ctx}>{m.usage}</InlineMarkdown>:{" "}
                    </>
                  )}
                  <InlineMarkdown ctx={ctx}>{m.about}</InlineMarkdown>
                </p>
              )}
              <Examples examples={m.examples} guides={r.guides} />
            </Entry>
          );
        })}
      </section>
      <section id="types" className="grid scroll-mt-20 gap-3">
        <h2 className="font-orbitron text-[21px] font-bold text-hi">Types</h2>
        {luau.types.map((t) => (
          <div key={t.name} id={t.name} className="scroll-mt-20">
            <h3 className="font-mono text-[16px] font-semibold text-gold">{t.name}</h3>
            {t.about && <p className="mt-1 text-[14.5px] text-body">{t.about}</p>}
            <Code code={t.text} lang="luau" />
          </div>
        ))}
      </section>
    </div>
  );
}
