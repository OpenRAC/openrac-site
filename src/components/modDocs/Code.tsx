import { highlight, TOKEN_CLASS } from "@/lib/modDocs/highlight";
import CopyButton from "./CopyButton";

const LANG_NAME: Record<string, string> = { c: "C", cpp: "C++", luau: "Luau", lua: "Luau", json: "JSON", sh: "Shell", bash: "Shell", cmake: "CMake", yaml: "YAML" };

/** Highlighted text of code, without a frame: for a block, or inside a line of prose. */
export function Highlighted({ code, lang }: { code: string; lang: string }) {
  return (
    <>
      {highlight(code, lang).map((tok, i) => (TOKEN_CLASS[tok.t] ? <span key={i} className={TOKEN_CLASS[tok.t]}>{tok.v}</span> : tok.v))}
    </>
  );
}

/** A block of code: highlighted, scrolling sideways in its own box, with its language and a Copy button. */
export default function Code({ code, lang = "", title, copy = true, className = "" }: { code: string; lang?: string; title?: string; copy?: boolean; className?: string }) {
  const name = title ?? LANG_NAME[lang] ?? lang;
  return (
    <div className={`not-prose group relative my-4 overflow-hidden rounded-xl border border-line bg-ink-deep ${className}`}>
      {(name || copy) && (
        <div className="code-head">
          <span className="code-name">{name}</span>
          {copy && <CopyButton text={code} />}
        </div>
      )}
      <pre tabIndex={0} className="code-pre">
        <code>
          <Highlighted code={code} lang={lang} />
        </code>
      </pre>
    </div>
  );
}
