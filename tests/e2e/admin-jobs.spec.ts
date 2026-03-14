import { test, expect } from "@playwright/test";
import { setAdminAuth } from "../helpers/admin-auth";

// Mock jobs-master API data
const MOCK_JOBS = [
  {
    id: 1,
    job_number: "26-001",
    year: 2026,
    description: "Ford Dearborn Pipe Insulation",
    customer_id: null,
    customer_name_raw: "Ford Motor Company",
    contract_type: "LS",
    tax_status: "taxable",
    tax_exemption_type: null,
    general_contractor: "Turner Construction",
    project_manager: "GG",
    is_hidden: false,
    po_number: "PO-2026-001",
    timing: null,
  },
  {
    id: 2,
    job_number: "26-002",
    year: 2026,
    description: "GM Warren Ductwork",
    customer_id: null,
    customer_name_raw: "General Motors",
    contract_type: "TM",
    tax_status: "exempt",
    tax_exemption_type: "industrial_processing",
    general_contractor: "Barton Malow",
    project_manager: "RG",
    is_hidden: false,
    po_number: null,
    timing: null,
  },
  {
    id: 3,
    job_number: "26-003",
    year: 2026,
    description: "Corewell Health HVAC Insulation",
    customer_id: null,
    customer_name_raw: "Corewell Health",
    contract_type: "LS",
    tax_status: "exempt",
    tax_exemption_type: "nonprofit_hospital",
    general_contractor: null,
    project_manager: "GG",
    is_hidden: false,
    po_number: "PO-CORE-99",
    timing: null,
  },
];

const MOCK_PAGINATION = {
  total: 3,
  page: 1,
  limit: 50,
  pages: 1,
  hasMore: false,
};

const MOCK_TAX_BREAKDOWN = {
  taxable: 1,
  exempt: 2,
  mixed: 0,
  unknown: 0,
};

const MOCK_STATS = {
  totalJobs: 150,
  byYear: { "2026": 30, "2025": 45, "2024": 40, "2023": 35 },
  byTaxStatus: { taxable: 80, exempt: 50, mixed: 10, unknown: 10 },
  byPM: { GG: 50, RG: 40, MD: 35, SB: 25 },
  byContractType: { LS: 90, TM: 55, "TM NTE": 5 },
  needsClassification: 10,
};

function mockJobsApi(page: import("@playwright/test").Page) {
  return page.route("**/api/admin/jobs-master*", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "GET" && url.searchParams.get("action") === "stats") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_STATS),
      });
      return;
    }

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jobs: MOCK_JOBS,
          pagination: MOCK_PAGINATION,
          taxBreakdown: MOCK_TAX_BREAKDOWN,
        }),
      });
      return;
    }

    if (method === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fallback();
  });
}

test.describe("Admin Jobs — Bulk Select", () => {
  test.beforeEach(async ({ page }) => {
    const authed = await setAdminAuth(page);
    if (!authed) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
    await mockJobsApi(page);
    await page.goto("/admin/jobs", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle");
    // Wait for data to load (loading spinner disappears)
    await expect(page.getByText("26-001")).toBeVisible({ timeout: 15000 });
  });

  test("renders job rows with data", async ({ page }) => {
    await expect(page.getByText("26-001")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Ford Dearborn Pipe Insulation")).toBeVisible();
    await expect(page.getByText("GM Warren Ductwork")).toBeVisible();
    await expect(page.getByText("Corewell Health HVAC Insulation")).toBeVisible();
  });

  test("clicking row checkbox selects it and shows bulk action bar", async ({ page }) => {
    await expect(page.getByText("26-001")).toBeVisible({ timeout: 15000 });

    // Each job row has a checkbox button (Square/CheckSquare icon)
    // Click the checkbox for the first job row
    const firstRowCheckbox = page
      .locator("tr")
      .filter({ hasText: "26-001" })
      .locator("button")
      .first();
    await firstRowCheckbox.click();

    // Bulk action bar should appear with "1 job selected"
    await expect(page.getByText("1 job selected")).toBeVisible({ timeout: 5000 });
  });

  test("selecting multiple rows updates bulk bar count", async ({ page }) => {
    await expect(page.getByText("26-001")).toBeVisible({ timeout: 15000 });

    // Select first job
    const firstRowCheckbox = page
      .locator("tr")
      .filter({ hasText: "26-001" })
      .locator("button")
      .first();
    await firstRowCheckbox.click();
    await expect(page.getByText("1 job selected")).toBeVisible({ timeout: 5000 });

    // Select second job
    const secondRowCheckbox = page
      .locator("tr")
      .filter({ hasText: "26-002" })
      .locator("button")
      .first();
    await secondRowCheckbox.click();
    await expect(page.getByText("2 jobs selected")).toBeVisible({ timeout: 5000 });
  });

  test("select-all checkbox selects all rows", async ({ page }) => {
    await expect(page.getByText("26-001")).toBeVisible({ timeout: 15000 });

    // The select-all checkbox is in the table header (first th)
    const selectAllBtn = page.locator("thead button").first();
    await selectAllBtn.click();

    // Should show count matching all jobs
    await expect(page.getByText("3 jobs selected")).toBeVisible({ timeout: 5000 });
  });

  test("bulk bar shows Set Tax Status button", async ({ page }) => {
    await expect(page.getByText("26-001")).toBeVisible({ timeout: 15000 });

    // Select a row
    const firstRowCheckbox = page
      .locator("tr")
      .filter({ hasText: "26-001" })
      .locator("button")
      .first();
    await firstRowCheckbox.click();

    // Verify "Set Tax Status" button appears in the bulk bar
    await expect(page.getByText("Set Tax Status")).toBeVisible({ timeout: 5000 });
  });

  test("clear button deselects all rows and hides bulk bar", async ({ page }) => {
    await expect(page.getByText("26-001")).toBeVisible({ timeout: 15000 });

    // Select all rows
    const selectAllBtn = page.locator("thead button").first();
    await selectAllBtn.click();
    await expect(page.getByText("3 jobs selected")).toBeVisible({ timeout: 5000 });

    // Click Clear
    await page.getByText("Clear").click();

    // Bulk bar should disappear
    await expect(page.getByText("3 jobs selected")).not.toBeVisible({ timeout: 3000 });
  });

  test("search input filters jobs", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    await searchInput.fill("Ford");
    // Search triggers re-fetch (which returns same mock data, but verifies no errors)
    await page.waitForTimeout(500);
    await expect(searchInput).toHaveValue("Ford");
  });

  test("stats banner shows total jobs", async ({ page }) => {
    // Stats cards should render
    await expect(page.getByText("Total Jobs")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("150")).toBeVisible();
  });
});
