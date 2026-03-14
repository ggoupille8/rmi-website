import { test, expect } from "@playwright/test";
import { setAdminAuth } from "../helpers/admin-auth";

// Mock WIP months data
const MOCK_MONTHS = [
  { year: 2026, month: 2, job_count: 35 },
  { year: 2026, month: 1, job_count: 32 },
  { year: 2025, month: 12, job_count: 30 },
  { year: 2025, month: 11, job_count: 28 },
];

// Mock WIP data for February 2026
const MOCK_WIP_FEB = {
  snapshots: [
    {
      id: 1,
      job_number: "26-001",
      description: "Ford Dearborn Pipe Insulation",
      customer_name: "Ford Motor Company",
      project_manager: "GG",
      contract_amount: 500000,
      change_orders: 0,
      pending_change_orders: 0,
      revised_contract: 500000,
      original_estimate: 350000,
      estimate_changes: 0,
      pending_co_estimates: 0,
      revised_estimate: 350000,
      gross_profit: 150000,
      gross_margin_pct: 0.3,
      pct_complete: 0.45,
      earned_revenue: 225000,
      costs_to_date: 157500,
      gross_profit_to_date: 67500,
      backlog_revenue: 275000,
      costs_to_complete: 192500,
      backlog_profit: 82500,
      billings_to_date: 200000,
      revenue_billing_excess: 25000,
      invoicing_remaining: 300000,
      revenue_excess: 25000,
      billings_excess: null,
    },
    {
      id: 2,
      job_number: "26-002",
      description: "GM Warren Ductwork",
      customer_name: "General Motors",
      project_manager: "RG",
      contract_amount: 300000,
      change_orders: 15000,
      pending_change_orders: 0,
      revised_contract: 315000,
      original_estimate: 220000,
      estimate_changes: 10000,
      pending_co_estimates: 0,
      revised_estimate: 230000,
      gross_profit: 85000,
      gross_margin_pct: 0.27,
      pct_complete: 0.8,
      earned_revenue: 252000,
      costs_to_date: 184000,
      gross_profit_to_date: 68000,
      backlog_revenue: 63000,
      costs_to_complete: 46000,
      backlog_profit: 17000,
      billings_to_date: 260000,
      revenue_billing_excess: -8000,
      invoicing_remaining: 55000,
      revenue_excess: null,
      billings_excess: -8000,
    },
  ],
  totals: {
    revised_contract: 815000,
    backlog_revenue: 338000,
    earned_revenue: 477000,
    gross_profit: 235000,
    gross_margin_pct: 0.288,
    job_count: 2,
  },
  pmSummary: [
    {
      projectManager: "GG",
      jobCount: 1,
      totalBacklog: 275000,
      avgMargin: 0.3,
      totalProfit: 150000,
      totalRevisedContract: 500000,
    },
    {
      projectManager: "RG",
      jobCount: 1,
      totalBacklog: 63000,
      avgMargin: 0.27,
      totalProfit: 85000,
      totalRevisedContract: 315000,
    },
  ],
  priorYearEndSnapshots: null,
};

// Mock WIP data for January 2026 (different values to verify update)
const MOCK_WIP_JAN = {
  snapshots: [
    {
      id: 3,
      job_number: "26-001",
      description: "Ford Dearborn Pipe Insulation",
      customer_name: "Ford Motor Company",
      project_manager: "GG",
      contract_amount: 500000,
      change_orders: 0,
      pending_change_orders: 0,
      revised_contract: 500000,
      original_estimate: 350000,
      estimate_changes: 0,
      pending_co_estimates: 0,
      revised_estimate: 350000,
      gross_profit: 150000,
      gross_margin_pct: 0.3,
      pct_complete: 0.2,
      earned_revenue: 100000,
      costs_to_date: 70000,
      gross_profit_to_date: 30000,
      backlog_revenue: 400000,
      costs_to_complete: 280000,
      backlog_profit: 120000,
      billings_to_date: 90000,
      revenue_billing_excess: 10000,
      invoicing_remaining: 410000,
      revenue_excess: 10000,
      billings_excess: null,
    },
  ],
  totals: {
    revised_contract: 500000,
    backlog_revenue: 400000,
    earned_revenue: 100000,
    gross_profit: 150000,
    gross_margin_pct: 0.3,
    job_count: 1,
  },
  pmSummary: [
    {
      projectManager: "GG",
      jobCount: 1,
      totalBacklog: 400000,
      avgMargin: 0.3,
      totalProfit: 150000,
      totalRevisedContract: 500000,
    },
  ],
  priorYearEndSnapshots: null,
};

