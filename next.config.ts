import type { NextConfig } from "next";

/**
 * Content Security Policy: what a page may load, and from where. Everything comes from this site;
 * the only outside address is the YouTube player, loaded when a visitor presses play.
 * Scripts and styles must allow 'unsafe-inline': Next writes its page data as inline scripts that
 * change on every build, and a per-request nonce would turn every cached page into a dynamic one.
 * Development is left without it, since the dev server evaluates code on the fly.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Browsers keep to HTTPS for a year once they have seen the site over it (ignored on plain http://localhost).
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  // The site needs none of these; a page can never ask for them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: CSP }] : []),
];

const nextConfig: NextConfig = {
  // Minimal self-contained server in .next/standalone, used by the container image.
  output: "standalone",
  poweredByHeader: false,
  // The blog reads Markdown files at build and revalidation time; make sure the standalone output carries them.
  outputFileTracingIncludes: { "/blog": ["./content/blog/**/*"], "/blog/[slug]": ["./content/blog/**/*"], "/blog/rss.xml": ["./content/blog/**/*"], "/sitemap.xml": ["./content/blog/**/*"] },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 75],
    // Backdrops keep their file names, so do not cache them for a year.
    minimumCacheTTL: 86400,
    // Video thumbnails and GitHub avatars: fetched and resized by our server, so visitors never contact YouTube or GitHub for them.
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/u/**" },
    ],
  },
  async headers() {
    return [
      {
        // Files in /public are not fingerprinted; let browsers and proxies reuse them for a day.
        source: "/:file(openrac-.*\\.svg|img/.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
