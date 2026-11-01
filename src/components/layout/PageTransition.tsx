import { ViewTransition, type ReactNode } from "react";

/** The transition type the site's own links between whole pages carry (header, footer, the home page's mod links). */
export const PAGE_TRANSITION = ["page"];

/**
 * A whole page that fades out and the next that rises in, when a link tagged PAGE_TRANSITION leads
 * from one to the other (the home page and /mods). Nothing for other updates: filters, the back
 * button, a mod card growing into its page.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={{ page: "page-fade", default: "none" }} exit={{ page: "page-fade", default: "none" }} default="none">
      {children}
    </ViewTransition>
  );
}