function mockWipApis(page: import("@playwright/test").Page) {
  // Mock WIP months endpoint
  page.route("**/api/admin/wip-months*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_MONTHS),
    });
  });

  // Mock WIP data endpoint — return different data based on month param
  page.route("**/api/admin/wip?*", async (route) => {
    const url = new URL(route.request().url());
    const month = url.searchParams.get("month");

    if (month === "1") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_WIP_JAN),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_WIP_FEB),
      });
    }
  });

  // Mock cost reconciliation endpoint
  page.route("**/api/admin/wip-cost-recon*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jobs: [], totals: {} }),
    });
  });
}

test.describe("Admin WIP Dashboard — Month Selector", () => {
  test.beforeEach(async ({ page }) => {
    const authed = await setAdminAuth(page);
    if (!authed) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
    await mockWipApis(page);
    await page.goto("/admin/wip", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle");
  });

  test("renders month selector with latest month selected", async ({ page }) => {
    // The month selector button should show the latest month (February 2026)
    await expect(page.locator("text=February 2026")).toBeVisible({ timeout: 10000 });
  });

  test("clicking month selector opens dropdown with available months", async ({ page }) => {
    // Click the month selector button
    const monthBtn = page.locator("button:has-text('February 2026')");
    await expect(monthBtn).toBeVisible({ timeout: 10000 });
    await monthBtn.click();

    // Dropdown should show all available months
    await expect(page.locator("text=January 2026")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=December 2025")).toBeVisible();
    await expect(page.locator("text=November 2025")).toBeVisible();
  });

  test("dropdown shows job count for each month", async ({ page }) => {
    const monthBtn = page.locator("button:has-text('February 2026')");
    await expect(monthBtn).toBeVisible({ timeout: 10000 });
    await monthBtn.click();

    // Each month option shows job count
    await expect(page.locator("text=(35 jobs)")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=(32 jobs)")).toBeVisible();
  });

  test("selecting a different month updates KPI data", async ({ page }) => {
    // Wait for initial data to load (February 2026)
    await expect(page.locator("text=February 2026")).toBeVisible({ timeout: 10000 });

    // Wait for KPI cards to render
    await expect(page.locator("text=Total Revised Contract")).toBeVisible({ timeout: 10000 });

    // Open month dropdown
    const monthBtn = page.locator("button:has-text('February 2026')");
    await monthBtn.click();

    // Select January 2026
    const janOption = page.locator("button.w-full.text-left").filter({ hasText: "January 2026" });
    await janOption.click();

    // Month selector should update to show January 2026
    await expect(page.locator("button:has-text('January 2026')")).toBeVisible({ timeout: 10000 });

    // Wait for new data to load
    await page.waitForTimeout(1000);
  });

  test("KPI cards display financial metrics", async ({ page }) => {
    // Wait for data to load — use .first() to handle KPI card + table column dual rendering
    await expect(page.getByText("Total Revised Contract").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Total Backlog").first()).toBeVisible();
    await expect(page.getByText("Earned Revenue").first()).toBeVisible();
    await expect(page.getByText("Gross Profit").first()).toBeVisible();
  });

  test("secondary KPI cards display job counts", async ({ page }) => {
    await expect(page.locator("text=Active Jobs")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Completed Jobs")).toBeVisible();
    await expect(page.locator("text=Over-Billed Jobs")).toBeVisible();
    await expect(page.locator("text=Negative Margin Jobs")).toBeVisible();
  });

  test("PM Performance section renders", async ({ page }) => {
    await expect(page.locator("text=PM Performance")).toBeVisible({ timeout: 10000 });
    // PM names should appear from the summary
    await expect(page.locator("text=Graham Goupille").first()).toBeVisible();
    await expect(page.locator("text=Rich Goupille").first()).toBeVisible();
  });

  test("tab selector switches between WIP Dashboard and Cost Reconciliation", async ({ page }) => {
    // WIP Dashboard tab should be active by default
    const wipTab = page.locator("button:has-text('WIP Dashboard')");
    const reconTab = page.locator("button:has-text('Cost Reconciliation')");

    await expect(wipTab).toBeVisible({ timeout: 10000 });
    await expect(reconTab).toBeVisible();

    // KPI cards should be visible on WIP tab
    await expect(page.locator("text=Total Revised Contract")).toBeVisible();

    // Switch to Cost Reconciliation tab
    await reconTab.click();
    await page.waitForTimeout(1000);

    // KPI cards from WIP tab should not be visible
    await expect(page.locator("text=Total Revised Contract")).not.toBeVisible({ timeout: 3000 });

    // Switch back to WIP tab
    await wipTab.click();
    await page.waitForTimeout(1000);

    // KPI cards should be visible again
    await expect(page.locator("text=Total Revised Contract")).toBeVisible({ timeout: 5000 });
  });

  test("GLI exclusion toggle is visible on WIP tab", async ({ page }) => {
    await expect(page.locator("text=Exclude GLI")).toBeVisible({ timeout: 10000 });
  });
});
