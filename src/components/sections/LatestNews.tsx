import Link from "next/link";
import { WrittenBy } from "@/components/news/parts";
import Section from "@/components/ui/Section";
import { formatDay } from "@/lib/news/logic";
import type { NewsReport } from "@/lib/news/types";

/** The newest written report on the home page. Left out altogether when there is none to show. */
export default function LatestNews({ report }: { report: NewsReport }) {
  return (
    <Section id="news" title="Latest news" sub="What happens across the projects, day by day.">
      <article className="rounded-2xl border border-line bg-panel px-5 py-4">
        <p className="font-orbitron text-[12px] font-bold uppercase tracking-[.16em] text-amber">
          <time dateTime={report.date}>{formatDay(report.date)}</time>
        </p>
        <h3 className="mt-1.5 text-[18px] font-semibold leading-snug text-hi sm:text-[20px]">{report.headline}</h3>
        <WrittenBy report={report} />
        <Link href={`/news/${report.date}`} className="btn mt-3.5">
          Read the day&apos;s news
        </Link>
      </article>
    </Section>
  );
}
