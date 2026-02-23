import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const breakpoints = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile-414", width: 414, height: 736 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

const sections = [
  { name: "navbar", selector: "nav" },
  { name: "hero", selector: "#hero, section:first-of-type" },
  { name: "services", selector: "#services" },
  { name: "about", selector: "#about" },
  { name: "marquee", selector: "#materials, .service-ticker" },
  { name: "cta", selector: "#cta" },
  { name: "contact", selector: "#contact" },
  { name: "footer", selector: "footer" },
];

const outputDir = process.env.SCREENSHOT_OUTPUT || "docs/screenshots/current";

test.beforeAll(() => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
});

for (const bp of breakpoints) {
  test(`full-page ${bp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Wait for animations to settle
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(outputDir, `full-page-${bp.name}.png`),
      fullPage: true,
    });
  });

  for (const section of sections) {
    test(`${section.name} ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      const el = page.locator(section.selector).first();
      const exists = await el.count();
      if (exists > 0) {
        await el.screenshot({
          path: path.join(outputDir, `${section.name}-${bp.name}.png`),
        });
      }
    });
  }
}
