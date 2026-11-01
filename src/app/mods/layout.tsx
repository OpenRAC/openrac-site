import type { Viewport } from "next";

/** Every /mods page: the browser's own bar takes the mods' copper, as the page's accent does. */
export const viewport: Viewport = { themeColor: "#cc6d3e" };

export default function ModsLayout({ children }: LayoutProps<"/mods">) {
  return children;
}
