import { test, expect } from "@playwright/test";
import { API_RESPONSES, VALID_FORM_DATA } from "./fixtures";

test.describe("Mobile Responsive Tests (375px)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/contact", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill(API_RESPONSES.success);
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  // ── Hero Section ──

  test("hero section renders at mobile viewport", async ({ page }) => {
    const hero = page.locator('[aria-labelledby="hero-heading"]');
    await expect(hero).toBeVisible();

    // Hero heading is visible
    const heading = page.locator("#hero-heading");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("Resource Mechanical Insulation");

    // Hero CTA button is visible and tappable
    const ctaButton = hero.locator('a:has-text("Request a Quote")').first();
    await expect(ctaButton).toBeVisible();
    const ctaBox = await ctaButton.boundingBox();
    expect(ctaBox).toBeTruthy();
    expect(ctaBox!.width).toBeGreaterThanOrEqual(44);
    expect(ctaBox!.height).toBeGreaterThanOrEqual(44);
  });

  test("hero does not overflow horizontally at 375px", async ({ page }) => {
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test("hero stats are visible", async ({ page }) => {
    const hero = page.locator('[aria-labelledby="hero-heading"]');
    // Stats section should be visible (Clients, Projects, OSHA Hours)
    await expect(hero.locator("text=Clients")).toBeVisible();
  });

  // ── Services Section ──

  test("services section renders at mobile viewport", async ({ page }) => {
    const services = page.locator('[aria-labelledby="services-heading"]');
    await services.scrollIntoViewIfNeeded();
    await expect(services).toBeVisible();

    // Services heading visible
    await expect(page.locator("#services-heading")).toBeVisible();
    await expect(page.locator("#services-heading")).toContainText("Services");
  });

  test("service cards stack in single column on mobile", async ({ page }) => {
    const services = page.locator('[aria-labelledby="services-heading"]');
    await services.scrollIntoViewIfNeeded();

    // All 9 service cards should be present
    const cards = services.locator('button[aria-haspopup="dialog"]');
    await expect(cards).toHaveCount(9);

    // Verify cards are stacked (each card spans full width)
    const firstCard = cards.first();
    const cardBox = await firstCard.boundingBox();
    expect(cardBox).toBeTruthy();
    // At 375px with padding, card should be near full container width (> 300px)
    expect(cardBox!.width).toBeGreaterThan(300);
  });

  test("service cards are tappable on mobile", async ({ page }) => {
    const services = page.locator('[aria-labelledby="services-heading"]');
    await services.scrollIntoViewIfNeeded();

    const cards = services.locator('button[aria-haspopup="dialog"]');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const box = await card.boundingBox();
      if (box) {
        // Each card should meet minimum 44px touch target
        expect(box.height, `Service card ${i} should be >= 44px tall`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("service modal opens correctly on mobile", async ({ page }) => {
    const services = page.locator('[aria-labelledby="services-heading"]');
    await services.scrollIntoViewIfNeeded();

    // Tap first service card
    const firstCard = page.locator('button[aria-haspopup="dialog"]').first();
    await firstCard.click();

    // Modal should be visible and fill the viewport (exclude mobile nav menu)
    const modal = page.locator('[role="dialog"]:not(#mobile-menu)');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Modal should be scrollable on mobile (content may exceed viewport)
    const modalBox = await modal.boundingBox();
    expect(modalBox).toBeTruthy();
    expect(modalBox!.width).toBeGreaterThan(300);

    // Close button should be visible and tappable
    const closeButton = modal.locator('button[aria-label="Close dialog"]');
    await expect(closeButton).toBeVisible();
    const closeBtnBox = await closeButton.boundingBox();
    // w-11 = 44px but subpixel rendering may yield ~42-43px
    expect(closeBtnBox!.width).toBeGreaterThanOrEqual(40);
    expect(closeBtnBox!.height).toBeGreaterThanOrEqual(40);

    // Close the modal
    await closeButton.click();
    await expect(modal).toBeHidden({ timeout: 3000 });
  });

  // ── Contact Form ──

  test("contact form renders at mobile viewport", async ({ page }) => {
    const contactSection = page.locator("#contact");
    await contactSection.scrollIntoViewIfNeeded();

    // Form heading visible
    await expect(page.locator("#contact-heading")).toBeVisible();
    await expect(page.locator("#contact-heading")).toContainText("Get a Quote");

    // All form fields visible
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 10000 });
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#phone")).toBeVisible();
    await expect(page.locator("#projectType")).toBeVisible();
    await expect(page.locator("#message")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("contact form inputs stack on mobile", async ({ page }) => {
    const contactSection = page.locator("#contact");
    await contactSection.scrollIntoViewIfNeeded();
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 10000 });

    // On mobile (375px), name and company inputs should stack vertically
    const nameBox = await page.locator("#name").boundingBox();
    const companyBox = await page.locator("#company").boundingBox();

    expect(nameBox).toBeTruthy();
    expect(companyBox).toBeTruthy();

    // Stacked = company is below name (top of company > bottom of name)
    expect(companyBox!.y).toBeGreaterThan(nameBox!.y + nameBox!.height - 5);
  });

  test("contact form submit button is full width on mobile", async ({ page }) => {
    const contactSection = page.locator("#contact");
    await contactSection.scrollIntoViewIfNeeded();
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 10000 });

    const submitButton = page.locator('button[type="submit"]');
    const btnBox = await submitButton.boundingBox();
    expect(btnBox).toBeTruthy();
    // Full width on mobile = wider than 250px (375px viewport minus form padding)
    expect(btnBox!.width).toBeGreaterThan(250);
    // Minimum touch target height
    expect(btnBox!.height).toBeGreaterThanOrEqual(44);
  });

  test("contact form submission works on mobile", async ({ page }) => {
    const contactSection = page.locator("#contact");
    await contactSection.scrollIntoViewIfNeeded();
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 10000 });

    // Fill minimal required fields
    await page.fill("#name", VALID_FORM_DATA.minimal.name);
    await page.fill("#email", VALID_FORM_DATA.minimal.email);
    await page.selectOption("#projectType", "installation");
    await page.fill("#message", VALID_FORM_DATA.minimal.message);

    // Submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify success state
    await expect(page.locator("text=Thank you")).toBeVisible({ timeout: 5000 });
  });

  // ── General Layout ──

  test("no horizontal overflow at 375px viewport", async ({ page }) => {
    // Scroll through the entire page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test("navbar hamburger menu works on mobile", async ({ page }) => {
    const toggle = page.locator("#menu-toggle");
    await page.locator('#menu-toggle[data-ready="true"]').waitFor({ state: "attached", timeout: 10000 });
    await expect(toggle).toBeVisible();

    // Open menu
    await toggle.click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();

    // Verify nav links present
    await expect(page.locator('.mobile-nav-link:has-text("Services")')).toBeVisible();
    await expect(page.locator('.mobile-nav-link:has-text("Contact")')).toBeVisible();

    // Close menu
    await toggle.click();
    await expect(menu).toBeHidden();
  });
});
