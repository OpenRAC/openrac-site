import type { ReactNode } from "react";
import styles from "./Home.module.css";

/**
 * A row of numbered panels: a title, a line of text and an optional action (a button) at the bottom.
 * Used for the steps in "Get involved" and "How it works".
 */
export default function HomeSteps({ items, flow = false }: { items: readonly (readonly [string, string, ReactNode?])[]; flow?: boolean }) {
  return (
    <div className={`${styles.steps} ${flow ? styles.flow : ""}`}>
      {items.map(([title, text, action], i) => (
        <div key={title} className={styles.step}>
          <span aria-hidden className={styles.stepNumber}>{String(i + 1).padStart(2, "0")}</span>
          <h3>{title}</h3>
          <p>{text}</p>
          {action && <div className={styles.stepAction}>{action}</div>}
        </div>
      ))}
    </div>
  );
}
