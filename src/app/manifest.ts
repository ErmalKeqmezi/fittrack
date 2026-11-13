import type { MetadataRoute } from "next";

import { routes } from "@/config/routes";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FitTrack",
    short_name: "FitTrack",
    description: "Private gym journal for logging workouts and tracking strength progression.",
    start_url: routes.dashboard,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#101114",
    theme_color: "#101114",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Start workout", short_name: "Workout", url: routes.workout, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "History", url: routes.history, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Progress", url: routes.progress, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
