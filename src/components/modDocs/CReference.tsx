import { callShape, namedConstants, splitReturns, withoutSince } from "@/lib/modDocs/logic";
import type { CGroup, CItem, CMember, Release } from "@/lib/modDocs/types";
import Code from "./Code";
import CommentText, { Brief, Paragraphs } from "./CommentText";
import Entry, { Examples, Part } from "./Entry";
import Since, { Tag } from "./Since";

/** Every name the C page documents, to its anchor: comments link the names they mention. */
export function cNames(r: Release): Map<string, string> {
  const out = new Map<string, string>();
  for (const s of r.c.sections)
    for (const item of s.items) {
      if (item.kind === "constants") for (const c of item.items) out.set(c.name, `#${c.name}`);
      else {
        out.set(item.name, `#${item.name}`);
        if (item.kind === "struct") for (const g of item.groups) for (const m of g.members) out.set(`${item.name}.${m.name}`, `#${item.name}.${m.name}`);
      }
    }
  return out;
}

export function cToc(r: Release) {
  return r.c.sections.map((s, i) => ({ id: sectionId(s.title, i), label: s.title }));
}

const sectionId = (title: string, i: number) => `s-${i}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

/** "Only during openrac_mod_load": a call a mod makes while it loads, and nowhere else. */
const LOAD_ONLY = /Only (?:during|in) openrac_mod_load/;

/** A member as a declaration to read: a function on one line, or one parameter a line when long. */
function memberSig(m: CMember): string {
  if (m.kind !== "function") return `${m.decl};`;
  const params = m.params.map((p) => `${p.type} ${p.name}`.trim());
  const one = `${m.returns} ${m.name}(${params.join(", ")});`;
  return one.length <= 78 ? one : `${m.returns} ${m.name}(\n    ${params.join(",\n    ")}\n);`;
}

/** The constants a comment names, with OPENRAC_HOOK_* written out as every one of them. */
function constantsIn(text: string, names: Map<string, string>): string[] {
  const out = new Set<string>();
  for (const n of namedConstants(text)) if (names.has(n)) out.add(n);
  for (const m of text.matchAll(/\b(OPENRAC_[A-Z0-9_]+_)\*/g)) for (const n of names.keys()) if (n.startsWith(m[1]) && !n.includes(".")) out.add(n);
  return [...out];
}

function ApiGroup({ g, r, names }: { g: CGroup; r: Release; names: Map<string, string> }) {
  const first = g.members[0];
  const about = withoutSince(g.about);
  const { text, returns } = splitReturns(about);
  const results = constantsIn(about, names).filter((n) => /^OPENRAC_[A-Z0-9_]+$/.test(n) && !/^OPENRAC_(MOD_API|KEY_COUNT)/.test(n));
  const single = g.members.length === 1 ? first : null;
  const examples = g.members.flatMap((m) => m.examples ?? []);
  const sig = g.members.map(memberSig).join("\n");
  return (
    <Entry
      id={`openrac_api.${first.name}`}
      ids={g.members.map((m) => `openrac_api.${m.name}`)}
      title={g.members.map((m) => (m.kind === "function" ? `${m.name}()` : m.name)).join(", ")}
      badges={
        <>
          <Since since={g.since} iface={r.interface} />
          {LOAD_ONLY.test(about) && <Tag tone="warn">Only while loading</Tag>}
          {first.kind === "field" && <Tag>Value</Tag>}
        </>
      }
    >
      <Code code={single?.kind === "function" ? `${sig}\n\n// how a call looks\n${callShape(single)}` : sig} lang="c" title={first.kind === "function" ? "Signature" : "Field"} copy={false} className="my-0" />
      <Paragraphs text={text} names={names} />
      {single?.kind === "function" && single.params.length > 0 && (
        <Part label="Parameters">
          <ul className="grid gap-1">
            {single.params.map((p) => (
              <li key={p.name}>
                <code className="text-gold">{p.name}</code> <span className="text-dim">({p.type})</span>
                {p.name === "mod" && p.type === "openrac_mod*" ? <span>: your mod&apos;s handle, as openrac_mod_load got it.</span> : null}
              </li>
            ))}
          </ul>
        </Part>
      )}
      {(returns || (single?.kind === "function" && single.returns !== "void")) && (
        <Part label="Returns">
          {returns ? <CommentText text={returns} names={names} /> : <code className="text-gold">{single?.kind === "function" ? single.returns : ""}</code>}
        </Part>
      )}
      {results.length > 0 && (
        <Part label={results.some((n) => n.startsWith("OPENRAC_HOOK_")) ? "Results and errors" : "Constants it uses"}>
          <span className="flex flex-wrap gap-1.5">
            {results.map((n) => (
              <a key={n} href={names.get(n)} className="rounded-md bg-white/[.06] px-1.5 py-0.5 font-mono text-[12.5px] text-amber no-underline hover:bg-white/[.12]">
                {n}
              </a>
            ))}
          </span>
        </Part>
      )}
      <Examples examples={examples.slice(0, 2)} guides={r.guides} />
    </Entry>
  );
}

