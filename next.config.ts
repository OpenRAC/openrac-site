import type { NextConfig } from "next";

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
        source: "/:file(wrench.webp|img/.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
