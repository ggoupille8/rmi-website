import { test, expect } from "@playwright/test";

test.describe("404 Page — Extended Coverage", () => {
  test("navigating to /nonexistent renders custom 404 page", async ({ page }) => {
    const response = await page.goto("/nonexistent");
    expect(response?.status()).toBe(404);

    // Custom 404 page should render with heading
    await expect(page.locator("h1")).toContainText("Page Not Found");
  });

  test("404 page at /nonexistent has Back to Home link", async ({ page }) => {
    await page.goto("/nonexistent");

    const backHome = page.getByRole("link", { name: "Back to Home" });
    await expect(backHome).toBeVisible();
    await expect(backHome).toHaveAttribute("href", "/");
  });

  test("404 page at /nonexistent has quick navigation links", async ({ page }) => {
    await page.goto("/nonexistent");

    // Services, About, Contact quick links
    await expect(page.locator('a[href="/#services"]')).toBeVisible();
    await expect(page.locator('a[href="/#about"]')).toBeVisible();
    await expect(page.locator('a[href="/#contact"]').first()).toBeVisible();
  });

  test("404 page has noindex meta to prevent search indexing", async ({ page }) => {
    await page.goto("/nonexistent");

    const robotsMeta = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robotsMeta).toBe("noindex, nofollow");
  });

  test("404 page has correct page title", async ({ page }) => {
    await page.goto("/nonexistent");

    const title = await page.title();
    expect(title.toLowerCase()).toContain("not found");
  });

  test("Back to Home link on 404 navigates to homepage", async ({ page }) => {
    await page.goto("/nonexistent");

    const backHome = page.getByRole("link", { name: "Back to Home" });
    await backHome.click();

    await page.waitForURL("/", { timeout: 10000 });
    expect(page.url()).toContain("localhost:4321");
  });

  test("404 page renders for deep nested non-existent path", async ({ page }) => {
    const response = await page.goto("/some/deeply/nested/nonexistent/path");
    expect(response?.status()).toBe(404);

    await expect(page.locator("h1")).toContainText("Page Not Found");
    await expect(page.getByRole("link", { name: "Back to Home" })).toBeVisible();
  });

  test("404 page uses dark theme styling", async ({ page }) => {
    await page.goto("/nonexistent");

    // The page should use dark background (not white)
    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    // Dark theme backgrounds are very dark (close to black)
    // Parse the rgb value and verify it's dark
    const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match.map(Number);
      // Average of RGB should be below 50 for dark theme
      expect((r + g + b) / 3).toBeLessThan(50);
    }
  });
});
