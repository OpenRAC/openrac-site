import Link from "next/link";
import { ReportPoster } from "@/components/news/parts";
import Section from "@/components/ui/Section";
import { leadProject } from "@/lib/news/logic";
import type { NewsReport, NewsWeekFacts } from "@/lib/news/types";

/** The newest written reports on the home page. Left out altogether when there are none to show. */
export default function LatestNews({ reports }: { reports: { report: NewsReport; facts: NewsWeekFacts }[] }) {
  return (
    <Section id="news" title="Latest news" sub="What happens across the projects, week by week.">
      <div className="grid gap-3 md:grid-cols-3">
        {reports.map(({ report, facts }) => (
          <ReportPoster key={report.week} entry={facts} report={report} lead={leadProject(facts.projects)?.repo} heading="h3" />
        ))}
      </div>
      <Link href="/news" className="btn mt-4">
        All news
      </Link>
    </Section>
  );
}
