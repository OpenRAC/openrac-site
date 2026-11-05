import type { ReactNode } from "react";
import type { Example } from "@/lib/modDocs/types";
import Code from "./Code";

/** Where an example comes from, said plainly: a guide's name, or the SDK's file. */
export function exampleSource(from: string, guides: { slug: string; title: string }[]): string {
  if (from.startsWith("guide:")) {
    const g = guides.find((x) => x.slug === from.slice(6));
    return `From the guide “${g ? g.title.replace(/`/g, "").split(":")[0] : from.slice(6)}”`;
  }
  return `From ${from}`;
}

/** One documented item: its name and badges, then what it is, in a raised panel an anchor can land on. */
export default function Entry({ id, ids = [], title, badges, children }: { id: string; ids?: string[]; title: ReactNode; badges?: ReactNode; children: ReactNode }) {
  return (
    <article id={id} className="d-card scroll-mt-20 p-4 target:border-amber">
      {ids.filter((x) => x !== id).map((x) => (
        <span key={x} id={x} className="block scroll-mt-20" aria-hidden />
      ))}
      <header className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h3 className="min-w-0 font-mono text-[16px] font-semibold text-gold [overflow-wrap:anywhere]">
          <a href={`#${id}`} className="no-underline hover:underline">
            {title}
          </a>
        </h3>
        {badges}
      </header>
      <div className="grid gap-3">{children}</div>
    </article>
  );
}

/** A labelled part of an entry: Parameters, Returns, ... */
export function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[12.5px] font-semibold text-dim">{label}</p>
      <div className="text-[14.5px] leading-relaxed text-body">{children}</div>
    </div>
  );
}

/** Code to learn from, folded until asked for: how a call looks, and real code of the SDK that uses the item. */
export function Examples({ shape, shapeLang = "c", examples = [], guides }: { shape?: string; shapeLang?: string; examples?: Example[]; guides: { slug: string; title: string }[] }) {
  if (!shape && !examples.length) return null;
  const n = examples.length;
  return (
    <details className="group/ex rounded-lg border border-line">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-[14px] font-semibold text-soft hover:text-hi">
        <span className="plus text-amber transition-transform">+</span>
        {n ? `Example${n > 1 ? "s" : ""} (${n})` : "How a call looks"}
        {n > 0 && shape ? <span className="font-normal text-dim">and how a call looks</span> : null}
      </summary>
      <div className="border-t border-line px-3 pb-1">
        {shape && <Code code={shape} lang={shapeLang} title="How a call looks" />}
        {examples.map((e, i) => (
          <Code key={i} code={e.code} lang={e.lang} title={exampleSource(e.from, guides)} />
        ))}
      </div>
    </details>
  );
}
