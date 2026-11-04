import type { CSSProperties } from "react";
import { authorUrl, formatPercent, newsPercent, NEWS_ISSUES, progressChange, segments } from "@/lib/news/logic";
import type { NewsMeasures, NewsProject, NewsReport } from "@/lib/news/types";
import { PROJECTS, type ProjectId } from "@/lib/projects";

/** Which card colours a tracked repository wears. The launcher and mods have no game card, so they keep the site's gold. */
const CARD: Record<string, ProjectId> = { "rac1-decomp": "rac1", "rac2-decomp": "gc", "rac3-decomp": "uya", "rac4-decomp": "deadlocked" };

export function projectStyle(repo: string): CSSProperties | undefined {
  const theme = PROJECTS.find((p) => p.id === CARD[repo])?.theme;
  return theme && { color: theme.text2, borderColor: `color-mix(in srgb, ${theme.border} 55%, transparent)`, background: `color-mix(in srgb, ${theme.from} 45%, transparent)` };
}

/** Report text: plain words with citations as links. Never HTML, whatever the file says. */
export function ReportText({ text, known, owner }: { text: string; known: readonly string[]; owner?: string }) {
  return segments(text, known, owner).map((part, i) =>
    typeof part === "string" ? (
      part
    ) : (
      <a key={i} href={part.href} className="text-amber underline underline-offset-2">
        {part.label}
      </a>
    ),
  );
}

/** Who answers for a report, and how it was made. Shown wherever report text is. */
export function WrittenBy({ report }: { report: NewsReport }) {
  return (
    <p className="mt-3 text-[13px] text-dim">
      Written by{" "}
      <a href={authorUrl(report.author)} rel="nofollow ugc noopener noreferrer" className="text-soft underline underline-offset-2 hover:text-amber">
        @{report.author}
      </a>{" "}
      with {report.tool} from public GitHub data.{" "}
      <a href={NEWS_ISSUES} className="text-soft underline underline-offset-2 hover:text-amber">
        Report a mistake
      </a>
    </p>
  );
}

/** The site's progress measure and how far it moved that day. */
export function ProgressLine({ progress }: { progress: NonNullable<NewsProject["progress"]> }) {
  const code = (progress.after as NewsMeasures).code!;
  const functions = progress.after.functions;
  const change = progressChange(progress);
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2 text-[14px]">
        <span className="font-semibold text-hi">{formatPercent(code)} matched</span>
        {change && <span className="text-amber">{change} points</span>}
        {functions && <span className="text-dim">{functions.done.toLocaleString("en-GB")} of {functions.total.toLocaleString("en-GB")} functions</span>}
      </div>
      <div role="img" aria-label={`${formatPercent(code)} of code matched`} className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-amber" style={{ width: `${newsPercent(code)}%` }} />
      </div>
    </div>
  );
}
