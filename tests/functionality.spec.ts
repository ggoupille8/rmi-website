import { test, expect } from "@playwright/test";

test.describe("Functionality Tests", () => {
  test.beforeEach(async ({ page }) => {
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
    await page.waitForLoadState("networkidle");

    // Check that contact form is visible
    const contactForm = page.locator("#contact");
    await expect(contactForm).toBeVisible();

    // Check that form is in viewport (scrolled to)
    const isInViewport = await contactForm.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.top <= window.innerHeight;
    });
    expect(isInViewport).toBe(true);
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
    expect(href).toContain("ggoupille@rmi-llc.net");
  });

  test("should submit contact form successfully", async ({ page }) => {
    // Fill out form
    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.fill("#message", "This is a test message");

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for success message
    await page.waitForSelector('[role="alert"]', { timeout: 5000 });

    const successMessage = page.locator("text=Thank you for your message");
    await expect(successMessage).toBeVisible();

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
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check browser validation (HTML5 required attributes)
    const nameInput = page.locator("#name");
    const emailInput = page.locator("#email");
    const messageInput = page.locator("#message");

    // Check that inputs are marked as required
    await expect(nameInput).toHaveAttribute("required", "");
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(messageInput).toHaveAttribute("required", "");

    // Check validity (browser will show native validation)
    const nameValid = await nameInput.evaluate((el: HTMLInputElement) =>
      el.checkValidity()
    );
    expect(nameValid).toBe(false);
  });

  test("should disable submit button while submitting", async ({ page }) => {
    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.fill("#message", "Test message");

    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();

    // Click and immediately check if disabled
    await Promise.all([
      submitButton.click(),
      expect(submitButton).toBeDisabled({ timeout: 1000 }),
    ]);

    // Wait for submission to complete
    await page.waitForSelector('[role="alert"]', { timeout: 5000 });
  });

  test("should have proper button states", async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText("Send Message");

    // Check aria-busy attribute changes
    await page.fill("#name", "Test");
    await page.fill("#email", "test@example.com");
    await page.fill("#message", "Test");

    await submitButton.click();

    // Button should show aria-busy during submission
    const ariaBusy = await submitButton.getAttribute("aria-busy");
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
    const images = page.locator("img");
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute("src");
      if (src && !src.startsWith("data:")) {
        // Check if image loads (not broken)
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => {
          return el.naturalWidth;
        });
        // Hidden images might have 0 width, but visible ones should load
        const isVisible = await img.isVisible();
        if (isVisible) {
          expect(naturalWidth).toBeGreaterThan(0);
        }
      }
    }
  });
});
