import type { MetadataRoute } from "next";

// Icons are static files in public/icons (rendered from public/icon.svg) so
// installability never depends on runtime image generation. id/scope pin the
// app identity for Chrome across URL changes.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Durak Tracker",
    short_name: "Durak",
    description: "Track results of Durak card games among friends.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#060c14",
    theme_color: "#060c14",
    orientation: "portrait",
    categories: ["games", "entertainment", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
