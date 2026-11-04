import Link from "next/link";
import { formatDay, formatMonth, monthGrid } from "@/lib/news/logic";
import type { NewsDay } from "@/lib/news/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The month around a day, as plain links: no script. A dot marks a day with a written report. */
export default function DayCalendar({ days, day }: { days: readonly NewsDay[]; day: string }) {
  const { weeks, previous, next } = monthGrid(days, day);
  const step = "flex size-11 items-center justify-center rounded-full text-[18px] text-soft no-underline hover:bg-white/5 hover:text-hi";
  return (
    <nav aria-label="Pick a day" className="rounded-2xl border border-line bg-panel p-3">
      <div className="mb-1 flex items-center justify-between">
        {previous ? <Link href={`/news/${previous}`} aria-label={`Earlier month: ${formatMonth(previous)}`} className={step}>‹</Link> : <span className="size-11" />}
        <span className="font-orbitron text-[13px] font-bold text-hi">{formatMonth(day)}</span>
        {next ? <Link href={`/news/${next}`} aria-label={`Later month: ${formatMonth(next)}`} className={step}>›</Link> : <span className="size-11" />}
      </div>
      <table className="w-full table-fixed border-collapse text-center text-[13px]">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col" className="pb-1 font-normal text-dim">{w}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((cell, j) => (
                <td key={j} className="p-0">
                  {cell?.news ? (
                    <Link
                      href={`/news/${cell.date}`}
                      aria-label={`${formatDay(cell.date)}${cell.news.report ? ", written report" : ""}`}
                      aria-current={cell.date === day ? "date" : undefined}
                      className={`relative mx-auto flex size-11 items-center justify-center rounded-full no-underline ${cell.date === day ? "bg-amber font-bold text-[#1a0d00]" : "text-text hover:bg-white/10"}`}
                    >
                      {cell.dayOfMonth}
                      {cell.news.report && <span aria-hidden className={`absolute bottom-1.5 size-1 rounded-full ${cell.date === day ? "bg-[#1a0d00]" : "bg-amber"}`} />}
                    </Link>
                  ) : (
                    <span className="flex h-11 items-center justify-center text-dim">{cell?.dayOfMonth}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </nav>
  );
}
