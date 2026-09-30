import type { Metadata, Viewport } from "next";
import { Audiowide, Inter, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const audiowide = Audiowide({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-audiowide", display: "swap" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", display: "swap" });

const description =
  "OpenRAC is an unofficial hub for community decompilation projects of the Ratchet & Clank series. Track progress for every title.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://openrac.dev"),
  title: "OpenRAC",
  description,
  openGraph: { title: "OpenRAC", description, type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#d58a00",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${audiowide.variable} ${orbitron.variable}`}>
      <body className="font-sans text-base leading-relaxed antialiased">{children}</body>
    </html>
  );
}
