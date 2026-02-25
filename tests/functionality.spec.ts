import { test, expect } from "@playwright/test";

// Helper to wait for React hydration then fill the landing page contact form
async function fillContactForm(
  page: import("@playwright/test").Page,
  data: { name: string; email: string; message: string }
) {
  // Wait for React to hydrate the form (prevents native GET submission)
  await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 10000 });
  await page.fill("#name", data.name);
  await page.fill("#email", data.email);
  await page.selectOption("#projectType", "installation");
  await page.fill("#message", data.message);
}

test.describe("Functionality Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/contact", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should navigate to contact form when clicking Request a Quote CTA", async ({
    page,
  }) => {
    const ctaLink = page.locator('a:has-text("Request a Quote")').first();
    await expect(ctaLink).toBeVisible();
    await expect(ctaLink).toHaveAttribute("href", "#contact");

    await ctaLink.click();

    // Check that contact form section exists and is visible
    const contactForm = page.locator("#contact");
    await expect(contactForm).toBeVisible();

    // Verify navigation occurred by checking URL hash
    await expect(page).toHaveURL(/#contact$/);
  });

  test("should have working phone link", async ({ page }) => {
    const phoneLink = page.locator('a[href^="tel:"]').first();
    await expect(phoneLink).toBeVisible();

    const href = await phoneLink.getAttribute("href");
    expect(href).toContain("tel:");
    expect(href).toContain("419");
  });

  test("should have working email link", async ({ page }) => {
    const emailLink = page.locator('a[href^="mailto:"]').first();
    await expect(emailLink).toBeVisible();

    const href = await emailLink.getAttribute("href");
    expect(href).toContain("mailto:");
    expect(href).toContain("fab@rmi-llc.net");
  });

  test("should submit contact form successfully", async ({ page }) => {
    // Scroll to contact form
    const contact = page.locator("#contact");
    await contact.scrollIntoViewIfNeeded();

    // Fill out form (landing page form has additional required fields)
    await fillContactForm(page, {
      name: "Test User",
      email: "test@example.com",
      message: "This is a test message",
    });

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for success message
    const successMessage = page.locator("text=Thank you for your inquiry");
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Check that form is cleared
    const nameValue = await page.locator("#name").inputValue();
    const emailValue = await page.locator("#email").inputValue();
    const messageValue = await page.locator("#message").inputValue();

    expect(nameValue).toBe("");
    expect(emailValue).toBe("");
    expect(messageValue).toBe("");
  });

  test("should show validation errors for empty form submission", async ({
    page,
  }) => {
    // Wait for React to hydrate the form (prevents native GET submission)
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 10000 });

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Form uses JavaScript validation (noValidate) — check that error messages appear
    await page.waitForSelector('[role="alert"]', { timeout: 5000 });
    const errorAlerts = page.locator('[role="alert"]');
    const errorCount = await errorAlerts.count();
    expect(errorCount).toBeGreaterThan(0);

    // Name field should be marked invalid via aria-invalid
    const nameInput = page.locator("#name");
    await expect(nameInput).toHaveAttribute("aria-invalid", "true");
  });

  test("should disable submit button while submitting", async ({ page }) => {
    // Override the route with a longer delay so we can reliably observe
    // the disabled state (200ms from beforeEach is too fast for webkit)
    await page.route("**/api/contact", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    const contact = page.locator("#contact");
    await contact.scrollIntoViewIfNeeded();

    await fillContactForm(page, {
      name: "Test User",
      email: "test@example.com",
      message: "Test message",
    });

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();

    // Click, then verify the button becomes disabled while the request is in-flight
    await submitButton.click();
    await expect(submitButton).toBeDisabled({ timeout: 3000 });

    // Wait for submission to complete
    const successMessage = page.locator("text=Thank you for your inquiry");
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test("should have proper button states", async ({ page }) => {
    const contact = page.locator("#contact");
    await contact.scrollIntoViewIfNeeded();

    const submitButton = page.locator('button[type="submit"]');
    const contactForm = page.locator("#contact form");
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText("Send Message");

    // Check aria-busy attribute changes
    await fillContactForm(page, {
      name: "Test",
      email: "test@example.com",
      message: "Test",
    });

    await submitButton.click();

    // Form should show aria-busy during submission
    const ariaBusy = await contactForm.getAttribute("aria-busy");
    expect(ariaBusy).toBe("true");
  });

  test("should have working anchor links", async ({ page }) => {
    // Test services anchor
    const servicesSection = page.locator("#services");
    await expect(servicesSection).toBeVisible();

    // Test contact anchor
    const contactSection = page.locator("#contact");
    await expect(contactSection).toBeVisible();
  });

  test("should load all images", async ({ page }) => {
    // Scroll to bottom and back to trigger lazy-loaded images
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const images = page.locator("img");
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute("src");
      if (src && !src.startsWith("data:")) {
        // Check if image loads (not broken)
        const { naturalWidth, complete } = await img.evaluate((el: HTMLImageElement) => ({
          naturalWidth: el.naturalWidth,
          complete: el.complete,
        }));
        // Only assert on images that are visible AND fully loaded
        const isVisible = await img.isVisible();
        if (isVisible && complete) {
          expect(naturalWidth).toBeGreaterThan(0);
        }
      }
    }
  });
});
