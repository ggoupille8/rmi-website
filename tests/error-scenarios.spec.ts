import { test, expect } from "@playwright/test";
import { VALID_FORM_DATA, API_RESPONSES } from "./fixtures";

// Helper to wait for React hydration then fill the landing page contact form
async function fillLandingContactForm(
  page: import("@playwright/test").Page,
  data: { name: string; email: string; message: string }
) {
  // Wait for React to hydrate the form (prevents native GET submission)
  await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 10000 });
  await page.fill("#name", data.name);
  await page.fill("#email", data.email);
  // Select a project type (required field)
  await page.selectOption("#projectType", "installation");
  await page.fill("#message", data.message);
}

test.describe("Error Scenario Tests", () => {
  test.describe("Network Failures", () => {
    test("should handle network failure gracefully", async ({ page }) => {
      // Simulate network failure
      await page.route("**/api/contact", async (route) => {
        await route.abort("failed");
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Scroll to contact form
      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      // Fill out form (landing page form has additional required fields)
      await fillLandingContactForm(page, VALID_FORM_DATA.minimal);

      // Submit form
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Wait for form to process (button becomes enabled again after error)
      await expect(submitButton).not.toBeDisabled({ timeout: 5000 });

      // Form should not be cleared on error - data should be preserved
      const nameValue = await page.locator("#name").inputValue();
      expect(nameValue).toBe(VALID_FORM_DATA.minimal.name);
    });

    test("should handle connection timeout", async ({ page }) => {
      // Simulate very slow response
      await page.route("**/api/contact", async (route) => {
        // Wait longer than typical timeout
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      await fillLandingContactForm(page, VALID_FORM_DATA.minimal);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Button should show submitting state
      await expect(submitButton).toBeDisabled({ timeout: 1000 });
    });
  });

  test.describe("Server Error Responses", () => {
    test("should handle 500 server error", async ({ page }) => {
      await page.route("**/api/contact", async (route) => {
        await route.fulfill({
          status: API_RESPONSES.serverError.status,
          contentType: API_RESPONSES.serverError.contentType,
          body: API_RESPONSES.serverError.body,
        });
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      await fillLandingContactForm(page, VALID_FORM_DATA.minimal);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Submit button should be re-enabled after error
      await expect(submitButton).not.toBeDisabled({ timeout: 5000 });

      // Form data should be preserved on error
      const nameValue = await page.locator("#name").inputValue();
      expect(nameValue).toBe(VALID_FORM_DATA.minimal.name);
    });

    test("should handle 429 rate limit error", async ({ page }) => {
      await page.route("**/api/contact", async (route) => {
        await route.fulfill({
          status: API_RESPONSES.rateLimited.status,
          contentType: API_RESPONSES.rateLimited.contentType,
          body: API_RESPONSES.rateLimited.body,
          headers: API_RESPONSES.rateLimited.headers,
        });
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      await fillLandingContactForm(page, VALID_FORM_DATA.minimal);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Submit button should be re-enabled after error
      await expect(submitButton).not.toBeDisabled({ timeout: 5000 });
    });

    test("should handle 400 validation error from server", async ({ page }) => {
      await page.route("**/api/contact", async (route) => {
        await route.fulfill({
          status: API_RESPONSES.validationError.status,
          contentType: API_RESPONSES.validationError.contentType,
          body: API_RESPONSES.validationError.body,
        });
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      await fillLandingContactForm(page, VALID_FORM_DATA.minimal);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Submit button should be re-enabled after error
      await expect(submitButton).not.toBeDisabled({ timeout: 5000 });
    });

    test("should handle database unavailable error", async ({ page }) => {
      await page.route("**/api/contact", async (route) => {
        await route.fulfill({
          status: API_RESPONSES.databaseError.status,
          contentType: API_RESPONSES.databaseError.contentType,
          body: API_RESPONSES.databaseError.body,
        });
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      await fillLandingContactForm(page, VALID_FORM_DATA.minimal);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Submit button should be re-enabled after error
      await expect(submitButton).not.toBeDisabled({ timeout: 5000 });
    });
  });

  test.describe("Malformed Response Handling", () => {
    test("should handle non-JSON response", async ({ page }) => {
      await page.route("**/api/contact", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<html><body>Error</body></html>",
        });
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      await fillLandingContactForm(page, VALID_FORM_DATA.minimal);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Form should handle gracefully - button should be re-enabled
      await expect(submitButton).not.toBeDisabled({ timeout: 5000 });
      await expect(submitButton).toBeVisible();
    });

    test("should handle empty response body", async ({ page }) => {
      await page.route("**/api/contact", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "",
        });
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      await fillLandingContactForm(page, VALID_FORM_DATA.minimal);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Form should handle gracefully
      await expect(submitButton).not.toBeDisabled({ timeout: 5000 });
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe("Form State After Errors", () => {
    test("should preserve form data after server error", async ({ page }) => {
      await page.route("**/api/contact", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ ok: false, error: "Server error" }),
        });
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      const testData = {
        name: "Preserved Name",
        email: "preserved@test.com",
        message: "This message should be preserved after error",
      };

      await fillLandingContactForm(page, testData);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Wait for button to be re-enabled (indicates error handling complete)
      await expect(submitButton).not.toBeDisabled({ timeout: 5000 });

      // Form values should be preserved
      expect(await page.locator("#name").inputValue()).toBe(testData.name);
      expect(await page.locator("#email").inputValue()).toBe(testData.email);
      expect(await page.locator("#message").inputValue()).toBe(testData.message);
    });

    test("should allow retry after error", async ({ page }) => {
      let requestCount = 0;

      await page.route("**/api/contact", async (route) => {
        requestCount++;
        if (requestCount === 1) {
          // First request fails
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ ok: false, error: "Server error" }),
          });
        } else {
          // Subsequent requests succeed
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true }),
          });
        }
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const contact = page.locator("#contact");
      await contact.scrollIntoViewIfNeeded();

      await fillLandingContactForm(page, VALID_FORM_DATA.minimal);

      const submitButton = page.locator('button[type="submit"]');

      // First submission - fails
      await submitButton.click();
      await expect(submitButton).not.toBeDisabled({ timeout: 5000 });

      // Retry - should succeed
      await submitButton.click();

      // Wait for success - form should show success message
      const successMessage = page.locator('text=Thank you for your inquiry');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      // Should have made 2 requests
      expect(requestCount).toBe(2);
    });
  });
});
