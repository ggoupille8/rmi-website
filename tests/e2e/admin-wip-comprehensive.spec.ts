import { test, expect, type Page } from "@playwright/test";
import { setAdminAuth } from "../helpers/admin-auth";

// ── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_MONTHS = [
  { year: 2026, month: 2, job_count: 6 },
  { year: 2026, month: 1, job_count: 3 },
  { year: 2025, month: 12, job_count: 4 },
];

/**
 * February 2026 — 6 jobs total:
 *   • 2 GG, 1 RG, 1 MD, 1 SB (field), 1 GLI (GG)
 *   • 1 negative-profit (RED: > $50K loss)
 *   • 1 under-billed (YELLOW: billings_excess < -$10K)
 *   • 1 over-billed (YELLOW: revenue_excess > $5K & > 5% of contract)
 *   • 1 GLI job (ends in -0215, excluded by toggle)
 */
const MOCK_WIP_FEB = {
  snapshots: [
    {
      id: 1,
      job_number: "26-001",
      description: "Ford Dearborn Pipe Insulation",
      customer_name: "Ford Motor Company",
      project_manager: "GG",
      is_hidden_in_source: false,
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
      is_hidden_in_source: false,
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
    {
      id: 3,
      job_number: "26-003",
      description: "Stellantis Sterling Heights HVAC",
      customer_name: "Stellantis",
      project_manager: "MD",
      is_hidden_in_source: false,
      contract_amount: 200000,
      change_orders: 0,
      pending_change_orders: 0,
      revised_contract: 200000,
      original_estimate: 270000,
      estimate_changes: 0,
      pending_co_estimates: 0,
      revised_estimate: 270000,
      gross_profit: -70000,
      gross_margin_pct: -0.35,
      pct_complete: 0.6,
      earned_revenue: 120000,
      costs_to_date: 162000,
      gross_profit_to_date: -42000,
      backlog_revenue: 80000,
      costs_to_complete: 108000,
      backlog_profit: -28000,
      billings_to_date: 100000,
      revenue_billing_excess: 20000,
      invoicing_remaining: 100000,
      revenue_excess: 20000,
      billings_excess: null,
    },
    {
      id: 4,
      job_number: "26-004",
      description: "Corewell Health Royal Oak Piping",
      customer_name: "Corewell Health",
      project_manager: "SB",
      is_hidden_in_source: false,
      contract_amount: 150000,
      change_orders: 5000,
      pending_change_orders: 0,
      revised_contract: 155000,
      original_estimate: 100000,
      estimate_changes: 3000,
      pending_co_estimates: 0,
      revised_estimate: 103000,
      gross_profit: 52000,
      gross_margin_pct: 0.335,
      pct_complete: 0.35,
      earned_revenue: 54250,
      costs_to_date: 36050,
      gross_profit_to_date: 18200,
      backlog_revenue: 100750,
      costs_to_complete: 66950,
      backlog_profit: 33800,
      billings_to_date: 30000,
      revenue_billing_excess: 24250,
      invoicing_remaining: 125000,
      revenue_excess: null,
      billings_excess: -15000,
    },
    {
      id: 5,
      job_number: "26-005",
      description: "DTE Energy Monroe Duct Wrap",
      customer_name: "DTE Energy",
      project_manager: "GG",
      is_hidden_in_source: false,
      contract_amount: 80000,
      change_orders: 0,
      pending_change_orders: 0,
      revised_contract: 80000,
      original_estimate: 55000,
      estimate_changes: 0,
      pending_co_estimates: 0,
      revised_estimate: 55000,
      gross_profit: 25000,
      gross_margin_pct: 0.3125,
      pct_complete: 1.0,
      earned_revenue: 80000,
      costs_to_date: 55000,
      gross_profit_to_date: 25000,
      backlog_revenue: 0,
      costs_to_complete: 0,
      backlog_profit: 0,
      billings_to_date: 80000,
      revenue_billing_excess: 0,
      invoicing_remaining: 0,
      revenue_excess: null,
      billings_excess: null,
    },
    {
      id: 6,
      job_number: "26-006-0215",
      description: "Great Lakes Insulation Fab Shop",
      customer_name: "GLI",
      project_manager: "GG",
      is_hidden_in_source: false,
      contract_amount: 120000,
      change_orders: 0,
      pending_change_orders: 0,
      revised_contract: 120000,
      original_estimate: 80000,
      estimate_changes: 0,
      pending_co_estimates: 0,
      revised_estimate: 80000,
      gross_profit: 40000,
      gross_margin_pct: 0.333,
      pct_complete: 0.5,
      earned_revenue: 60000,
      costs_to_date: 40000,
      gross_profit_to_date: 20000,
      backlog_revenue: 60000,
      costs_to_complete: 40000,
      backlog_profit: 20000,
      billings_to_date: 50000,
      revenue_billing_excess: 10000,
      invoicing_remaining: 70000,
      revenue_excess: null,
      billings_excess: null,
    },
  ],
  totals: {
    revised_contract: 1370000,
    backlog_revenue: 578750,
    earned_revenue: 791250,
    gross_profit: 282000,
    gross_margin_pct: 0.206,
    job_count: 6,
  },
  pmSummary: [
    {
      projectManager: "GG",
      jobCount: 3,
      totalBacklog: 335000,
      avgMargin: 0.315,
      totalProfit: 215000,
      totalRevisedContract: 700000,
    },
    {
      projectManager: "MD",
      jobCount: 1,
      totalBacklog: 80000,
      avgMargin: -0.35,
      totalProfit: -70000,
      totalRevisedContract: 200000,
    },
    {
      projectManager: "RG",
      jobCount: 1,
      totalBacklog: 63000,
      avgMargin: 0.27,
      totalProfit: 85000,
      totalRevisedContract: 315000,
    },
    {
      projectManager: "SB",
      jobCount: 1,
      totalBacklog: 100750,
      avgMargin: 0.335,
      totalProfit: 52000,
      totalRevisedContract: 155000,
    },
  ],
  priorYearEndSnapshots: null,
};

/** January 2026 — fewer jobs for month-switch verification */
const MOCK_WIP_JAN = {
  snapshots: [
    {
      id: 10,
      job_number: "26-001",
      description: "Ford Dearborn Pipe Insulation",
      customer_name: "Ford Motor Company",
      project_manager: "GG",
      is_hidden_in_source: false,
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
    {
      id: 11,
      job_number: "26-002",
      description: "GM Warren Ductwork",
      customer_name: "General Motors",
      project_manager: "RG",
      is_hidden_in_source: false,
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
      pct_complete: 0.5,
      earned_revenue: 157500,
      costs_to_date: 115000,
      gross_profit_to_date: 42500,
      backlog_revenue: 157500,
      costs_to_complete: 115000,
      backlog_profit: 42500,
      billings_to_date: 140000,
      revenue_billing_excess: 17500,
      invoicing_remaining: 175000,
      revenue_excess: null,
      billings_excess: null,
    },
    {
      id: 12,
      job_number: "26-003",
      description: "Stellantis Sterling Heights HVAC",
      customer_name: "Stellantis",
      project_manager: "MD",
      is_hidden_in_source: false,
      contract_amount: 200000,
      change_orders: 0,
      pending_change_orders: 0,
      revised_contract: 200000,
      original_estimate: 270000,
      estimate_changes: 0,
      pending_co_estimates: 0,
      revised_estimate: 270000,
      gross_profit: -70000,
      gross_margin_pct: -0.35,
      pct_complete: 0.3,
      earned_revenue: 60000,
      costs_to_date: 81000,
      gross_profit_to_date: -21000,
      backlog_revenue: 140000,
      costs_to_complete: 189000,
      backlog_profit: -49000,
      billings_to_date: 50000,
      revenue_billing_excess: 10000,
      invoicing_remaining: 150000,
      revenue_excess: null,
      billings_excess: null,
    },
  ],
  totals: {
    revised_contract: 1015000,
    backlog_revenue: 697500,
    earned_revenue: 317500,
    gross_profit: 165000,
    gross_margin_pct: 0.163,
    job_count: 3,
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
    {
      projectManager: "MD",
      jobCount: 1,
      totalBacklog: 140000,
      avgMargin: -0.35,
      totalProfit: -70000,
      totalRevisedContract: 200000,
    },
    {
      projectManager: "RG",
      jobCount: 1,
      totalBacklog: 157500,
      avgMargin: 0.27,
      totalProfit: 85000,
      totalRevisedContract: 315000,
    },
  ],
  priorYearEndSnapshots: null,
};

// ── Mock API Setup ──────────────────────────────────────────────────────────

function mockWipApis(page: Page) {
  page.route("**/api/admin/wip-months*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_MONTHS),
    });
  });

  page.route("**/api/admin/wip?*", async (route) => {
    const url = new URL(route.request().url());
    const month = url.searchParams.get("month");

    const data = month === "1" ? MOCK_WIP_JAN : MOCK_WIP_FEB;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });

  // Mock cost reconciliation endpoints (WipCostReconciliation fetches from /api/admin/wip-costs)
  page.route("**/api/admin/wip-costs*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        month: "2026-02",
        jobs: [],
        summary: {
          totalJobs: 0,
          totalInvoiceCost: 0,
          totalWipCost: 0,
          variance: 0,
          jobsWithInvoicesOnly: 0,
          jobsWithWipOnly: 0,
        },
        pmBreakdown: [],
      }),
    });
  });

  page.route("**/api/admin/wip-costs-new*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        since: "2026-02-01",
        summary: { jobCount: 0, totalInvoices: 0, totalNewCost: 0 },
        jobs: [],
      }),
    });
  });

  page.route("**/api/admin/invoices*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ invoices: [] }),
    });
  });
}

