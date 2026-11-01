import type { Metadata, Viewport } from "next";
import { Audiowide, Chakra_Petch, Inter, Orbitron, Pixelify_Sans } from "next/font/google";
import SiteFooter from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Logo from "@/components/ui/Logo";
import RevealObserver from "@/components/layout/RevealObserver";
import { SHARE_IMAGE, siteUrl } from "@/lib/machine";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const audiowide = Audiowide({ subsets: ["latin"], weight: "400", variable: "--font-audiowide", display: "swap" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", display: "swap" });
// The two below only dress single cards far down the page: not preloaded, so they never delay the first paint.
const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap", preload: false });
const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-chakra",
  display: "swap",
  preload: false,
});

const title = "OpenRAC · Ratchet & Clank Decompilation Hub";
const description =
  "OpenRAC is an unofficial hub for community decompilation projects of the Ratchet & Clank series. Track progress for every title and download the OpenRAC launcher.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: title,
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
    title,
    description,
    type: "website",
    url: "/",
    siteName: "OpenRAC",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [SHARE_IMAGE],
  },
  // Lets scripts and AI tools find the machine-readable versions on their own.
  alternates: {
    canonical: "/",
    types: {
      "application/json": "/progress.json",
      "text/plain": "/llms.txt",
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#d6a020",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** The frame of every page: fonts, metadata, the loading screen, header and footer. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the splash script below adds "ready" to <html> before React hydrates.
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${audiowide.variable} ${orbitron.variable} ${pixel.variable} ${chakra.variable}`}>
      <body className="font-sans text-base leading-relaxed antialiased">
        {/* The logo over a blank page until the fonts are in, then a fade: the page never pops in
            half-styled. A timer lifts it anyway; without scripts there is none (globals.css). Coming
            from another page of the site the fonts are already in, so it is lifted at once. */}
        <div id="splash" aria-hidden className="splash">
          <Logo height={44} label="" accent className="text-text" />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var d=document.documentElement,r=function(){d.classList.add('ready')};try{if(new URL(document.referrer).origin===location.origin)r()}catch(e){}setTimeout(r,1500);if(document.fonts)document.fonts.ready.then(r);})()",
          }}
        />
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
