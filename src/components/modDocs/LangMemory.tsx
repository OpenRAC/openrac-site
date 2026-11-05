"use client";

import { useEffect } from "react";

export type CodeLang = "luau" | "c" | "cpp";
const KEY = "openrac-docs-lang";

/** The language the reader last worked in, kept in this browser so every page shows code in it. */
export function readLang(): CodeLang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "luau" || v === "c" || v === "cpp" ? v : null;
  } catch {
    return null;
  }
}

export function writeLang(lang: CodeLang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Private windows and blocked storage: the choice just is not kept.
  }
}

/** Put on a page about one language (a guide or a reference): reading it picks that language. */
export default function LangMemory({ lang }: { lang: CodeLang }) {
  useEffect(() => writeLang(lang), [lang]);
  return null;
}
