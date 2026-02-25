import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
const site = "https://www.rmi-llc.net";

export default defineConfig({
  site,
  devToolbar: {
    enabled: false,
  },
  output: "hybrid",
  adapter: vercel({
    runtime: "nodejs20.x",
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
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
