import { test, expect, type Page } from "@playwright/test";

const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

const colorSchemes = ["light", "dark"] as const;

// Retry page.goto on connection failures (Firefox NS_ERROR_CONNECTION_REFUSED)
async function gotoWithRetry(page: Page, url: string, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === retries || !message.includes("NS_ERROR_CONNECTION_REFUSED")) {
        throw err;
      }
      await page.waitForTimeout(1000 * attempt);
    }
  }
}

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

        await gotoWithRetry(page, "/");

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
            maxDiffPixelRatio: 0.03,
          }
        );
      });
    }
  }
});
