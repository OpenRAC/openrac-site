import { withoutSince } from "@/lib/modDocs/logic";
import type { CppMember, Release } from "@/lib/modDocs/types";
import Code from "./Code";
import { Paragraphs } from "./CommentText";
import Entry, { Examples } from "./Entry";
import Since from "./Since";

/** A comment's text as blocks: lines indented by two spaces or more are code (as the SDK's generator reads them). */
export function proseAndCode(text: string): { code: boolean; text: string }[] {
  const out: { code: boolean; text: string }[] = [];
  for (const line of text.split("\n")) {
    const code = line.startsWith("  ");
    const last = out[out.length - 1];
    if (last && last.code === code) last.text += `\n${code ? line.slice(2) : line}`;
    else out.push({ code, text: code ? line.slice(2) : line });
  }
  return out.map((b) => ({ ...b, text: b.code ? b.text.replace(/\s+$/, "") : b.text.trim() })).filter((b) => b.text);
}

export function Intro({ text, lang }: { text: string; lang: string }) {
  return (
    <>
      {proseAndCode(text).map((b, i) => (b.code ? <Code key={i} code={b.text} lang={lang} /> : <Paragraphs key={i} text={b.text.replace(/\n(?!\n)/g, " ")} />))}
    </>
  );
}

/** Overloads (several members of one name, one after another) shown as one entry. */
function groups(members: CppMember[]): CppMember[][] {
  const out: CppMember[][] = [];
  for (const m of members) {
    const last = out[out.length - 1];
    if (last && last[0].name === m.name && (!m.about || m.about === last[0].about)) last.push(m);
    else out.push([m]);
  }
  return out;
}

export function cppToc(r: Release) {
  return (r.cpp?.classes ?? []).map((c) => ({ id: `openrac::${c.name}`, label: `openrac::${c.name}` })).concat(r.cpp?.macros.length ? [{ id: "macros", label: "Macros" }] : []);
}

/** The C++ layer (mod.hpp): its classes, their public members, and its macros. */
export default function CppReference({ r }: { r: Release }) {
  const cpp = r.cpp!;
  const seen = new Set<string>();
  return (
    <div className="grid gap-10">
      <details className="surface p-4">
        <summary className="cursor-pointer list-none font-semibold text-hi">
          <span className="plus mr-2 inline-block text-amber transition-transform">+</span>About this header
        </summary>
        <div className="mt-3 grid gap-3">
          <Intro text={cpp.intro} lang="cpp" />
        </div>
      </details>
      {cpp.classes.map((c) => (
        <section key={c.name} id={`openrac::${c.name}`} className="grid scroll-mt-20 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-[21px] font-bold text-hi">openrac::{c.name}</h2>
            <Since since={c.about.match(/Since (\d+\.\d+)/)?.[1]} iface={r.interface} />
          </div>
          {c.template && <Code code={c.template} lang="cpp" copy={false} className="my-0" />}
          <Paragraphs text={withoutSince(c.about)} className="max-w-[760px]" />
          {groups(c.members).map((g) => {
            const id = `openrac::${c.name}::${g[0].name}`;
            const fresh = !seen.has(id);
            seen.add(id);
            const about = g.map((m) => m.about).find(Boolean) ?? "";
            return (
              <Entry key={g.map((m) => m.decl).join()} id={fresh ? id : `${id}-${seen.size}`} title={g[0].name === c.name ? `${c.name} (constructor)` : `${g[0].name}()`} badges={<Since since={g[0].since} iface={r.interface} />}>
                <Code code={g.map((m) => `${m.decl};`).join("\n")} lang="cpp" title={g.length > 1 ? "Overloads" : "Declaration"} copy={false} className="my-0" />
                <Paragraphs text={withoutSince(about)} />
                <Examples examples={g.flatMap((m) => m.examples ?? []).slice(0, 2)} guides={r.guides} />
              </Entry>
            );
          })}
        </section>
      ))}
      {cpp.macros.length > 0 && (
        <section id="macros" className="grid scroll-mt-20 gap-3">
          <h2 className="font-orbitron text-[21px] font-bold text-hi">Macros</h2>
          {cpp.macros.map((m) => (
            <Entry key={m.name} id={m.name.split("(")[0]} title={m.name} badges={<Since since={m.about.match(/Since (\d+\.\d+)/)?.[1]} iface={r.interface} />}>
              <Paragraphs text={withoutSince(m.about)} />
              <Examples examples={m.examples} guides={r.guides} />
            </Entry>
          ))}
        </section>
      )}
    </div>
  );
}
