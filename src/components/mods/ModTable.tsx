"use client";

import Link from "next/link";
import { ago, formatCount, type Sort } from "@/lib/mods/logic";
import type { SlimMod } from "@/lib/mods/slim";
import { formatSize } from "@/lib/format";
import { AiBadge, DiscBadges, TypeBadge, WorksBadge } from "./Badges";
import { Marked } from "./ModCard";
import ModImage from "./ModImage";

const SORTABLE: Partial<Record<string, Sort>> = { Name: "name", Downloads: "downloads", Updated: "updated" };

/**
 * The List view: CKAN's dense table for comparing mods. A real table with buttons in the sortable
 * headers and aria-sort on the sorted one (W3C APG sortable table). Where its columns cannot fit, the rows stack.
 */
export default function ModTable({
  mods,
  now,
  query,
  sort,
  onSort,
  picked,
  onPick,
}: {
  mods: SlimMod[];
  now: number;
  query: string;
  sort: Sort;
  onSort: (s: Sort) => void;
  picked: Set<string>;
  onPick: (id: string) => void;
}) {
  const head = (label: string, className = "") => {
    const s = SORTABLE[label];
    const on = s && sort === s;
    return (
      <th scope="col" aria-sort={on ? (s === "name" ? "ascending" : "descending") : undefined} className={`px-2 py-2.5 text-left font-orbitron text-[11px] font-bold uppercase tracking-[.12em] text-hi ${className}`}>
        {s ? (
          <button type="button" onClick={() => onSort(s)} className={`inline-flex min-h-11 items-center gap-1 uppercase tracking-[.12em] ${on ? "text-amber" : "hover:text-amber"}`}>
            {label}
            <span aria-hidden className={on ? "" : "opacity-30"}>
              {s === "name" ? "↑" : "↓"}
            </span>
          </button>
        ) : (
          label
        )}
      </th>
    );
  };
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full border-collapse text-[15px]">
        <caption className="sr-only">Mods, {mods.length} shown. Select rows to install several at once.</caption>
        <thead className="border-b border-line max-[1024px]:sr-only">
          <tr>
            <th scope="col" className="w-12 px-1">
              <span className="sr-only">Add to set</span>
            </th>
            {head("Name", "w-full")}
            {head("Type")}
            {head("Version")}
            {head("Discs")}
            {head("Size", "text-right")}
            {head("Downloads", "text-right")}
            {head("Updated", "text-right")}
          </tr>
        </thead>
        <tbody>
          {mods.map((m) => (
            <tr key={m.id} className="group/row relative border-t border-line first:border-0 hover:bg-white/[.02] max-[1024px]:grid max-[1024px]:grid-cols-[auto_minmax(0,1fr)_auto] max-[560px]:grid-cols-[auto_minmax(0,1fr)] max-[1024px]:items-center max-[1024px]:gap-x-3 max-[1024px]:px-3 max-[1024px]:py-3">
              <td className="px-1 py-2 max-[1024px]:row-span-2 max-[560px]:row-span-3 max-[1024px]:p-0">
                <label className="relative z-10 flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-white/5">
                  <input type="checkbox" checked={picked.has(m.id)} onChange={() => onPick(m.id)} className="size-[18px] accent-amber" />
                  <span className="sr-only">Add {m.name} to the set</span>
                </label>
              </td>
              <td className="min-w-0 px-2 py-2 max-[1024px]:p-0">
                <div className="flex items-center gap-3">
                  {m.card ? (
                    <ModImage img={m.card} sizes="64px" className="aspect-video w-16 flex-none rounded-md object-cover max-[480px]:hidden" />
                  ) : (
                    <span aria-hidden className="aspect-video w-16 flex-none rounded-md bg-gradient-to-br from-panel-hi to-ink max-[480px]:hidden" />
                  )}
                  <div className="min-w-0">
                    <Link href={`/mods/${m.id}`} prefetch={false} className="font-orbitron text-[15px] font-bold text-gold no-underline after:absolute after:inset-0 after:content-[''] hover:text-amber [overflow-wrap:break-word]">
                      <Marked text={m.name} query={query} />
                    </Link>
                    <p className="text-[13px] text-dim">
                      by <Marked text={m.author} query={query} />
                    </p>
                    {/* Under a pointer, a peek at the screenshots (hidden until then, so they load only when shown). */}
                    {m.shots.length > 0 && (
                      <div aria-hidden className="mt-1.5 hidden gap-1.5 [@media(hover:hover)]:group-hover/row:flex">
                        {m.shots.map((s) => (
                          <ModImage key={s.hash} img={s} sizes="96px" className="aspect-video w-24 rounded object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-2 py-2 max-[1024px]:p-0 max-[1024px]:text-right max-[560px]:col-start-2 max-[560px]:my-1 max-[560px]:text-left">
                <span className="inline-flex flex-wrap justify-end gap-1 max-[560px]:justify-start">
                  <TypeBadge type={m.type} />
                  <WorksBadge works={m.works} />
                  {m.aiAssisted && <AiBadge />}
                </span>
              </td>
              <td className="px-2 py-2 tabular-nums text-soft max-[1024px]:col-start-2 max-[1024px]:p-0 max-[1024px]:text-[13px]">
                v{m.version}
                <span className="min-[1024px]:hidden"> · {formatCount(m.downloads)} downloads · {ago(m.updated, now)}</span>
              </td>
              <td className="px-2 py-2 max-[1024px]:hidden">
                <span className="flex gap-1">
                  <DiscBadges games={m.games} />
                </span>
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-soft max-[1024px]:hidden">{m.size ? formatSize(m.size) : "–"}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-soft max-[1024px]:hidden" title={`${m.downloads.toLocaleString("en-US")} downloads`}>
                {formatCount(m.downloads)}
              </td>
              <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-soft max-[1024px]:hidden">{ago(m.updated, now)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