/** Runs of constants one after another, without text of their own, read as one table. */
function mergeConstants(items: CItem[]): CItem[] {
  const out: CItem[] = [];
  for (const it of items) {
    const prev = out[out.length - 1];
    if (it.kind === "constants" && prev?.kind === "constants" && !it.about) out[out.length - 1] = { ...prev, items: [...prev.items, ...it.items] };
    else out.push(it);
  }
  return out;
}

function Item({ item, r, names }: { item: CItem; r: Release; names: Map<string, string> }) {
  if (item.kind === "constants") {
    return (
      <div className="d-card overflow-hidden">
        {item.about && (
          <div className="border-b border-line px-4 py-3">
            <Paragraphs text={withoutSince(item.about)} names={names} />
          </div>
        )}
        <div tabIndex={0} className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="text-[12.5px] font-medium text-dim">
              <tr>
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="px-4 py-2 font-semibold">Value</th>
                <th className="px-4 py-2 font-semibold">What it is</th>
              </tr>
            </thead>
            <tbody>
              {item.items.map((c) => (
                <tr key={c.name} id={c.name} className="scroll-mt-20 border-t border-line target:bg-amber/10">
                  <td className="whitespace-nowrap px-4 py-2 align-top font-mono text-[13px] text-gold">{c.name}</td>
                  <td className="max-w-[14rem] px-4 py-2 align-top font-mono text-[13px] text-hi [overflow-wrap:anywhere]">{c.values.join(" or ")}</td>
                  <td className="min-w-[18rem] px-4 py-2 align-top text-body">
                    <Since since={c.since} iface={r.interface} /> <Brief text={withoutSince(c.about)} names={names} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (item.kind === "struct") {
    if (item.name === "openrac_api") {
      return (
        <div id="openrac_api" className="grid scroll-mt-20 gap-3">
          <Paragraphs text={withoutSince(item.about)} names={names} />
          {item.groups.map((g, i) => (
            <ApiGroup key={i} g={g} r={r} names={names} />
          ))}
        </div>
      );
    }
    return (
      <Entry id={item.name} title={`struct ${item.name}`} badges={<Since since={item.since} iface={r.interface} />}>
        <Paragraphs text={withoutSince(item.about)} names={names} />
        <div tabIndex={0} className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-[14px]">
            <thead className="text-[12.5px] font-medium text-dim">
              <tr>
                <th className="px-3 py-2 font-semibold">Member</th>
                <th className="px-3 py-2 font-semibold">What it is</th>
              </tr>
            </thead>
            <tbody>
              {item.groups.flatMap((g) =>
                g.members.map((m, j) => (
                  <tr key={m.name} id={`${item.name}.${m.name}`} className="scroll-mt-20 border-t border-line target:bg-amber/10">
                    <td className="px-3 py-2 align-top font-mono text-[13px] text-hi [overflow-wrap:anywhere]">{m.decl}</td>
                    <td className="px-3 py-2 align-top text-body">{j === 0 ? <Brief text={withoutSince(g.about)} names={names} /> : <span className="text-dim">(as above)</span>}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <Examples examples={item.groups.flatMap((g) => g.members.flatMap((m) => m.examples ?? [])).slice(0, 2)} guides={r.guides} />
      </Entry>
    );
  }
  const decl = item.kind === "macro" ? `#define ${item.name}(${item.params.join(", ")})${item.body.includes("\n") ? " ..." : ` ${item.body}`}` : item.decl;
  return (
    <Entry
      id={item.name}
      title={item.kind === "macro" ? `${item.name}()` : item.name}
      badges={
        <>
          <Since since={item.since} iface={r.interface} />
          <Tag>{item.kind === "callback" ? "Callback type" : item.kind === "macro" ? "Macro" : "Type"}</Tag>
        </>
      }
    >
      <Code code={decl} lang="c" title="Declaration" copy={false} className="my-0" />
      <Paragraphs text={withoutSince(item.about)} names={names} />
      <Examples examples={item.examples} guides={r.guides} />
    </Entry>
  );
}

/** The C interface (openrac_mod.h) as its own sections, items and table. */
export default function CReference({ r }: { r: Release }) {
  const names = cNames(r);
  return (
    <div className="grid gap-8">
      {r.c.sections.map((s, i) => (
        <section key={i} id={sectionId(s.title, i)} className="grid scroll-mt-20 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[19px] font-semibold text-hi">{s.title || "The interface"}</h2>
            <Since since={s.since} iface={r.interface} />
          </div>
          {s.about && <Paragraphs text={s.about} names={names} className="max-w-[760px]" />}
          {mergeConstants(s.items).map((item, j) => (
            <Item key={j} item={item} r={r} names={names} />
          ))}
        </section>
      ))}
    </div>
  );
}
