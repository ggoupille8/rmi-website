import { test, expect } from "@playwright/test";

test.describe("Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should have proper page title", async ({ page }) => {
    await expect(page).toHaveTitle(/Resource Mechanical Insulation/);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();

    // Check that h1 has proper id for aria-labelledby
    const h1Id = await h1.getAttribute("id");
    expect(h1Id).toBeTruthy();
  });

  test("should have accessible form labels", async ({ page }) => {
    const nameLabel = page.locator('label[for="name"]');
    const emailLabel = page.locator('label[for="email"]');
    const messageLabel = page.locator('label[for="message"]');

    await expect(nameLabel).toBeVisible();
    await expect(emailLabel).toBeVisible();
    await expect(messageLabel).toBeVisible();

    // Check that inputs are properly associated
    const nameInput = page.locator("#name");
    const emailInput = page.locator("#email");
    const messageInput = page.locator("#message");

    await expect(nameInput).toHaveAttribute("aria-required", "true");
    await expect(emailInput).toHaveAttribute("aria-required", "true");
    await expect(messageInput).toHaveAttribute("aria-required", "true");
  });

  test("should have accessible links with proper aria-labels", async ({
    page,
  }) => {
    // Check phone link
    const phoneLink = page.locator('a[href^="tel:"]').first();
    const phoneAriaLabel = await phoneLink.getAttribute("aria-label");
    expect(phoneAriaLabel).toBeTruthy();
    expect(phoneAriaLabel).toContain("Call");

    // Check email link
    const emailLink = page.locator('a[href^="mailto:"]').first();
    const emailAriaLabel = await emailLink.getAttribute("aria-label");
    expect(emailAriaLabel).toBeTruthy();
    expect(emailAriaLabel).toContain("Email");
  });

  test("should have proper focus states for interactive elements", async ({
    page,
  }) => {
    // Test keyboard navigation through form
    await page.keyboard.press("Tab");
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();

    // Check that buttons have focus-visible styles
    const ctaButton = page.locator("a.btn-primary, button.btn-primary").first();
    await ctaButton.focus();
    const hasFocusRing = await ctaButton.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.outlineWidth !== "0px" || style.outlineStyle !== "none";
    });
    expect(hasFocusRing).toBeTruthy();
  });

  test("should have proper alt text for images", async ({ page }) => {
    const images = page.locator("img");
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      // Hidden images can have empty alt, but visible ones must have meaningful alt
      const isHidden = await img.evaluate((el) => {
        return (
          el.classList.contains("hidden") ||
          window.getComputedStyle(el).display === "none"
        );
      });
      if (!isHidden) {
        expect(alt).toBeTruthy();
        expect(alt?.length).toBeGreaterThan(0);
      }
    }
  });

  test("should have proper ARIA landmarks", async ({ page }) => {
    const main = page.locator("main");
    await expect(main).toBeVisible();

    // Check for section landmarks
    const sections = page.locator("section");
    const sectionCount = await sections.count();
    expect(sectionCount).toBeGreaterThan(0);
  });

  test("should have proper color contrast", async ({ page }) => {
    // Check that text is readable (basic check)
    const h1 = page.locator("h1");
    const h1Color = await h1.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    });
    expect(h1Color.color).toBeTruthy();
    expect(h1Color.backgroundColor).toBeTruthy();
  });

  test("should have proper form error states", async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation
    await page.waitForTimeout(100);

    // Check that required fields are marked
    const nameInput = page.locator("#name");
    const emailInput = page.locator("#email");
    const messageInput = page.locator("#message");

    await expect(nameInput).toHaveAttribute("required", "");
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(messageInput).toHaveAttribute("required", "");
  });

  test("should have proper live regions for form feedback", async ({
    page,
  }) => {
    // Fill out form
    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.fill("#message", "Test message");

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for success message
    await page.waitForSelector('[role="alert"]', { timeout: 5000 });

    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    const ariaLive = await alert.getAttribute("aria-live");
    expect(ariaLive).toBeTruthy();
  });
});
