import { Fragment } from "react";

/**
 * A comment of the SDK's headers as text: `code` spans, and every name the page documents
 * (OPENRAC_HOOK_OK, openrac_input, openrac_api.hook) linked to it. Not Markdown: the headers
 * write OPENRAC_LOG_* and the like, which Markdown would read as emphasis.
 */
export default function CommentText({ text, names }: { text: string; names?: ReadonlyMap<string, string> }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
          <code key={i} className="rounded bg-white/5 px-1 py-px text-[0.92em] text-gold">
            {linked(part.slice(1, -1), names)}
          </code>
        ) : (
          <Fragment key={i}>{versioned(part, names, i)}</Fragment>
        ),
      )}
    </>
  );
}

/** Interface versions in prose ("since 1.9", "1.2 the keyboard"), not parts of longer numbers. */
const VERSION = /(?<![\w.])(1\.\d{1,2})(?!\w|\.\d)/g;

function Ver({ v }: { v: string }) {
  return <span className="whitespace-nowrap rounded bg-white/5 px-1 font-mono text-[0.88em] text-hi">{v}</span>;
}

function versioned(text: string, names: ReadonlyMap<string, string> | undefined, k: number) {
  const bits = text.split(VERSION);
  if (bits.length === 1) return linked(text, names);
  return bits.map((b, j) => (j % 2 ? <Ver key={`${k}-${j}`} v={b} /> : <Fragment key={`${k}-${j}`}>{linked(b, names)}</Fragment>));
}

/** A history written as one sentence ("1.1 added X, 1.2 Y, 1.3 Z"): its lead and one line per version, or null. */
export function versionHistory(text: string): { lead: string; items: { v: string; text: string }[] } | null {
  const marks = [...text.matchAll(/(?:^|,\s+|\.\s+|;\s+)(1\.\d{1,2})\s+(?=[a-z(])/g)];
  if (marks.length < 3) return null;
  const lead = text.slice(0, marks[0].index + (marks[0][0].startsWith(".") ? 1 : 0)).trim();
  const items = marks.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    return { v: m[1], text: text.slice(start, end).replace(/^added\s+/, "").replace(/[.,;]\s*$/, "").trim() };
  });
  return { lead, items };
}

/** A comment that is short enough to read at a glance: its first sentence, the rest folded. */
export function Brief({ text, names, at = 200 }: { text: string; names?: ReadonlyMap<string, string>; at?: number }) {
  const hist = versionHistory(text);
  if (hist) {
    return (
      <>
        {hist.lead && <CommentText text={hist.lead} names={names} />}
        <details className="group/more mt-1">
          <summary className="cursor-pointer list-none text-[13px] font-medium text-soft hover:text-hi">
            <span className="group-open/more:hidden">Show what each version added ({hist.items.length})</span>
            <span className="hidden group-open/more:inline">Hide</span>
          </summary>
          <ul className="mt-1.5 grid gap-1">
            {hist.items.map((it) => (
              <li key={it.v} className="grid grid-cols-[2.75rem_1fr] items-baseline gap-2 text-[14px]">
                <span>
                  <Ver v={it.v} />
                </span>
                <span>
                  <CommentText text={it.text} names={names} />
                </span>
              </li>
            ))}
          </ul>
        </details>
      </>
    );
  }
  if (text.length <= at) return <CommentText text={text} names={names} />;
  const cut = firstSentence(text);
  if (cut >= text.length - 20) return <CommentText text={text} names={names} />;
  return (
    <>
      <CommentText text={text.slice(0, cut)} names={names} />
      <details className="group/more inline">
        <summary className="ml-1 inline cursor-pointer list-none text-[13px] font-medium text-soft hover:text-hi group-open/more:hidden">More</summary>
        <span> </span>
        <CommentText text={text.slice(cut).trimStart()} names={names} />
      </details>
    </>
  );
}

/** Where the first sentence ends (after a ". " that is not inside parentheses or code). */
function firstSentence(text: string): number {
  let depth = 0;
  let code = false;
  for (let i = 0; i < text.length - 1; i++) {
    const c = text[i];
    if (c === "`") code = !code;
    else if (!code && c === "(") depth++;
    else if (!code && c === ")") depth = Math.max(0, depth - 1);
    else if (!code && !depth && (c === "." || c === ":" || c === ";") && text[i + 1] === " " && i > 40) return i + 1;
  }
  return text.length;
}

const NAME = /\b(?:openrac_api\.\w+|openrac_\w+|OPENRAC_[A-Z0-9_]+[A-Z0-9])\b/g;

function linked(text: string, names?: ReadonlyMap<string, string>) {
  if (!names?.size) return text;
  const out: (string | React.ReactElement)[] = [];
  let last = 0;
  for (const m of text.matchAll(NAME)) {
    const href = names.get(m[0]);
    if (!href) continue;
    out.push(text.slice(last, m.index));
    out.push(
      <a key={m.index} href={href} className="text-amber underline decoration-amber/40 underline-offset-2 hover:decoration-amber">
        {m[0]}
      </a>,
    );
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

/** A comment's paragraphs: the first shown, a long rest folded behind "More". */
export function Paragraphs({ text, names, className = "" }: { text: string; names?: ReadonlyMap<string, string>; className?: string }) {
  if (!text) return null;
  const [first, ...rest] = text.split(/\n\n+/);
  const p = (t: string, i: number) => (
    <p key={i} className={`text-[15px] leading-relaxed text-body ${className}`}>
      <Brief text={t} names={names} at={320} />
    </p>
  );
  if (!rest.length || rest.join(" ").length < 160) return <>{[first, ...rest].map(p)}</>;
  return (
    <>
      {p(first, 0)}
      <details className="group/para">
        <summary className="cursor-pointer list-none text-[13px] font-medium text-soft hover:text-hi">
          <span className="group-open/para:hidden">More</span>
          <span className="hidden group-open/para:inline">Less</span>
        </summary>
        <div className="mt-2 grid gap-2">{rest.map((t, i) => p(t, i + 1))}</div>
      </details>
    </>
  );
}
