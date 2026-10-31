"use client";

import Link from "next/link";
import { ago, formatCount, type Sort } from "@/lib/mods/logic";
import type { SlimMod } from "@/lib/mods/slim";
import { formatSize } from "@/lib/format";
import { DiscBadges, TypeBadge, WorksBadge } from "./Badges";
import { Marked } from "./ModCard";
import ModImage from "./ModImage";

const SORTABLE: Partial<Record<string, Sort>> = { Name: "name", Downloads: "downloads", Updated: "updated" };

/**
 * The List view: CKAN's dense table for comparing mods. A real table with buttons in the sortable
 * headers and aria-sort on the sorted one (W3C APG sortable table). On a phone the rows stack.
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
      <th scope="col" aria-sort={on ? (s === "name" ? "ascending" : "descending") : undefined} className={`px-3 py-2.5 text-left font-orbitron text-[11px] font-bold uppercase tracking-[.2em] text-hi ${className}`}>
        {s ? (
          <button type="button" onClick={() => onSort(s)} className={`inline-flex min-h-8 items-center gap-1 uppercase tracking-[.2em] ${on ? "text-amber" : "hover:text-amber"}`}>
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
    <div className="surface overflow-hidden">
      <table className="w-full border-collapse text-[15px]">
        <caption className="sr-only">Mods, {mods.length} shown. Select rows to install several at once.</caption>
        <thead className="border-b border-line max-[821px]:sr-only">
          <tr>
            <th scope="col" className="w-12 px-3">
              <span className="sr-only">Add to set</span>
            </th>
            {head("Name")}
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
            <tr key={m.id} className="relative border-t border-line first:border-0 hover:bg-white/[.02] max-[821px]:grid max-[821px]:grid-cols-[auto_1fr_auto] max-[821px]:items-center max-[821px]:gap-x-3 max-[821px]:px-3 max-[821px]:py-3">
              <td className="px-3 py-2 max-[821px]:row-span-2 max-[821px]:p-0">
                <label className="relative z-10 flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-white/5">
                  <input type="checkbox" checked={picked.has(m.id)} onChange={() => onPick(m.id)} className="size-[18px] accent-amber" />
                  <span className="sr-only">Add {m.name} to the set</span>
                </label>
              </td>
              <td className="min-w-0 px-3 py-2 max-[821px]:p-0">
                <div className="flex items-center gap-3">
                  {m.card ? (
                    <ModImage img={m.card} sizes="64px" className="aspect-video w-16 flex-none rounded-md object-cover max-[480px]:hidden" />
                  ) : (
                    <span aria-hidden className="aspect-video w-16 flex-none rounded-md bg-gradient-to-br from-panel-hi to-ink max-[480px]:hidden" />
                  )}
                  <div className="min-w-0">
                    <Link href={`/mods/${m.id}`} prefetch={false} className="font-orbitron text-[15px] font-bold text-gold no-underline after:absolute after:inset-0 after:content-[''] hover:text-amber [overflow-wrap:anywhere]">
                      <Marked text={m.name} query={query} />
                    </Link>
                    <p className="text-[13px] text-dim">
                      by <Marked text={m.author} query={query} />
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 max-[821px]:p-0 max-[821px]:text-right">
                <span className="inline-flex flex-wrap justify-end gap-1">
                  <TypeBadge type={m.type} />
                  <WorksBadge works={m.works} />
                </span>
              </td>
              <td className="px-3 py-2 tabular-nums text-soft max-[821px]:col-start-2 max-[821px]:p-0 max-[821px]:text-[13px]">
                v{m.version}
                <span className="min-[821px]:hidden"> · {formatCount(m.downloads)} downloads · {ago(m.updated, now)}</span>
              </td>
              <td className="px-3 py-2 max-[821px]:hidden">
                <span className="flex gap-1">
                  <DiscBadges games={m.games} />
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-soft max-[821px]:hidden">{m.size ? formatSize(m.size) : "–"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-soft max-[821px]:hidden" title={`${m.downloads.toLocaleString("en-US")} downloads`}>
                {formatCount(m.downloads)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-soft max-[821px]:hidden">{ago(m.updated, now)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
