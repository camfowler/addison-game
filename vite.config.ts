import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.BASE_URL || "/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // using existing public/manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
          },
        ],
      },
    }),
  ],
});
