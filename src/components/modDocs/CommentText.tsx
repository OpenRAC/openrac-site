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
          <Fragment key={i}>{linked(part, names)}</Fragment>
        ),
      )}
    </>
  );
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

/** A comment's paragraphs. */
export function Paragraphs({ text, names, className = "" }: { text: string; names?: ReadonlyMap<string, string>; className?: string }) {
  if (!text) return null;
  return (
    <>
      {text.split(/\n\n+/).map((p, i) => (
        <p key={i} className={`text-[15px] leading-relaxed text-body ${className}`}>
          <CommentText text={p} names={names} />
        </p>
      ))}
    </>
  );
}
