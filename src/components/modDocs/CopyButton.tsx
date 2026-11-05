"use client";

import { useState } from "react";

/** Copies `text` and says so for a moment. */
export default function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          },
          () => setDone(false),
        );
      }}
      className={`rounded-full border border-white/15 bg-ink px-2.5 py-1 text-[12px] font-semibold text-soft transition-colors hover:border-amber hover:text-amber ${className}`}
      aria-live="polite"
    >
      {done ? "Copied" : label}
    </button>
  );
}
