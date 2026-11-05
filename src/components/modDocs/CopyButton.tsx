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
      className={`d-btn h-6 px-2 text-[12px] ${className}`}
      aria-live="polite"
    >
      {done ? "Copied" : label}
    </button>
  );
}
