import type { MetadataRoute } from "next";

// Web app manifest — makes Rhythm installable to the home screen (Android/desktop
// "Install app", iOS Safari "Add to Home Screen") and run full-screen standalone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rhythm — Volunteer Connection",
    short_name: "Rhythm",
    description: "Stay connected with your volunteers — reach-outs, birthdays, and encouragement.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0912",
    theme_color: "#0a0912",
    icons: [
      { src: "/icon.jpg", sizes: "192x192", type: "image/jpeg", purpose: "any" },
      { src: "/icon.jpg", sizes: "512x512", type: "image/jpeg", purpose: "any" },
      { src: "/apple-icon.jpg", sizes: "512x512", type: "image/jpeg", purpose: "maskable" },
    ],
  };
}
