import type { MetadataRoute } from "next";

/**
 * Web app manifest so the app can be installed and opened in standalone/fullscreen
 * (no browser tabs or URL bar). Used for kiosk mode on tablet: "Add to Home Screen"
 * then open from home screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Dashboard",
    short_name: "Dashboard",
    description: "Household dashboard: weather, schedule, dinners, groceries, budget",
    start_url: "/login",
    display: "standalone",
    background_color: "#111827",
    theme_color: "#1f2937",
    orientation: "any",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
