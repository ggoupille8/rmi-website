import { test, expect } from "@playwright/test";

// Use a selector that excludes the mobile navigation menu (which also has role="dialog")
const SERVICE_MODAL = '[role="dialog"]:not(#mobile-menu)';

test.describe("Service Modal Open/Close", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("opens service modal on card click", async ({ page }) => {
    const servicesSection = page.locator("#services-heading");
    await servicesSection.scrollIntoViewIfNeeded();

    // Click the first service card
    const firstServiceCard = page.locator('button[aria-haspopup="dialog"]').first();
    await expect(firstServiceCard).toBeVisible();
    const serviceName = await firstServiceCard.locator("span").first().textContent();
    await firstServiceCard.click();

    // Verify modal opened
    const modal = page.locator(SERVICE_MODAL);
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(modal).toHaveAttribute("aria-modal", "true");

    // Verify modal has the service title
    if (serviceName) {
      const normalizedName = serviceName.trim();
      await expect(modal.locator("h3")).toContainText(normalizedName);
    }

    // Verify close button is present
    const closeButton = modal.locator('button[aria-label="Close dialog"]');
    await expect(closeButton).toBeVisible();

    // Verify "Request a Quote" CTA in modal
    await expect(modal.locator("text=Request a Quote")).toBeVisible();
  });

  test("closes modal via close button", async ({ page }) => {
    const servicesSection = page.locator("#services-heading");
    await servicesSection.scrollIntoViewIfNeeded();

    // Open modal
    const firstCard = page.locator('button[aria-haspopup="dialog"]').first();
    await firstCard.click();

    const modal = page.locator(SERVICE_MODAL);
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Close via close button
    const closeButton = modal.locator('button[aria-label="Close dialog"]');
    await closeButton.click();

    // Wait for close animation (250ms) + cleanup
    await expect(modal).toBeHidden({ timeout: 3000 });
  });

  test("closes modal via Escape key", async ({ page }) => {
    const servicesSection = page.locator("#services-heading");
    await servicesSection.scrollIntoViewIfNeeded();

    // Open modal
    const secondCard = page.locator('button[aria-haspopup="dialog"]').nth(1);
    await expect(secondCard).toBeVisible();
    await secondCard.click();

    const modal = page.locator(SERVICE_MODAL);
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Close via Escape key
    await page.keyboard.press("Escape");

    await expect(modal).toBeHidden({ timeout: 3000 });
  });

  test("closes modal via backdrop click", async ({ page }) => {
    const servicesSection = page.locator("#services-heading");
    await servicesSection.scrollIntoViewIfNeeded();

    // Open modal
    const thirdCard = page.locator('button[aria-haspopup="dialog"]').nth(2);
    await expect(thirdCard).toBeVisible();
    await thirdCard.click();

    const modal = page.locator(SERVICE_MODAL);
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click backdrop (the overlay behind the modal)
    const backdrop = page.locator(".fixed.inset-0.z-50 > div").first();
    await backdrop.click({ position: { x: 10, y: 10 }, force: true });

    await expect(modal).toBeHidden({ timeout: 3000 });
  });

  test("all 9 service cards are present", async ({ page }) => {
    const servicesSection = page.locator('[aria-labelledby="services-heading"]');
    await servicesSection.scrollIntoViewIfNeeded();

    const serviceCards = servicesSection.locator('button[aria-haspopup="dialog"]');
    const cardCount = await serviceCards.count();
    expect(cardCount).toBe(9);
  });

  test("service cards have correct aria attributes", async ({ page }) => {
    const servicesSection = page.locator('[aria-labelledby="services-heading"]');
    await servicesSection.scrollIntoViewIfNeeded();

    const serviceCards = servicesSection.locator('button[aria-haspopup="dialog"]');
    const count = await serviceCards.count();

    for (let i = 0; i < count; i++) {
      const card = serviceCards.nth(i);
      await expect(card).toHaveAttribute("aria-haspopup", "dialog");
      await expect(card).toHaveAttribute("aria-expanded", "false");

      // Each card should have a descriptive aria-label
      const label = await card.getAttribute("aria-label");
      expect(label).toContain("Learn more about");
    }
  });

  test("modal keeps focus within dialog", async ({ page }) => {
    const servicesSection = page.locator("#services-heading");
    await servicesSection.scrollIntoViewIfNeeded();

    // Open modal
    const firstCard = page.locator('button[aria-haspopup="dialog"]').first();
    await firstCard.click();

    const modal = page.locator(SERVICE_MODAL);
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click the close button to give it focus, then tab
    const closeButton = modal.locator('button[aria-label="Close dialog"]');
    await closeButton.focus();
    await expect(closeButton).toBeFocused({ timeout: 2000 });

    // Tab through focusable elements — should stay within the modal
    await page.keyboard.press("Tab");
    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      const serviceModal = document.querySelector('[role="dialog"]:not(#mobile-menu)');
      return el && serviceModal ? serviceModal.contains(el) : false;
    });
    expect(activeElement).toBe(true);
  });

  test("body scroll is locked when modal is open", async ({ page }) => {
    const servicesSection = page.locator("#services-heading");
    await servicesSection.scrollIntoViewIfNeeded();

    // Open modal
    const firstCard = page.locator('button[aria-haspopup="dialog"]').first();
    await firstCard.click();

    const modal = page.locator(SERVICE_MODAL);
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify body overflow is hidden
    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe("hidden");

    // Close modal
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden({ timeout: 3000 });

    // Verify body overflow is restored
    const overflowAfter = await page.evaluate(() => document.body.style.overflow);
    expect(overflowAfter).toBe("");
  });
});
