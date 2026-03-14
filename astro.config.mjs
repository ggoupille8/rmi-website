import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

// https://astro.build/config
const site = "https://rmi-llc.net";

export default defineConfig({
  site,
  build: {
    inlineStylesheets: "always",
  },
  devToolbar: {
    enabled: false,
  },
  adapter: vercel(),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/pm') &&
        !page.includes('/404'),
      serialize(item) {
        return { ...item, lastmod: new Date().toISOString().split('T')[0] };
      },
    }),
    {
      name: "db-env-log",
      hooks: {
        "astro:config:setup": ({ command, logger }) => {
          if (command !== "dev") return;
          const source = process.env.POSTGRES_URL
            ? "POSTGRES_URL"
            : process.env.DATABASE_URL
            ? "DATABASE_URL"
            : null;
          const configured = source ? "yes" : "no";
          const key = source ?? "none";
          const message = `Postgres configured: ${configured} (${key})`;
          logger.info(message);
        },
      },
    },
  ],
});
