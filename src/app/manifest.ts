import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenRAC · Ratchet & Clank Decompilation Hub",
    short_name: "OpenRAC",
    description: "Unofficial hub for community decompilation projects of the Ratchet & Clank series.",
    start_url: "/",
    display: "standalone",
    background_color: "#14141c",
    theme_color: "#d58a00",
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
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
