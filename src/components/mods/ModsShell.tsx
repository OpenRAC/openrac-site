import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/ui/Logo";

/** A menu row, as in the SDK docs' menu: a count on the right, the current one in amber. */
export const sideItem = (on: boolean) =>
  `flex min-h-8 w-full items-center gap-2.5 rounded-md px-3 text-left text-[14px] no-underline transition-colors ${on ? "bg-amber/12 font-semibold text-amber" : "text-soft hover:bg-coal hover:text-hi"}`;

/** A group of the side menu, headed like the docs' groups. */
export function SideGroup({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 flex min-h-6 items-center justify-between px-3 text-[12.5px] font-semibold text-dim">
        {title}
        {aside}
      </p>
      <div className="grid gap-0.5">{children}</div>
    </div>
  );
}

/** The count at the end of a menu row. */
export const Count = ({ n }: { n: number }) => <span className="ml-auto text-[12.5px] font-normal tabular-nums text-dim [.text-amber_&]:text-amber">{n}</span>;

function Brand() {
  return (
    <div className="flex items-center gap-3 px-3 max-lg:px-0">
      <Link href="/" className="inline-flex flex-none text-text no-underline opacity-90 hover:opacity-100" aria-label="OpenRAC home">
        <Logo height={24} label="" accent />
      </Link>
      <span aria-hidden className="h-5 w-px bg-white/15" />
      <Link href="/mods" className="text-[14.5px] font-medium text-soft no-underline hover:text-hi">
        Mods
      </Link>
    </div>
  );
}

/**
 * The frame of the mod list and each mod's page, the same as the SDK docs': the menu on the left (a
 * folding card on phones), the search and the page beside it. No site bar: the logo leads back home.
 */
export default function ModsShell({ side, menuLabel, top, children }: { side: ReactNode; menuLabel: ReactNode; top: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-16 pt-6 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Mods menu" className="hidden lg:block">
        <div className="sticky top-6 grid max-h-[calc(100vh-48px)] gap-6 overflow-y-auto pb-6 pr-1 [scrollbar-width:thin]">
          <Brand />
          {side}
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-4 lg:hidden">
          <Brand />
        </div>
        <div className="mb-4 flex items-center gap-2">{top}</div>
        <details className="d-card mb-5 lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold text-hi">
            {menuLabel}
            <span className="plus text-xl leading-none text-amber transition-transform">+</span>
          </summary>
          <div className="grid gap-5 border-t border-line p-3">{side}</div>
        </details>
        {children}
      </div>
    </div>
  );
}
