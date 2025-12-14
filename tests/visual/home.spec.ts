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
        await page.emulateMedia({ colorScheme });
        await page.goto("/");

        // Wait for page to be fully loaded
        await page.waitForLoadState("networkidle");

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
