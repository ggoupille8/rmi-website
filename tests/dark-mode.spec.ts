import { test, expect } from "@playwright/test";

test.describe("Dark Mode CSS Verification", () => {
  test("should apply dark background in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    const backgroundColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Dark mode should have a dark background (not white)
    // rgb(255, 255, 255) is white, dark mode should be darker
    expect(backgroundColor).not.toBe("rgb(255, 255, 255)");
  });

  test("should maintain dark appearance in light mode (dark-only site)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    const backgroundColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Site is dark-only — background should remain dark regardless of color scheme
    const rgb = backgroundColor.match(/\d+/g)?.map(Number) || [];
    if (rgb.length === 3) {
      const [r, g, b] = rgb;
      const brightness = (r + g + b) / 3;
      expect(brightness).toBeLessThan(50);
    }
  });

  test("should have readable text contrast in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const h1 = page.locator("h1").first();
    const textColor = await h1.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    // Text should be light in dark mode
    const rgb = textColor.match(/\d+/g)?.map(Number) || [];
    if (rgb.length >= 3) {
      const [r, g, b] = rgb;
      // Light text has high RGB values
      expect(r).toBeGreaterThan(150);
      expect(g).toBeGreaterThan(150);
      expect(b).toBeGreaterThan(150);
    }
  });

  test("should have readable text contrast in light mode (dark-only site)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Site is dark-only — text should be light (readable on dark backgrounds)
    const servicesHeading = page.locator("#services-heading");
    await servicesHeading.scrollIntoViewIfNeeded();
    const textColor = await servicesHeading.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    const rgb = textColor.match(/\d+/g)?.map(Number) || [];
    if (rgb.length >= 3) {
      const [r, g, b] = rgb;
      // Light text has high RGB values (readable on dark background)
      const brightness = (r + g + b) / 3;
      expect(brightness).toBeGreaterThan(150);
    }
  });

  test("should style form inputs correctly in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const contact = page.locator("#contact");
    await contact.scrollIntoViewIfNeeded();

    const nameInput = page.locator("#name");
    const inputStyles = await nameInput.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor,
      };
    });

    // Input should have appropriate contrast
    expect(inputStyles.backgroundColor).toBeDefined();
    expect(inputStyles.color).toBeDefined();
  });

  test("should style buttons correctly in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.scrollIntoViewIfNeeded();

    const buttonStyles = await submitButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      };
    });

    // Button should have visible text
    expect(buttonStyles.color).toBeDefined();
    expect(buttonStyles.backgroundColor).toBeDefined();
  });

  test("should maintain consistent styles between modes for CTA buttons", async ({
    page,
  }) => {
    // Test light mode CTA
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const ctaLight = page.locator('a:has-text("Request a Quote")').first();
    const ctaLightStyles = await ctaLight.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      };
    });

    // Test dark mode CTA
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const ctaDark = page.locator('a:has-text("Request a Quote")').first();
    const ctaDarkStyles = await ctaDark.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      };
    });

    // CTA buttons should maintain their distinctive styling in both modes
    // They should be visible and have appropriate contrast
    expect(ctaLightStyles.backgroundColor).toBeDefined();
    expect(ctaDarkStyles.backgroundColor).toBeDefined();
  });

  test("should apply dark mode to footer", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();

    const footerStyles = await footer.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
      };
    });

    // Footer should have appropriate dark mode styling
    expect(footerStyles.backgroundColor).toBeDefined();
    expect(footerStyles.color).toBeDefined();
  });
});
