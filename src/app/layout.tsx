import type { Metadata, Viewport } from "next";
import { Audiowide, Chakra_Petch, Inter, Orbitron, Press_Start_2P } from "next/font/google";
import SiteFooter from "@/components/Footer";
import Header from "@/components/Header";
import RevealObserver from "@/components/RevealObserver";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const audiowide = Audiowide({ subsets: ["latin"], weight: "400", variable: "--font-audiowide", display: "swap" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", display: "swap" });
// The two below only dress single cards far down the page: not preloaded, so they never delay the first paint.
const pixel = Press_Start_2P({ subsets: ["latin"], weight: "400", variable: "--font-pixel", display: "swap", preload: false });
const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
  preload: false,
});

const description =
  "OpenRAC is an unofficial hub for community decompilation projects of the Ratchet & Clank series. Track progress for every title.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://openrac.dev"),
  title: {
    default: "OpenRAC · Ratchet & Clank Decompilation Hub",
    template: "%s · OpenRAC",
  },
  description,
  keywords: [
    "Ratchet & Clank",
    "OpenRAC",
    "decompilation",
    "reverse engineering",
    "PlayStation 2",
    "PS2",
    "Insomniac Games",
    "matching decompilation",
    "game preservation",
  ],
  authors: [{ name: "OpenRAC Community", url: "https://openrac.dev" }],
  creator: "OpenRAC Community",
  publisher: "OpenRAC",
  applicationName: "OpenRAC",
  category: "technology",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "OpenRAC · Ratchet & Clank Decompilation Hub",
    description,
    type: "website",
    url: "/",
    siteName: "OpenRAC",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenRAC · Ratchet & Clank Decompilation Hub",
    description,
  },
  // Lets feed readers, scripts and AI tools find the machine-readable versions on their own.
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/blog/rss.xml",
      "application/json": "/progress.json",
      "text/plain": "/llms.txt",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#d58a00",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${audiowide.variable} ${orbitron.variable} ${pixel.variable} ${chakra.variable}`}>
      <body className="font-sans text-base leading-relaxed antialiased">
        {/* Glows in the hero reach past the viewport; clip them so phones never scroll sideways.
            `clip` (unlike `hidden`) keeps the sticky header working. */}
        <div className="overflow-x-clip">
          <Header />
          {children}
          <SiteFooter />
        </div>
        <RevealObserver />
      </body>
    </html>
  );
}
