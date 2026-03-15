import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import jwt from "jsonwebtoken";

// ─── Load .env for JWT secret ──────────────────────────────────────────────

function loadEnv(): void {
  const candidates = [".env.local", ".env"];
  for (const name of candidates) {
    const envPath = resolve(process.cwd(), name);
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed
        .substring(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const JWT_SECRET = process.env.ADMIN_JWT_SECRET;

// ─── Mock Data ─────────────────────────────────────────────────────────────

const REPORT_DATE = "2025-01-31";
const NOW_ISO = new Date().toISOString();

const MOCK_MONTHS = {
  arAging: [
    {
      report_date: REPORT_DATE,
      variant: "standard",
      source_filename: "AR_Aging_Jan2025.pdf",
      imported_at: NOW_ISO,
      customer_count: 12,
      total_amount: "485000.00",
      validation_passed: true,
    },
  ],
  balanceSheet: [
    {
      report_date: REPORT_DATE,
      variant: "standard",
      source_filename: "Balance_Sheet_Jan2025.pdf",
      imported_at: NOW_ISO,
      account_count: 45,
      total_assets: "1250000.00",
      validation_passed: true,
    },
  ],
  incomeStatement: [
    {
      period_end_date: REPORT_DATE,
      variant: "standard",
      source_filename: "Income_Statement_Jan2025.pdf",
      imported_at: NOW_ISO,
      account_count: 30,
      net_income: "125000.00",
      validation_passed: false,
    },
  ],
  borrowingBase: [
    {
      report_date: REPORT_DATE,
      variant: null,
      source_filename: "BBC_Jan2025.pdf",
      imported_at: NOW_ISO,
    },
  ],
};

const MOCK_AR_DETAIL = {
  snapshot: {
    report_date: REPORT_DATE,
    total_amount: "485000.00",
    total_current: "350000.00",
    total_retainage: "45000.00",
    customer_count: 12,
  },
  entries: [
    {
      customer_name: "ABC Construction",
      customer_code: "ABC",
      total_amount: "125000.00",
      current_amount: "100000.00",
      over_30: "15000.00",
      over_60: "5000.00",
      over_90: "3000.00",
      over_120: "2000.00",
      retainage: "10000.00",
      total_past_due: "25000.00",
    },
    {
      customer_name: "XYZ Builders",
      customer_code: "XYZ",
      total_amount: "85000.00",
      current_amount: "75000.00",
      over_30: "5000.00",
      over_60: "3000.00",
      over_90: "1000.00",
      over_120: "1000.00",
      retainage: "8000.00",
      total_past_due: "10000.00",
    },
  ],
};

const MOCK_BS_DETAIL = {
  snapshot: {
    report_date: REPORT_DATE,
    total_assets: "1250000.00",
    total_liabilities: "750000.00",
    total_equity: "500000.00",
    net_income: "125000.00",
    ar_balance: "485000.00",
    ar_retainage: "45000.00",
    costs_in_excess: "32000.00",
    billings_in_excess: "18000.00",
  },
  entries: [
    { account_number: "1000", account_name: "Cash", amount: "150000.00", section: "Assets", is_subtotal: false },
    { account_number: "1100", account_name: "Accounts Receivable", amount: "485000.00", section: "Assets", is_subtotal: false },
    { account_number: null, account_name: "Total Assets", amount: "1250000.00", section: "Assets", is_subtotal: true },
    { account_number: "2000", account_name: "Accounts Payable", amount: "200000.00", section: "Liabilities", is_subtotal: false },
    { account_number: null, account_name: "Total Liabilities", amount: "750000.00", section: "Liabilities", is_subtotal: true },
    { account_number: null, account_name: "Total Equity", amount: "500000.00", section: "Equity", is_subtotal: true },
  ],
};

const MOCK_PL_SUMMARY = {
  snapshots: [
    {
      period_end_date: REPORT_DATE,
      total_income: "800000.00",
      total_cost_of_sales: "550000.00",
      gross_margin: "250000.00",
      total_expenses: "125000.00",
      net_income: "125000.00",
    },
    {
      period_end_date: "2024-12-31",
      total_income: "720000.00",
      total_cost_of_sales: "500000.00",
      gross_margin: "220000.00",
      total_expenses: "110000.00",
      net_income: "110000.00",
    },
  ],
};

const MOCK_BBC = {
  records: [
    {
      id: 1,
      report_date: "2024-11-30",
      gross_ar: "450000.00",
      ar_over_90: "25000.00",
      eligible_ar: "400000.00",
      ar_advance_rate: "0.85",
      ar_availability: "340000.00",
      gross_inventory: "100000.00",
      inventory_advance_rate: "0.50",
      inventory_availability: "50000.00",
      total_borrowing_base: "390000.00",
      amount_borrowed: "200000.00",
      excess_availability: "190000.00",
      source_file: "BBC_Nov2024.pdf",
      imported_at: "2024-12-05T10:00:00Z",
    },
    {
      id: 2,
      report_date: "2024-12-31",
      gross_ar: "480000.00",
      ar_over_90: "20000.00",
      eligible_ar: "430000.00",
      ar_advance_rate: "0.85",
      ar_availability: "365500.00",
      gross_inventory: "110000.00",
      inventory_advance_rate: "0.50",
      inventory_availability: "55000.00",
      total_borrowing_base: "420500.00",
      amount_borrowed: "210000.00",
      excess_availability: "210500.00",
      source_file: "BBC_Dec2024.pdf",
      imported_at: "2025-01-05T10:00:00Z",
    },
    {
      id: 3,
      report_date: REPORT_DATE,
      gross_ar: "520000.00",
      ar_over_90: "15000.00",
      eligible_ar: "470000.00",
      ar_advance_rate: "0.85",
      ar_availability: "399500.00",
      gross_inventory: "120000.00",
      inventory_advance_rate: "0.50",
      inventory_availability: "60000.00",
      total_borrowing_base: "459500.00",
      amount_borrowed: "220000.00",
      excess_availability: "239500.00",
      source_file: "BBC_Jan2025.pdf",
      imported_at: "2025-02-05T10:00:00Z",
    },
  ],
};

const MOCK_RECONCILIATION = {
  reportDate: REPORT_DATE,
  tieOuts: [
    {
      description: "AR Balance",
      sourceA: { name: "AR Aging Total", value: 485000 },
      sourceB: { name: "BS AR Account", value: 485000 },
      variance: 0,
      status: "match",
    },
    {
      description: "AR Retainage",
      sourceA: { name: "AR Aging Retainage", value: 45000 },
      sourceB: { name: "BS AR Retainage", value: 45000 },
      variance: 0,
      status: "match",
    },
    {
      description: "Revenue in Excess",
      sourceA: { name: "WIP CIE", value: null },
      sourceB: { name: "BS Costs in Excess", value: 32000 },
      variance: null,
      status: "missing_data",
    },
    {
      description: "Billings in Excess",
      sourceA: { name: "WIP BIE", value: null },
      sourceB: { name: "BS Billings in Excess", value: 18000 },
      variance: null,
      status: "missing_data",
    },
    {
      description: "Net Income",
      sourceA: { name: "Income Statement", value: 125000 },
      sourceB: { name: "Balance Sheet", value: 125000 },
      variance: 0,
      status: "match",
    },
  ],
  dataSources: {
    arAging: { date: REPORT_DATE, filename: "AR_Aging_Jan2025.pdf" },
    balanceSheet: { date: REPORT_DATE, filename: "Balance_Sheet_Jan2025.pdf" },
    incomeStatement: { date: REPORT_DATE, filename: "Income_Statement_Jan2025.pdf" },
    wip: null,
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

async function setupAdminAuth(page: Page): Promise<void> {
  if (!JWT_SECRET) return;
  const token = jwt.sign({ sub: "admin" }, JWT_SECRET, { expiresIn: "8h" });
  await page.context().addCookies([
    {
      name: "rmi_admin_session",
      value: token,
      domain: "localhost",
      path: "/",
    },
  ]);
}

async function mockApiRoutes(page: Page): Promise<void> {
  // Single handler for ALL API routes — avoids route ordering issues
  await page.route(/\/api\//, async (route) => {
    const url = new URL(route.request().url());

    // Financials API
    if (url.pathname === "/api/admin/financials") {
      const action = url.searchParams.get("action");

      if (!action) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_MONTHS),
        });
        return;
      }

      if (action === "detail") {
        const type = url.searchParams.get("type");
        const data =
          type === "ar_aging"
            ? MOCK_AR_DETAIL
            : type === "balance_sheet"
              ? MOCK_BS_DETAIL
              : type === "income_statement"
                ? { snapshot: MOCK_PL_SUMMARY.snapshots[0], entries: [] }
                : {};
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
        return;
      }

      if (action === "pl_summary") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PL_SUMMARY),
        });
        return;
      }

      if (action === "borrowing_base") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_BBC),
        });
        return;
      }

      if (action === "reconciliation") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_RECONCILIATION),
        });
        return;
      }
    }

    // Catch-all for any API route
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────

