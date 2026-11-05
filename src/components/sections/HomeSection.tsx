import type { ReactNode } from "react";
import styles from "./Home.module.css";

const LABELS: Record<string, [string, string]> = {
  progress: ["01", "The reconstruction"],
  contribute: ["02", "Built together"],
  news: ["03", "Field notes"],
  activity: ["04", "Work in motion"],
  how: ["05", "From bytes to source"],
  resources: ["06", "The workbench"],
  faq: ["07", "Good to know"],
  ai: ["08", "Tools and principles"],
  credits: ["09", "The community"],
};

/** Home-only section frame; the news and mods pages keep their existing layout. */
export default function HomeSection({ id, title, sub, children, aside = false }: {
  id: string; title: string; sub?: string; children: ReactNode; aside?: boolean;
}) {
  const label = LABELS[id];
  return (
    <section id={id} data-reveal="fade" className={`${styles.section} ${aside ? styles.sectionAside : ""}`}>
      <header className={styles.sectionHeading}>
        <div>
          {label && <p className={styles.kicker}><span>{label[0]}</span>{label[1]}</p>}
          <h2>{title}</h2>
        </div>
        {sub && <p className={styles.sectionIntro}>{sub}</p>}
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}
