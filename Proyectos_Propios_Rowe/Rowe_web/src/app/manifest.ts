import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROWE — Web & Audiovisual",
    short_name: "ROWE",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    icons: [
      { src: "/brand/rowe-mark-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/rowe-mark-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