test.describe("Admin Financials Page", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    test.skip(!JWT_SECRET, "ADMIN_JWT_SECRET not set");
    await setupAdminAuth(page);
    await mockApiRoutes(page);
    await page.goto("/admin/financials");
    // Wait for Import History — confirms data fetch completed and component fully rendered
    await expect(page.locator("text=Import History")).toBeVisible({
      timeout: 15000,
    });
  });

  test("Upload tab renders with drag-and-drop zone and import history table", async ({
    page,
  }) => {
    // Drop zone
    await expect(
      page.locator("text=Drop PDF files here or click to browse"),
    ).toBeVisible();
    await expect(
      page.locator(
        "text=Supports AR Aging, Balance Sheet, Income Statement, and Borrowing Base reports",
      ),
    ).toBeVisible();

    // Hidden file input
    await expect(
      page.locator('input[type="file"][accept=".pdf"]'),
    ).toBeAttached();

    // Import History heading and table
    await expect(page.locator("text=Import History")).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("Reports tab renders P&L summary, Balance Sheet, and revenue chart", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Reports" }).click();

    // AR Aging is default sub-tab — check KPIs
    await expect(page.locator("text=Total AR")).toBeVisible({
      timeout: 15000,
    });
    // "Retainage" appears in both KPI label and table header — use .first()
    await expect(page.locator("text=Retainage").first()).toBeVisible();

    // Switch to Balance Sheet sub-tab
    await page.getByRole("button", { name: "Balance Sheet" }).click();
    await expect(page.locator("text=Total Assets").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=Total Liabilities").first()).toBeVisible();

    // Switch to Income Statement / P&L
    await page.getByRole("button", { name: "Income Statement" }).click();
    await expect(page.locator("text=P&L Summary")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=Revenue").first()).toBeVisible();

    // Revenue trend chart renders (requires >= 2 snapshots in mock)
    await expect(page.locator(".recharts-wrapper")).toBeVisible({
      timeout: 15000,
    });
  });

  test("Borrowing Base tab renders trend chart and data table with data", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Borrowing Base" }).click();

    // Trend chart heading
    await expect(page.locator("text=Borrowing Base Trend")).toBeVisible({
      timeout: 15000,
    });

    // Recharts chart container
    await expect(page.locator(".recharts-wrapper")).toBeVisible();

    // Data table headers
    await expect(
      page.getByRole("columnheader", { name: "Eligible AR", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Ineligible AR" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Advance Rate" }),
    ).toBeVisible();

    // Table should have 3 data rows (one per BBC record)
    const dataRows = page.locator("tbody tr");
    await expect(dataRows).toHaveCount(3);
  });

  test("Reconciliation tab loads with tie-out table", async ({ page }) => {
    await page.getByRole("button", { name: "Reconciliation" }).click();

    // Health score summary
    await expect(page.locator("text=tie-outs match")).toBeVisible({
      timeout: 15000,
    });

    // Tie-out table headers
    await expect(page.locator("th", { hasText: "Tie-Out" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Variance" })).toBeVisible();
    await expect(page.locator("th", { hasText: "Status" })).toBeVisible();

    // Match threshold footnote
    await expect(page.locator("text=Match threshold")).toBeVisible();
  });

  test("Tab switching shows correct content for each tab", async ({
    page,
  }) => {
    // Upload tab (default) — drop zone visible
    await expect(
      page.locator("text=Drop PDF files here or click to browse"),
    ).toBeVisible();

    // Switch to Reports
    await page.getByRole("button", { name: "Reports" }).click();
    await expect(page.locator("text=Total AR")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator("text=Drop PDF files here or click to browse"),
    ).not.toBeVisible();

    // Switch to Borrowing Base
    await page.getByRole("button", { name: "Borrowing Base" }).click();
    await expect(page.locator("text=Borrowing Base Trend")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator("text=Total AR")).not.toBeVisible();

    // Switch to Reconciliation
    await page.getByRole("button", { name: "Reconciliation" }).click();
    await expect(page.locator("text=tie-outs match")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      page.locator("text=Borrowing Base Trend"),
    ).not.toBeVisible();

    // Switch back to Upload
    await page.getByRole("button", { name: "Upload" }).click();
    await expect(
      page.locator("text=Drop PDF files here or click to browse"),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=tie-outs match")).not.toBeVisible();
  });

  test("Import history table shows correct columns", async ({ page }) => {
    await expect(page.locator("text=Import History")).toBeVisible();

    const headerRow = page.locator("table thead tr");
    const expectedColumns = [
      "Period",
      "Type",
      "File",
      "Records",
      "Valid",
      "Imported",
    ];
    for (const col of expectedColumns) {
      await expect(headerRow.locator("th", { hasText: col })).toBeVisible();
    }
  });

  test("Borrowing Base trend chart has data points", async ({ page }) => {
    await page.getByRole("button", { name: "Borrowing Base" }).click();
    await expect(page.locator(".recharts-wrapper")).toBeVisible({
      timeout: 15000,
    });

    // Each data point renders as an SVG circle (3 data points x 2 lines = 6+)
    const chartContainer = page.locator(".recharts-wrapper");
    const dataPoints = chartContainer.locator("circle");
    const count = await dataPoints.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });
});
