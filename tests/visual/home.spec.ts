import { test, expect } from "@playwright/test";

const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

const colorSchemes = ["light", "dark"] as const;

test.describe("Homepage Visual Regression", () => {
  for (const [deviceName, viewport] of Object.entries(viewports)) {
    for (const colorScheme of colorSchemes) {
      test(`${deviceName} - ${colorScheme} mode`, async ({ page }) => {
        await page.setViewportSize(viewport);
        // Disable animations for deterministic screenshots
        await page.emulateMedia({
          colorScheme,
          reducedMotion: "reduce"
        });

        // Freeze the hero slideshow BEFORE page JS executes.
        // The slideshow uses setInterval(fn, 12000); intercepting it
        // prevents the active slide from ever advancing, keeping
        // image 0 visible for every run.
        await page.addInitScript(`
          const origSetInterval = window.setInterval.bind(window);
          window.setInterval = function(fn, ms) {
            if (ms && ms >= 10000) return 0;
            return origSetInterval.apply(window, arguments);
          };
        `);

        await page.goto("/");

        // Wait for network to be idle
        await page.waitForLoadState("networkidle");

        // Wait for fonts to be loaded (ensures consistent text rendering)
        await page.evaluate(() => document.fonts.ready);

        // Trigger lazy-loaded images by scrolling through the page.
        // This prevents the ~480K-pixel instability caused by the
        // contact-section image loading between consecutive captures.
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(800);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // Take a full page screenshot
        await expect(page).toHaveScreenshot(
          `homepage-${deviceName}-${colorScheme}.png`,
          {
            fullPage: true,
            animations: "disabled",
          }
        );
      });
    }
  }
});
