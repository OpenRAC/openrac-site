import Link from "next/link";
import { ReportPoster } from "@/components/news/parts";
import Section from "./HomeSection";
import styles from "./Home.module.css";
import { leadProject } from "@/lib/news/logic";
import type { NewsReport, NewsWeekFacts } from "@/lib/news/types";

/** The newest written reports on the home page. Left out altogether when there are none to show. */
export default function LatestNews({ reports }: { reports: { report: NewsReport; facts: NewsWeekFacts }[] }) {
  return (
    <Section id="news" title="Latest news" sub="What happens across the projects, week by week.">
      <div className={styles.newsGrid}>
        {reports.map(({ report, facts }) => (
          <ReportPoster key={report.week} entry={facts} report={report} lead={leadProject(facts.projects)?.repo} heading="h3" />
        ))}
      </div>
      <Link href="/news" className={styles.sectionLink}>
        All news <span aria-hidden>↗</span>
      </Link>
    </Section>
  );
}
