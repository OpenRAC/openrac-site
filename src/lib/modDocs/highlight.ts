/**
 * A small highlighter for the docs' code (C, C++, Luau, JSON, shell): comments, strings, numbers,
 * keywords, types and calls. It only colours; the text is the code as it is. No dependency.
 */

export type Token = { t: "plain" | "comment" | "string" | "number" | "keyword" | "type" | "fn" | "macro" | "punct"; v: string };

const C_KEYWORDS = "if else for while do return break continue switch case default static const extern struct typedef union enum sizeof void inline volatile goto";
const CPP_KEYWORDS = `${C_KEYWORDS} auto class namespace template typename using public private protected virtual override final constexpr noexcept throw try catch new delete this nullptr true false operator explicit friend mutable`;
const LUAU_KEYWORDS = "and break do else elseif end false for function if in local nil not or repeat return then true until while continue type export";
const TYPES = /^(u?int(8|16|32|64)_t|size_t|float|double|int|char|bool|long|short|unsigned|signed|uint8_t|openrac_\w+|std|string|number|boolean|buffer|any)$/;

const KEYWORDS: Record<string, Set<string>> = {
  c: new Set(C_KEYWORDS.split(" ")),
  cpp: new Set(CPP_KEYWORDS.split(" ")),
  luau: new Set(LUAU_KEYWORDS.split(" ")),
  json: new Set(["true", "false", "null"]),
  sh: new Set(["git", "cmake", "python3", "cd", "export"]),
};

function rules(lang: string): [Token["t"], RegExp][] {
  const lineComment = lang === "luau" ? /--\[\[[\s\S]*?\]\]|--[^\n]*/y : lang === "sh" || lang === "cmake" ? /#[^\n]*/y : /\/\/[^\n]*|\/\*[\s\S]*?\*\//y;
  return [
    ["comment", lineComment],
    ["macro", lang === "c" || lang === "cpp" ? /#\s*\w+/y : /(?!)/y],
    ["string", /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/y],
    ["number", /\b0x[0-9a-fA-F]+u?\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?[uUfFlL]*\b/y],
    ["plain", /[A-Za-z_]\w*/y],
    ["punct", /[{}()[\];,.:<>=+\-*/&|!~^%?@]+/y],
    ["plain", /\s+|./y],
  ];
}

export function highlight(code: string, lang: string): Token[] {
  const l = lang === "lua" ? "luau" : lang === "c++" ? "cpp" : lang === "bash" || lang === "shell" ? "sh" : lang;
  const table = rules(l);
  const words = KEYWORDS[l] ?? new Set<string>();
  const out: Token[] = [];
  let i = 0;
  while (i < code.length) {
    let matched = false;
    for (const [type, re] of table) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (!m || !m[0]) continue;
      let t: Token["t"] = type;
      const v = m[0];
      if (type === "plain" && /^[A-Za-z_]/.test(v)) {
        if (words.has(v)) t = "keyword";
        else if (/^OPENRAC_[A-Z0-9_]+$/.test(v)) t = "macro";
        else if (TYPES.test(v)) t = "type";
        else if (code[i + v.length] === "(" || (code[i + v.length] === "<" && l === "cpp")) t = "fn";
      }
      if (l === "json" && type === "string" && /^\s*:/.test(code.slice(i + v.length))) t = "keyword";
      if (t === "punct") t = "plain";
      const last = out[out.length - 1];
      if (last && last.t === t && (t === "plain" || t === "comment")) last.v += v;
      else out.push({ t, v });
      i += v.length;
      matched = true;
      break;
    }
    if (!matched) {
      out.push({ t: "plain", v: code[i] });
      i++;
    }
  }
  return out;
}

/** The class of each kind of token (globals.css, .tk-*): the site's own golds and greys, so the gold stays the only accent. */
export const TOKEN_CLASS: Record<Token["t"], string> = {
  plain: "",
  comment: "tk-c",
  string: "tk-s",
  number: "tk-n",
  keyword: "tk-k",
  type: "tk-t",
  fn: "tk-f",
  macro: "tk-m",
  punct: "",
};
