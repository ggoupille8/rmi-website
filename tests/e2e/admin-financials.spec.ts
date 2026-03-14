import { test, expect } from "@playwright/test";
import { setAdminAuth } from "../helpers/admin-auth";

function mockFinancialsApi(page: import("@playwright/test").Page) {
  return page.route("**/api/admin/financials**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        arAging: [],
        balanceSheet: [],
        incomeStatement: [],
        borrowingBase: [],
      }),
    });
  });
}

function mockReconciliationApi(page: import("@playwright/test").Page) {
  return page.route("**/api/admin/reconciliation**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        matches: [],
        unmatched: [],
        summary: { totalMatched: 0, totalUnmatched: 0 },
      }),
    });
  });
}

function mockBorrowingBaseApi(page: import("@playwright/test").Page) {
  return page.route("**/api/admin/borrowing-base**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ entries: [], totals: {} }),
    });
  });
}

/** Helper to find a tab button by its exact label text */
function tabButton(page: import("@playwright/test").Page, label: string) {
  return page.locator("button").filter({ hasText: new RegExp(`^${label}$`) }).first();
}

test.describe("Admin Financials — Tab Navigation", () => {
  test.beforeEach(async ({ page }) => {
    const authed = await setAdminAuth(page);
    if (!authed) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
    await mockFinancialsApi(page);
    await mockReconciliationApi(page);
    await mockBorrowingBaseApi(page);
    await page.goto("/admin/financials", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle");
    // Wait for React hydration — tab bar should render
    await expect(tabButton(page, "Upload")).toBeVisible({ timeout: 15000 });
  });

  test("renders all four tab buttons", async ({ page }) => {
    await expect(tabButton(page, "Upload")).toBeVisible();
    await expect(tabButton(page, "Reports")).toBeVisible();
    await expect(tabButton(page, "Borrowing Base")).toBeVisible();
    await expect(tabButton(page, "Reconciliation")).toBeVisible();
  });

  test("clicking Reports tab does not crash", async ({ page }) => {
    await tabButton(page, "Reports").click();
    await page.waitForTimeout(500);

    // Tab bar should still be visible after switching
    await expect(tabButton(page, "Reports")).toBeVisible();
    await expect(tabButton(page, "Upload")).toBeVisible();
  });

  test("clicking Borrowing Base tab does not crash", async ({ page }) => {
    await tabButton(page, "Borrowing Base").click();
    await page.waitForTimeout(500);

    await expect(tabButton(page, "Borrowing Base")).toBeVisible();
    await expect(tabButton(page, "Upload")).toBeVisible();
  });

  test("clicking Reconciliation tab does not crash", async ({ page }) => {
    await tabButton(page, "Reconciliation").click();
    await page.waitForTimeout(500);

    await expect(tabButton(page, "Reconciliation")).toBeVisible();
    await expect(tabButton(page, "Upload")).toBeVisible();
  });

  test("switching between all tabs preserves tab bar", async ({ page }) => {
    // Click through each tab sequentially
    await tabButton(page, "Reports").click();
    await page.waitForTimeout(300);
    await expect(tabButton(page, "Reports")).toBeVisible();

    await tabButton(page, "Borrowing Base").click();
    await page.waitForTimeout(300);
    await expect(tabButton(page, "Borrowing Base")).toBeVisible();

    await tabButton(page, "Reconciliation").click();
    await page.waitForTimeout(300);
    await expect(tabButton(page, "Reconciliation")).toBeVisible();

    await tabButton(page, "Upload").click();
    await page.waitForTimeout(300);

    // All tabs should still be visible (page didn't crash)
    await expect(tabButton(page, "Upload")).toBeVisible();
    await expect(tabButton(page, "Reports")).toBeVisible();
    await expect(tabButton(page, "Borrowing Base")).toBeVisible();
    await expect(tabButton(page, "Reconciliation")).toBeVisible();
  });

});
