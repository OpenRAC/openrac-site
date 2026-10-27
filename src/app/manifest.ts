import type { MetadataRoute } from "next";

/** The web app manifest: name, colours and icons for "add to home screen". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenRAC · Ratchet & Clank Decompilation Hub",
    short_name: "OpenRAC",
    description: "Unofficial hub for community decompilation projects of the Ratchet & Clank series.",
    start_url: "/",
    display: "standalone",
    background_color: "#12121a",
    theme_color: "#d6a020",
    icons: [
      {
        src: "/icon.png",
        sizes: "64x64",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        // The mark as a vector: sharp at any size an installed app asks for.
        src: "/openrac-mark-yellow.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