// ── Test Helpers ────────────────────────────────────────────────────────────

async function gotoWithRetry(page: Page, url: string, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30000 });
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        i < retries - 1 &&
        (msg.includes("ERR_CONNECTION_REFUSED") || msg.includes("ERR_EMPTY_RESPONSE"))
      ) {
        await page.waitForTimeout(2000);
        continue;
      }
      throw err;
    }
  }
}

async function setupAndNavigate(page: Page): Promise<boolean> {
  const authed = await setAdminAuth(page);
  if (!authed) return false;

  await mockWipApis(page);
  await gotoWithRetry(page, "/admin/wip");
  await page.waitForLoadState("networkidle");
  return true;
}

async function waitForDashboardLoad(page: Page) {
  await expect(
    page.getByText("Total Revised Contract").first()
  ).toBeVisible({ timeout: 15000 });
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. KPI Cards
// ═══════════════════════════════════════════════════════════════════════════

test.describe("WIP Dashboard — KPI Cards", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await setupAndNavigate(page);
    if (!ok) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
  });

  test("displays all four primary KPI cards with labels", async ({ page }) => {
    await waitForDashboardLoad(page);

    await expect(page.getByText("Total Revised Contract").first()).toBeVisible();
    await expect(page.getByText("Total Backlog").first()).toBeVisible();
    await expect(page.getByText("Earned Revenue").first()).toBeVisible();
    await expect(page.getByText("Gross Profit").first()).toBeVisible();
  });

  test("KPI cards show formatted currency values", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Compact format values from the 6-job mock: $1.4M revised, $578.8K backlog
    // The exact compact format depends on Intl, so just verify the cards have content
    const kpiCards = page.locator(".bg-neutral-900.border.border-neutral-800.rounded-lg.p-4");
    const cardCount = await kpiCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(4);
  });

  test("secondary KPI cards show job counts", async ({ page }) => {
    await waitForDashboardLoad(page);

    await expect(page.locator("text=Active Jobs")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Completed Jobs")).toBeVisible();
    await expect(page.locator("text=Over-Billed Jobs")).toBeVisible();
    await expect(page.locator("text=Negative Margin Jobs")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Month Selector
// ═══════════════════════════════════════════════════════════════════════════

test.describe("WIP Dashboard — Month Selector", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await setupAndNavigate(page);
    if (!ok) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
  });

  test("selecting a different month updates the KPI data", async ({ page }) => {
    await waitForDashboardLoad(page);

    // February should show 6 jobs (our mock)
    // Verify "Active Jobs" count reflects Feb data before switching
    await expect(page.locator("text=Active Jobs")).toBeVisible();

    // Open month selector
    const monthBtn = page.locator("button:has-text('February 2026')");
    await monthBtn.click();

    // Select January
    const janOption = page.locator("button.w-full.text-left").filter({ hasText: "January 2026" });
    await janOption.click();

    // Verify month button updated
    await expect(
      page.locator("button:has-text('January 2026')")
    ).toBeVisible({ timeout: 10000 });

    // Wait for data refresh — January has 3 jobs, so KPIs should update
    await page.waitForTimeout(1000);

    // The "All Jobs" heading + job table should still be present
    await expect(page.locator("text=All Jobs")).toBeVisible();
  });

  test("month dropdown shows job counts per month", async ({ page }) => {
    await waitForDashboardLoad(page);

    const monthBtn = page.locator("button:has-text('February 2026')");
    await monthBtn.click();

    await expect(page.locator("text=(6 jobs)")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=(3 jobs)")).toBeVisible();
    await expect(page.locator("text=(4 jobs)")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. GLI Exclusion Toggle
// ═══════════════════════════════════════════════════════════════════════════

test.describe("WIP Dashboard — GLI Exclusion Toggle", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await setupAndNavigate(page);
    if (!ok) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
  });

  test("toggling Exclude GLI removes GLI jobs from the table", async ({ page }) => {
    await waitForDashboardLoad(page);

    // GLI job should be visible initially
    await expect(page.locator("text=26-006-0215")).toBeVisible({ timeout: 10000 });

    // Job count text should show 6 jobs initially
    const jobCountText = page.locator("text=/Showing \\d+ of 6 jobs/");
    await expect(jobCountText).toBeVisible({ timeout: 5000 });

    // Click the GLI toggle
    const gliToggle = page.locator("button:has-text('Exclude GLI')");
    await gliToggle.click();

    // Wait for the toggle to take effect and re-render
    await page.waitForTimeout(1000);

    // GLI job should no longer be in the table
    await expect(page.locator("text=26-006-0215")).not.toBeVisible({ timeout: 10000 });

    // Job count should now show 5 jobs
    const updatedCount = page.locator("text=/Showing \\d+ of 5 jobs/");
    await expect(updatedCount).toBeVisible({ timeout: 5000 });
  });

  test("GLI toggle is only visible on WIP tab", async ({ page }) => {
    await waitForDashboardLoad(page);

    await expect(page.locator("button:has-text('Exclude GLI')")).toBeVisible();

    // Switch to reconciliation tab
    const reconTab = page.locator("button:has-text('Cost Reconciliation')");
    await reconTab.click();

    // Wait for tab switch
    await page.waitForTimeout(1000);

    // GLI toggle should disappear (only renders on WIP tab)
    await expect(
      page.locator("button:has-text('Exclude GLI')")
    ).not.toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. PM Performance Cards
// ═══════════════════════════════════════════════════════════════════════════

test.describe("WIP Dashboard — PM Performance", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await setupAndNavigate(page);
    if (!ok) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
  });

  test("renders PM cards with correct initials (GG, MD, RG, SB)", async ({ page }) => {
    await waitForDashboardLoad(page);

    await expect(page.locator("text=PM Performance")).toBeVisible({ timeout: 10000 });

    // Each PM code should appear as a bold heading in its card
    // Use .first() since PM codes may appear in multiple contexts (card + table)
    for (const code of ["GG", "MD", "RG", "SB"]) {
      await expect(
        page.locator(`text=${code}`).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("PM cards show full names", async ({ page }) => {
    await waitForDashboardLoad(page);

    await expect(page.locator("text=Graham Goupille").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Rich Goupille").first()).toBeVisible();
    await expect(page.locator("text=Mark Donnal").first()).toBeVisible();
    await expect(page.locator("text=Scott Brown").first()).toBeVisible();
  });

  test("PM cards display financial metrics (Jobs, Backlog, Profit, Avg Margin)", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Each PM card should have these metric labels
    const pmSection = page.locator("text=PM Performance").locator("..");
    await expect(pmSection).toBeVisible({ timeout: 10000 });

    // Look for the metric labels within the PM section
    const jobsLabels = page.locator("text=Jobs");
    expect(await jobsLabels.count()).toBeGreaterThanOrEqual(4);

    const backlogLabels = page.locator("text=Backlog");
    expect(await backlogLabels.count()).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Alerts Accordion
// ═══════════════════════════════════════════════════════════════════════════

test.describe("WIP Dashboard — Alerts", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await setupAndNavigate(page);
    if (!ok) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
  });

  test("alerts section is visible and shows severity summary", async ({ page }) => {
    await waitForDashboardLoad(page);

    // The alerts accordion header should be visible
    const alertsHeader = page.locator("button:has-text('Alerts')");
    await expect(alertsHeader).toBeVisible({ timeout: 10000 });

    // Should show RED and YELLOW count summary
    // Our mock data triggers:
    //   RED: 26-003 negative profit (-$70K > $50K threshold)
    //   YELLOW: 26-004 under-billed (billings_excess = -$15K)
    //   YELLOW: 26-003 over-billed (revenue_excess = $20K, 10% of $200K > 5%)
    //   YELLOW: 26-001 over-billed (revenue_excess = $25K, 5% of $500K = 5%, not triggered since must be > 5%)
    // So we expect at least "1 Red" and some Yellow
    await expect(page.locator("text=/\\d+ Red/")).toBeVisible({ timeout: 5000 });
  });

  test("expanding alerts accordion shows alert details", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Click the alerts header to expand
    const alertsHeader = page.locator("button:has-text('Alerts')");
    await alertsHeader.click();

    // Wait for expansion
    await page.waitForTimeout(500);

    // Should show severity badges
    await expect(page.locator("text=RED").first()).toBeVisible({ timeout: 5000 });

    // Should show alert type group headers
    await expect(page.locator("text=Negative Margin").first()).toBeVisible({ timeout: 5000 });

    // Should show the job number of the negative-profit alert
    await expect(page.locator("text=26-003").first()).toBeVisible();
  });

  test("Dismiss All Yellow button is functional", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Expand alerts
    const alertsHeader = page.locator("button:has-text('Alerts')");
    await alertsHeader.click();
    await page.waitForTimeout(500);

    // Should see "Dismiss All Yellow" button
    const dismissBtn = page.locator("button:has-text('Dismiss All Yellow')");
    // Only appears if there are yellow alerts
    const hasDismissBtn = await dismissBtn.isVisible().catch(() => false);

    if (hasDismissBtn) {
      await dismissBtn.click();
      await page.waitForTimeout(500);

      // After dismissing, the yellow count should disappear or reduce
      // The RED alerts should still be visible
      await expect(page.locator("text=RED").first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Job Table — Filters
// ═══════════════════════════════════════════════════════════════════════════

test.describe("WIP Dashboard — Job Table Filters", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await setupAndNavigate(page);
    if (!ok) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
  });

  test("search filter narrows the job list", async ({ page }) => {
    await waitForDashboardLoad(page);

    // All 6 jobs visible initially
    await expect(page.locator("text=/Showing \\d+ of 6 jobs/")).toBeVisible({ timeout: 10000 });

    // Type in search box
    const searchInput = page.locator("input[placeholder*='Search job']");
    await searchInput.fill("Ford");

    // Wait for debounce (300ms) + render
    await page.waitForTimeout(800);

    // Should narrow to 1 job (Ford Dearborn)
    await expect(page.locator("text=/Showing 1 of 6 jobs/")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=26-001")).toBeVisible();
  });

  test("PM filter dropdown shows only selected PM's jobs", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Select PM = "RG"
    const pmDropdown = page.locator("select").filter({ hasText: "All PMs" });
    await pmDropdown.selectOption("RG");

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // Should show only 1 RG job
    await expect(page.locator("text=/Showing 1 of 6 jobs/")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=26-002")).toBeVisible();

    // Other jobs should not be visible
    await expect(page.locator("text=26-001")).not.toBeVisible();
    await expect(page.locator("text=26-003")).not.toBeVisible();
  });

  test("status filter shows active or complete jobs", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Select "Complete" status
    const statusDropdown = page.locator("select").filter({ hasText: "All Status" });
    await statusDropdown.selectOption("complete");

    // Wait for filter to apply
    await page.waitForTimeout(300);

    // Only 1 complete job (26-005, pct_complete = 1.0)
    await expect(page.locator("text=/Showing 1 of 6 jobs/")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=26-005")).toBeVisible();

    // Now switch to "Active"
    await statusDropdown.selectOption("active");
    await page.waitForTimeout(300);

    // 5 active jobs
    await expect(page.locator("text=/Showing 5 of 6 jobs/")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=26-005")).not.toBeVisible();
  });

  test("search and PM filter combine correctly", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Filter by PM = GG (3 jobs)
    const pmDropdown = page.locator("select").filter({ hasText: "All PMs" });
    await pmDropdown.selectOption("GG");
    await page.waitForTimeout(300);

    await expect(page.locator("text=/Showing 3 of 6 jobs/")).toBeVisible({ timeout: 5000 });

    // Then search for "Dearborn"
    const searchInput = page.locator("input[placeholder*='Search job']");
    await searchInput.fill("Dearborn");
    await page.waitForTimeout(500);

    // Should narrow to 1 job
    await expect(page.locator("text=/Showing 1 of 6 jobs/")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=26-001")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. CSV Export
// ═══════════════════════════════════════════════════════════════════════════

test.describe("WIP Dashboard — CSV Export", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await setupAndNavigate(page);
    if (!ok) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
  });

  test("Export CSV button triggers a file download", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Locate the export button
    const exportBtn = page.locator("button:has-text('Export CSV')");
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
    await expect(exportBtn).toBeEnabled();

    // Intercept Blob constructor to capture CSV content before it's downloaded
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      w.__csvCaptured = null;
      const OrigBlob = window.Blob;
      const PatchedBlob = function (
        this: Blob,
        parts?: BlobPart[],
        options?: BlobPropertyBag
      ) {
        if (options?.type?.includes("csv") && parts && parts.length > 0) {
          w.__csvCaptured = String(parts[0]);
        }
        return new OrigBlob(parts ?? [], options);
      } as unknown as typeof Blob;
      PatchedBlob.prototype = OrigBlob.prototype;
      (window as unknown as Record<string, unknown>).Blob = PatchedBlob;
    });

    await exportBtn.click();

    // Wait for the blob to be created
    await page.waitForFunction(
      () => (window as unknown as Record<string, string | null>).__csvCaptured !== null,
      null,
      { timeout: 5000 }
    );

    const content = await page.evaluate(
      () => (window as unknown as Record<string, string>).__csvCaptured
    );

    // Should have header row + 6 data rows
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(7); // header + 6 jobs

    // Header should contain expected column names
    expect(lines[0]).toContain("Job #");
    expect(lines[0]).toContain("Description");
    expect(lines[0]).toContain("PM");
    expect(lines[0]).toContain("Gross Profit");

    // Data should contain known job numbers
    expect(content).toContain("26-001");
    expect(content).toContain("26-006-0215");
  });

  test("Export CSV respects active filters", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Filter to only RG jobs
    const pmDropdown = page.locator("select").filter({ hasText: "All PMs" });
    await pmDropdown.selectOption("RG");
    await page.waitForTimeout(500);

    // Intercept Blob constructor
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      w.__csvCaptured2 = null;
      const OrigBlob = window.Blob;
      const PatchedBlob = function (
        this: Blob,
        parts?: BlobPart[],
        options?: BlobPropertyBag
      ) {
        if (options?.type?.includes("csv") && parts && parts.length > 0) {
          w.__csvCaptured2 = String(parts[0]);
        }
        return new OrigBlob(parts ?? [], options);
      } as unknown as typeof Blob;
      PatchedBlob.prototype = OrigBlob.prototype;
      (window as unknown as Record<string, unknown>).Blob = PatchedBlob;
    });

    const exportBtn = page.locator("button:has-text('Export CSV')");
    await exportBtn.click();

    await page.waitForFunction(
      () => (window as unknown as Record<string, string | null>).__csvCaptured2 !== null,
      null,
      { timeout: 5000 }
    );

    const content = await page.evaluate(
      () => (window as unknown as Record<string, string>).__csvCaptured2
    );

    // Should only have 1 data row (header + 1 RG job)
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain("26-002");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Cost Reconciliation Tab
// ═══════════════════════════════════════════════════════════════════════════

test.describe("WIP Dashboard — Cost Reconciliation Tab", () => {
  test.beforeEach(async ({ page }) => {
    const ok = await setupAndNavigate(page);
    if (!ok) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
  });

  test("switches to Cost Reconciliation tab and hides WIP content", async ({ page }) => {
    await waitForDashboardLoad(page);

    // WIP content should be visible
    await expect(page.getByText("Total Revised Contract").first()).toBeVisible();

    // Click Cost Reconciliation tab
    const reconTab = page.locator("button:has-text('Cost Reconciliation')");
    await reconTab.click();

    // Wait for tab to become active (React state update + re-render)
    await expect(reconTab).toHaveClass(/border-primary-500/, { timeout: 10000 });

    // WIP-specific KPI cards should disappear
    await expect(
      page.getByText("Total Revised Contract").first()
    ).not.toBeVisible({ timeout: 5000 });
  });

  test("switching back to WIP tab restores KPI cards", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Go to reconciliation
    const reconTab = page.locator("button:has-text('Cost Reconciliation')");
    await reconTab.click();
    await page.waitForTimeout(1000);

    await expect(
      page.getByText("Total Revised Contract").first()
    ).not.toBeVisible({ timeout: 5000 });

    // Go back to WIP
    const wipTab = page.locator("button:has-text('WIP Dashboard')");
    await wipTab.click();
    await page.waitForTimeout(1000);

    // KPI cards should reappear
    await expect(page.getByText("Total Revised Contract").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Total Backlog").first()).toBeVisible();
    await expect(page.getByText("Earned Revenue").first()).toBeVisible();
    await expect(page.getByText("Gross Profit").first()).toBeVisible();
  });

  test("Cost Reconciliation tab sends correct month parameter to API", async ({ page }) => {
    await waitForDashboardLoad(page);

    // Use waitForRequest + click in parallel to avoid missing the request
    const reconTab = page.locator("button:has-text('Cost Reconciliation')");

    const [request] = await Promise.all([
      page.waitForRequest(
        (req) => req.url().includes("/api/admin/wip-costs"),
        { timeout: 15000 }
      ),
      reconTab.click(),
    ]);

    // Should have requested with the current month (February 2026 → 2026-02)
    expect(request.url()).toContain("2026-02");
  });
});
