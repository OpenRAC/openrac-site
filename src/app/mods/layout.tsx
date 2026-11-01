import type { Viewport } from "next";

/** Every /mods page: the browser's own bar takes the mods' mint, as the page's accent does. */
export const viewport: Viewport = { themeColor: "#1fae9b" };

export default function ModsLayout({ children }: LayoutProps<"/mods">) {
  return children;
}
