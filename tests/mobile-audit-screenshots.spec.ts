import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const breakpoints = [
  { name: "320", width: 320, height: 568 },
  { name: "375", width: 375, height: 667 },
];

const sections = [
  { name: "navbar", selector: "#navbar" },
  { name: "hero", selector: "section[aria-labelledby='hero-heading']" },
  { name: "services", selector: "#services" },
  { name: "about", selector: "#about" },
  { name: "marquee", selector: "section.overflow-hidden" },
  { name: "cta", selector: "section[aria-labelledby='cta-heading']" },
  { name: "contact", selector: "#contact" },
  { name: "footer", selector: "footer" },
];

const phase = process.env.AUDIT_PHASE || "before";
const outputDir = path.resolve(`docs/screenshots/current/${phase}`);

test.use({
  colorScheme: "dark",
});

test.beforeAll(() => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
});

for (const bp of breakpoints) {
  test(`full-page-${bp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(outputDir, `full-page-${bp.name}.png`),
      fullPage: true,
    });
  });

  for (const section of sections) {
    test(`${section.name}-${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const el = page.locator(section.selector).first();
      if ((await el.count()) > 0) {
        await el.screenshot({
          path: path.join(outputDir, `${section.name}-${bp.name}.png`),
        });
      }
    });
  }
}

// Programmatic audit metrics
for (const bp of breakpoints) {
  test(`audit-metrics-${bp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    const smallTargets = await page.evaluate(() => {
      const interactive = document.querySelectorAll('a, button, input, select, textarea, [role="button"]');
      const issues: string[] = [];
      interactive.forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const style = window.getComputedStyle(el);
        if (rect.width === 0 || rect.height === 0) return;
        if (style.display === "none" || style.visibility === "hidden") return;
        if (style.position === "absolute" && style.left === "-9999px") return;
        if (rect.width < 44 || rect.height < 44) {
          const tag = el.tagName.toLowerCase();
          const text = (el as HTMLElement).innerText?.slice(0, 40) || el.getAttribute("aria-label") || "";
          const section = el.closest("section, header, footer, nav")?.getAttribute("aria-labelledby") || el.closest("section, header, footer")?.tagName || "unknown";
          issues.push(`[${section}] ${tag}("${text.trim()}") ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        }
      });
      return issues;
    });

    const smallText = await page.evaluate(() => {
      const all = document.querySelectorAll("p, span, a, li, label, h1, h2, h3, h4, h5, h6, div, button");
      const issues: string[] = [];
      const seen = new Set<string>();
      all.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (style.position === "absolute" && rect.width <= 1 && rect.height <= 1) return;
        const fontSize = parseFloat(style.fontSize);
        if (fontSize > 0 && fontSize < 14) {
          const text = (el as HTMLElement).innerText?.slice(0, 50) || "";
          if (text.trim() && !seen.has(text.trim().slice(0, 30))) {
            seen.add(text.trim().slice(0, 30));
            const tag = el.tagName.toLowerCase();
            const section = el.closest("section, header, footer")?.getAttribute("aria-labelledby") || el.closest("section, header, footer")?.tagName || "unknown";
            issues.push(`[${section}] ${tag}("${text.trim().slice(0, 50)}") fontSize=${fontSize}px`);
          }
        }
      });
      return issues;
    });

    const results = {
      viewport: `${bp.width}px`,
      hasHorizontalOverflow: hasOverflow,
      scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth),
      clientWidth: await page.evaluate(() => document.documentElement.clientWidth),
      smallTouchTargets: smallTargets,
      smallTouchTargetCount: smallTargets.length,
      smallText: smallText,
      smallTextCount: smallText.length,
    };

    fs.writeFileSync(
      path.join(outputDir, `audit-metrics-${bp.name}.json`),
      JSON.stringify(results, null, 2)
    );
  });
}
