import { test, expect, type Page } from "@playwright/test";

// Retry page.goto on connection failures (Firefox NS_ERROR_CONNECTION_REFUSED)
async function gotoWithRetry(page: Page, url: string, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === retries || !message.includes("NS_ERROR_CONNECTION_REFUSED")) {
        throw err;
      }
      await page.waitForTimeout(1000 * attempt);
    }
  }
}

test.describe("Admin Login Visual Regression", () => {
  const viewports = {
    desktop: { width: 1920, height: 1080 },
    mobile: { width: 375, height: 667 },
  };

  for (const [deviceName, viewport] of Object.entries(viewports)) {
    test(`admin login - ${deviceName}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });

      await gotoWithRetry(page, "/admin/login");
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);

      await expect(page).toHaveScreenshot(`admin-login-${deviceName}.png`, {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.03,
      });
    });
  }

  test("admin login page loads correctly", async ({ page }) => {
    const response = await page.goto("/admin/login");
    expect(response?.status()).toBe(200);

    // Verify login form elements are present
    await expect(page.locator("#login-form")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#submit-btn")).toBeVisible();
    await expect(page.locator("#submit-btn")).toHaveText("Sign In");

    // Verify branding
    await expect(page.locator("text=RMI Admin")).toBeVisible();
    await expect(page.locator("text=Sign in to manage leads")).toBeVisible();
  });

  test("admin login shows error on invalid password", async ({ page }) => {
    // Mock the auth API to return an error
    await page.route("**/api/admin/auth", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid password" }),
      });
    });

    await page.goto("/admin/login");
    await page.waitForLoadState("networkidle");

    // Fill and submit login form
    await page.fill("#password", "wrong-password");
    await page.click("#submit-btn");

    // Verify error message appears
    const errorMessage = page.locator("#error-message");
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText("Invalid password");
  });

  test("unauthenticated /admin redirects to login", async ({ page }) => {
    await page.goto("/admin");
    // Should redirect to /admin/login
    await page.waitForURL("**/admin/login**", { timeout: 10000 });
    await expect(page.locator("#login-form")).toBeVisible();
  });
});
