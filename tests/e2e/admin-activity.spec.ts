import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { setAdminAuth } from "../helpers/admin-auth";

// ── Mock Data ───────────────────────────────────────────

const MOCK_ENTRIES = [
  {
    id: 1,
    action: "create",
    entity_type: "lead",
    entity_id: "lead-001",
    user: "admin",
    details: { name: "John Smith" },
    created_at: "2026-03-15T14:30:00Z",
  },
  {
    id: 2,
    action: "status_change",
    entity_type: "lead",
    entity_id: "lead-002",
    user: "admin",
    details: { name: "Jane Doe", new_status: "contacted" },
    created_at: "2026-03-15T13:00:00Z",
  },
  {
    id: 3,
    action: "import",
    entity_type: "financial",
    entity_id: "",
    user: "admin",
    details: { report_type: "AR Aging", filename: "ar-march-2026.csv" },
    created_at: "2026-03-14T10:00:00Z",
  },
  {
    id: 4,
    action: "create",
    entity_type: "client",
    entity_id: "client-001",
    user: "admin",
    details: { name: "Ford Motor Company", domain: "ford.com" },
    created_at: "2026-03-13T09:00:00Z",
  },
  {
    id: 5,
    action: "tax_status_change",
    entity_type: "job",
    entity_id: "job-001",
    user: "admin",
    details: { job_number: "26-001", new_status: "taxable" },
    created_at: "2026-03-12T08:00:00Z",
  },
];

// Filtered subset: only "create" actions
const MOCK_CREATE_ONLY = MOCK_ENTRIES.filter((e) => e.action === "create");

// Filtered subset: date range (Mar 14–15 only)
const MOCK_DATE_RANGE = MOCK_ENTRIES.filter((e) => {
  const d = new Date(e.created_at);
  return d >= new Date("2026-03-14") && d <= new Date("2026-03-16");
});

function mockActivityApi(page: Page) {
  return page.route("**/api/admin/activity*", async (route) => {
    const url = new URL(route.request().url());
    const mode = url.searchParams.get("mode");

    // Only intercept full mode (Activity Log page requests)
    if (mode !== "full") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ events: [] }),
      });
      return;
    }

    const action = url.searchParams.get("action");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    let filtered = [...MOCK_ENTRIES];

    if (action) {
      filtered = filtered.filter((e) => e.action === action);
    }
    if (from) {
      const fromDate = new Date(from);
      filtered = filtered.filter((e) => new Date(e.created_at) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to + "T23:59:59Z");
      filtered = filtered.filter((e) => new Date(e.created_at) <= toDate);
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ entries: filtered, total: filtered.length }),
    });
  });
}

// ── Tests ───────────────────────────────────────────────

test.describe("Admin Activity Log", () => {
  test.beforeEach(async ({ page }) => {
    const authed = await setAdminAuth(page);
    if (!authed) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
    await mockActivityApi(page);
    await page.goto("/admin/activity", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle");
  });

  test("page loads with chronological activity feed", async ({ page }) => {
    // Header should be visible
    await expect(page.getByText("Activity Log").first()).toBeVisible({ timeout: 10000 });

    // Entry count badge
    await expect(page.getByText(`${MOCK_ENTRIES.length} entries`)).toBeVisible({ timeout: 10000 });

    // Table headers
    await expect(page.getByText("Time").first()).toBeVisible();
    await expect(page.getByText("Action").first()).toBeVisible();
    await expect(page.getByText("Entity").first()).toBeVisible();
    await expect(page.getByText("Description").first()).toBeVisible();

    // Activity entries should render (check descriptions derived from mock data)
    // Entry 1: create lead → entity_id shown
    await expect(page.getByText("lead-001").first()).toBeVisible({ timeout: 10000 });

    // Entry 2: status_change → "Jane Doe → contacted"
    await expect(page.getByText(/Jane Doe.*contacted/).first()).toBeVisible();

    // Entry 3: import → "AR Aging: ar-march-2026.csv"
    await expect(page.getByText(/AR Aging.*ar-march-2026\.csv/).first()).toBeVisible();

    // Entry 4: create client → "Ford Motor Company (ford.com)"
    await expect(page.getByText(/Ford Motor Company/).first()).toBeVisible();

    // Entry 5: tax_status_change → "Job 26-001 → taxable"
    await expect(page.getByText(/26-001.*taxable/).first()).toBeVisible();

    // Action badges should have correct labels
    await expect(page.getByText("Created").first()).toBeVisible();
    await expect(page.getByText("Status Change").first()).toBeVisible();
    await expect(page.getByText("Imported").first()).toBeVisible();
    await expect(page.getByText("Tax Status").first()).toBeVisible();

    // Entity types should show
    await expect(page.getByText("Lead").first()).toBeVisible();
    await expect(page.getByText("Client").first()).toBeVisible();
    await expect(page.getByText("Financial").first()).toBeVisible();
    await expect(page.getByText("Job").first()).toBeVisible();
  });

  test("action type filter filters entries", async ({ page }) => {
    // Wait for initial load
    await expect(page.getByText(`${MOCK_ENTRIES.length} entries`)).toBeVisible({ timeout: 10000 });

    // Open filters panel
    const filtersBtn = page.locator("button").filter({ hasText: "Filters" });
    await filtersBtn.click();

    // Filter panel should be visible with Action dropdown
    await expect(page.getByText("Action").first()).toBeVisible({ timeout: 5000 });

    // Select "Created" from action filter dropdown
    const actionSelect = page.locator("select").first();
    await actionSelect.selectOption("create");

    // Wait for filtered results
    await expect(page.getByText(`${MOCK_CREATE_ONLY.length} entries`)).toBeVisible({ timeout: 10000 });

    // Only "Created" badges should be present in the table rows
    await expect(page.getByText(/Ford Motor Company/).first()).toBeVisible();
    await expect(page.getByText("lead-001").first()).toBeVisible();

    // Status Change entries should be gone
    await expect(page.getByText(/Jane Doe.*contacted/)).not.toBeVisible({ timeout: 3000 });
  });

  test("date range filter filters entries", async ({ page }) => {
    // Wait for initial load
    await expect(page.getByText(`${MOCK_ENTRIES.length} entries`)).toBeVisible({ timeout: 10000 });

    // Open filters panel
    const filtersBtn = page.locator("button").filter({ hasText: "Filters" });
    await filtersBtn.click();

    // Fill in date range — Mar 14 to Mar 15
    const fromInput = page.locator('input[type="date"]').first();
    const toInput = page.locator('input[type="date"]').last();
    await fromInput.fill("2026-03-14");
    await toInput.fill("2026-03-15");

    // Wait for filtered results — should show 3 entries (Mar 14 + Mar 15)
    await expect(page.getByText(`${MOCK_DATE_RANGE.length} entries`)).toBeVisible({ timeout: 10000 });

    // Mar 13 and Mar 12 entries should not appear
    await expect(page.getByText(/Ford Motor Company/)).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/26-001.*taxable/)).not.toBeVisible({ timeout: 3000 });
  });
});
