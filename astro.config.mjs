import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
// Use Vercel preview URL when available, otherwise default to production domain
// Ensures sitemap URLs are correct for both preview and production deployments
const site = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://rmi-llc.net";

export default defineConfig({
  site,
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
});
