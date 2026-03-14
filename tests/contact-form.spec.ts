import { test, expect } from "@playwright/test";
import { VALID_FORM_DATA, API_RESPONSES } from "./fixtures";

// Helper to wait for React hydration then fill the landing page contact form
async function fillContactForm(
  page: import("@playwright/test").Page,
  data: { name: string; company?: string; email: string; phone?: string; projectType?: string; message: string }
) {
  await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 10000 });
  await page.fill("#name", data.name);
  if (data.company) await page.fill("#company", data.company);
  await page.fill("#email", data.email);
  if (data.phone) await page.fill("#phone", data.phone);
  await page.selectOption("#projectType", data.projectType || "installation");
  await page.fill("#message", data.message);
}

test.describe("Contact Form E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the contact API to avoid hitting real backend
    await page.route("**/api/contact", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill(API_RESPONSES.success);
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("complete form submission flow with all fields", async ({ page }) => {
    // Scroll to contact form
    const contactSection = page.locator("#contact");
    await contactSection.scrollIntoViewIfNeeded();

    // Fill all fields using complete fixture data
    await fillContactForm(page, {
      name: VALID_FORM_DATA.complete.name,
      company: VALID_FORM_DATA.complete.company,
      email: VALID_FORM_DATA.complete.email,
      phone: VALID_FORM_DATA.complete.phone,
      projectType: VALID_FORM_DATA.complete.projectType,
      message: VALID_FORM_DATA.complete.message,
    });

    // Verify all fields are filled before submit
    await expect(page.locator("#name")).toHaveValue(VALID_FORM_DATA.complete.name);
    await expect(page.locator("#company")).toHaveValue(VALID_FORM_DATA.complete.company);
    await expect(page.locator("#email")).toHaveValue(VALID_FORM_DATA.complete.email);
    await expect(page.locator("#phone")).toHaveValue(VALID_FORM_DATA.complete.phone);
    await expect(page.locator("#message")).toHaveValue(VALID_FORM_DATA.complete.message);

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify success state
    const successMessage = page.locator("text=Thank you");
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Verify the personalized name appears in the thank-you message
    await expect(page.locator(`text=${VALID_FORM_DATA.complete.name}`)).toBeVisible();

    // Verify "Send Another Message" link is shown
    await expect(page.locator("text=Send Another Message")).toBeVisible();

    // Verify form fields are cleared after successful submission
    await expect(page.locator("#name")).toHaveValue("");
    await expect(page.locator("#email")).toHaveValue("");
    await expect(page.locator("#message")).toHaveValue("");
  });

  test("minimal form submission (required fields only)", async ({ page }) => {
    const contactSection = page.locator("#contact");
    await contactSection.scrollIntoViewIfNeeded();

    await fillContactForm(page, {
      name: VALID_FORM_DATA.minimal.name,
      email: VALID_FORM_DATA.minimal.email,
      message: VALID_FORM_DATA.minimal.message,
    });

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify success state
    await expect(page.locator("text=Thank you")).toBeVisible({ timeout: 5000 });
  });

  test("shows error state on server failure", async ({ page }) => {
    // Override API to return error
    await page.route("**/api/contact", async (route) => {
      await route.fulfill(API_RESPONSES.serverError);
    });

    const contactSection = page.locator("#contact");
    await contactSection.scrollIntoViewIfNeeded();

    await fillContactForm(page, {
      name: VALID_FORM_DATA.minimal.name,
      email: VALID_FORM_DATA.minimal.email,
      message: VALID_FORM_DATA.minimal.message,
    });

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify error state with fallback phone number
    await expect(page.locator("text=Something went wrong")).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Try Again" })).toBeVisible();
  });

  test("validation prevents empty submission", async ({ page }) => {
    const contactSection = page.locator("#contact");
    await contactSection.scrollIntoViewIfNeeded();

    // Wait for React hydration
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 10000 });

    // Submit without filling any fields
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify validation errors appear
    await page.waitForSelector('[role="alert"]', { timeout: 5000 });
    const errorAlerts = page.locator('[role="alert"]');
    const errorCount = await errorAlerts.count();
    expect(errorCount).toBeGreaterThanOrEqual(3); // name, email, projectType, message

    // Verify aria-invalid attributes on required fields
    await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#email")).toHaveAttribute("aria-invalid", "true");
  });

  test("submit button shows loading state during submission", async ({ page }) => {
    // Override with slow response
    await page.route("**/api/contact", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill(API_RESPONSES.success);
    });

    const contactSection = page.locator("#contact");
    await contactSection.scrollIntoViewIfNeeded();

    await fillContactForm(page, {
      name: VALID_FORM_DATA.minimal.name,
      email: VALID_FORM_DATA.minimal.email,
      message: VALID_FORM_DATA.minimal.message,
    });

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify button is disabled and shows "Sending..." during submission
    await expect(submitButton).toBeDisabled({ timeout: 3000 });
    await expect(submitButton).toContainText("Sending");

    // Wait for submission to complete (allow extra time for slow mock response)
    await expect(page.locator("text=Thank you")).toBeVisible({ timeout: 10000 });

    // Button should be enabled again
    await expect(submitButton).not.toBeDisabled();
  });
});
