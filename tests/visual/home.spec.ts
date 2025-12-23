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
        await page.goto("/");

        // Wait for network to be idle
        await page.waitForLoadState("networkidle");
        
        // Wait for fonts to be loaded (ensures consistent text rendering)
        await page.evaluate(() => document.fonts.ready);
        
        // Ensure page has fully rendered
        await page.waitForLoadState("load");
        
        // Small deterministic delay to ensure all rendering is complete
        // This accounts for any remaining paint/composite work
        await page.waitForTimeout(200);

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
