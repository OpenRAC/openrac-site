"use client";

import Link from "next/link";
import { usePicked } from "./store";

/** Puts the mod in the set the mod list gathers (the same store), to install several together. */
export default function AddToSet({ id }: { id: string }) {
  const [picked, setPicked] = usePicked();
  const on = picked.includes(id);
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== id) : [...picked, id])} className={`btn ${on ? "!border-amber text-amber" : ""}`}>
        {on ? "In your set ✓" : "Add to set"}
      </button>
      {on && (
        <Link href="/mods#all" className="text-[14px] text-amber underline-offset-2 hover:underline">
          Review set
        </Link>
      )}
    </span>
  );
}
