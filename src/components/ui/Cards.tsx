import type { ReactNode } from "react";

/**
 * A row of numbered panels: a title, a line of text and an optional action (a button) at the bottom.
 * Used for the steps in "Get involved" and "How it works".
 */
export default function Cards({ items }: { items: readonly (readonly [string, string, ReactNode?])[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] sm:gap-5">
      {items.map(([title, text, action], i) => (
        <div key={title} className="surface relative flex flex-col overflow-hidden p-5 sm:p-6">
          <span aria-hidden className="absolute -top-1.5 right-3.5 font-orbitron text-[72px] font-bold leading-none text-brand/15 sm:text-[84px]">{i + 1}</span>
          <h3 className="relative mb-2 font-orbitron text-[19px] font-bold text-gold">{title}</h3>
          <p className="relative text-soft">{text}</p>
          {action && <div className="relative mt-auto pt-4">{action}</div>}
        </div>
      ))}
    </div>
  );
}
