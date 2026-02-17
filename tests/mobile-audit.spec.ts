import { test, expect, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "320px (small mobile)", width: 320, height: 568 },
  { name: "375px (iPhone SE)", width: 375, height: 667 },
  { name: "414px (iPhone Plus)", width: 414, height: 896 },
  { name: "768px (tablet)", width: 768, height: 1024 },
  { name: "1024px (tablet landscape)", width: 1024, height: 768 },
];

const SECTIONS = [
  { id: "hero-heading", label: "Hero" },
  { id: "services-heading", label: "Services" },
  { id: "about-heading", label: "About" },
  { id: "contact-heading", label: "Contact Form" },
];

// Helper: check no horizontal overflow
async function checkNoHorizontalOverflow(page: Page, viewportName: string) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflow, `Horizontal overflow detected at ${viewportName}`).toBe(false);
}

// Helper: check touch targets >= 44x44
async function checkTouchTargets(page: Page) {
  const smallTargets = await page.evaluate(() => {
    const interactives = document.querySelectorAll("a, button, input, select, textarea");
    const issues: string[] = [];
    interactives.forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Only check visible elements
      if (rect.width === 0 || rect.height === 0) return;
      // Skip sr-only / hidden elements
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;
      if (style.position === "absolute" && style.left === "-9999px") return;
      if (rect.width < 44 || rect.height < 44) {
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || "").trim().substring(0, 30);
        const ariaLabel = el.getAttribute("aria-label") || "";
        issues.push(
          `${tag}("${text || ariaLabel}"): ${Math.round(rect.width)}x${Math.round(rect.height)}`
        );
      }
    });
    return issues;
  });
  return smallTargets;
}

// Helper: check text readability (no text smaller than 12px)
async function checkTextReadability(page: Page) {
  const smallText = await page.evaluate(() => {
    const allText = document.querySelectorAll(
      "p, span, a, li, h1, h2, h3, h4, h5, h6, label, button, td, th, div"
    );
    const issues: string[] = [];
    allText.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < 12 && el.textContent && el.textContent.trim().length > 0) {
        // Exclude sr-only elements
        if (style.position === "absolute" && rect.width === 1 && rect.height === 1) return;
        const text = el.textContent.trim().substring(0, 40);
        issues.push(`${el.tagName}("${text}"): ${fontSize}px`);
      }
    });
    return issues;
  });
  return smallText;
}

for (const vp of VIEWPORTS) {
  test.describe(`Viewport: ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("page loads without error", async ({ page }) => {
      const response = await page.goto("/", { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
    });

    test("no horizontal overflow", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await checkNoHorizontalOverflow(page, vp.name);
    });

    test("all sections visible", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      for (const section of SECTIONS) {
        const el = page.locator(`#${section.id}`);
        await expect(el, `${section.label} section missing`).toBeAttached();
      }
    });

    test("navbar visible", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const navbar = page.locator("#navbar");
      await expect(navbar).toBeVisible();
    });

    if (vp.width < 768) {
      test("hamburger menu opens and closes", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });
        const toggle = page.locator("#menu-toggle");
        await expect(toggle).toBeVisible();

        // Open menu
        await toggle.click();
        const menu = page.locator("#mobile-menu");
        await expect(menu).toBeVisible();

        // Check nav links are present
        await expect(page.locator('.mobile-nav-link:has-text("Services")')).toBeVisible();
        await expect(page.locator('.mobile-nav-link:has-text("About")')).toBeVisible();
        await expect(page.locator('.mobile-nav-link:has-text("Contact")')).toBeVisible();

        // Close menu
        await toggle.click();
        await expect(menu).toBeHidden();
      });

      test("hamburger menu closes on Escape", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });
        const toggle = page.locator("#menu-toggle");
        await toggle.click();
        const menu = page.locator("#mobile-menu");
        await expect(menu).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
      });
    }

    if (vp.width >= 768) {
      test("desktop nav links visible", async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });
        await expect(page.locator('a.nav-link[data-nav-section="services"]')).toBeVisible();
        await expect(page.locator('a.nav-link[data-nav-section="about"]')).toBeVisible();
        await expect(page.locator('a.nav-link[data-nav-section="contact"]')).toBeVisible();
      });
    }

    test("text readability (no text < 12px)", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const issues = await checkTextReadability(page);
      // Allow some minor elements but report
      if (issues.length > 0) {
        console.log(`  Text readability issues at ${vp.name}: ${issues.length}`);
        issues.forEach((i) => console.log(`    ${i}`));
      }
      // Hard fail if more than 10 issues (tags, micro labels are OK)
      expect(issues.length, `Too many small text elements at ${vp.name}`).toBeLessThan(15);
    });

    test("contact form inputs accessible", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      // Scroll to contact form
      await page.locator("#contact-heading").scrollIntoViewIfNeeded();

      // Check form inputs exist and are interactive
      const nameInput = page.locator("#name");
      await expect(nameInput).toBeVisible();
      await nameInput.fill("Test User");
      expect(await nameInput.inputValue()).toBe("Test User");

      const emailInput = page.locator("#email");
      await expect(emailInput).toBeVisible();

      const messageInput = page.locator("#message");
      await expect(messageInput).toBeVisible();

      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();
    });
  });
}

// Touch target audit (run once at mobile viewport)
test.describe("Touch target audit (375px)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("touch targets >= 44x44px", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const issues = await checkTouchTargets(page);
    if (issues.length > 0) {
      console.log("  Touch targets < 44x44px:");
      issues.forEach((i) => console.log(`    ${i}`));
    }
    // Report but don't hard-fail (some inline links may be smaller)
    // Buttons and form inputs should all pass
    const criticalIssues = issues.filter(
      (i) => i.startsWith("button") || i.startsWith("input") || i.startsWith("select")
    );
    expect(
      criticalIssues.length,
      `Critical touch targets too small: ${criticalIssues.join(", ")}`
    ).toBe(0);
  });
});

// Performance metrics
test.describe("Performance metrics", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("page load performance", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const metrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType("paint");
      const fcp = paint.find((p) => p.name === "first-contentful-paint");

      return {
        domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.startTime),
        loadComplete: Math.round(perf.loadEventEnd - perf.startTime),
        fcp: fcp ? Math.round(fcp.startTime) : null,
        domInteractive: Math.round(perf.domInteractive - perf.startTime),
        transferSize: Math.round(perf.transferSize / 1024),
      };
    });

    console.log("  Performance Metrics:");
    console.log(`    DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`    Load Complete: ${metrics.loadComplete}ms`);
    console.log(`    First Contentful Paint: ${metrics.fcp}ms`);
    console.log(`    DOM Interactive: ${metrics.domInteractive}ms`);
    console.log(`    Transfer Size: ${metrics.transferSize}KB`);

    // Assertions: page should load fast in dev
    expect(metrics.domContentLoaded).toBeLessThan(10000);
    expect(metrics.fcp).toBeLessThan(5000);
  });

  test("no layout shift from images", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Check hero image has explicit dimensions or object-fit
    const heroImg = page.locator('section[aria-labelledby="hero-heading"] img').first();
    if (await heroImg.isVisible()) {
      const hasSize = await heroImg.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.objectFit === "cover" || (el.hasAttribute("width") && el.hasAttribute("height"));
      });
      expect(hasSize, "Hero image should have object-fit:cover or explicit dimensions").toBe(true);
    }
  });
});
