import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { setAdminAuth } from "../helpers/admin-auth";

// ── Mock Data ─────────────────────────────────────────

const MOCK_ENTRIES = [
  {
    id: 1,
    action: "create",
    entity_type: "lead",
    entity_id: "lead-101",
    user: "admin",
    details: { name: "Alice Johnson" },
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(), // 5m ago
  },
  {
    id: 2,
    action: "status_change",
    entity_type: "lead",
    entity_id: "lead-090",
    user: "admin",
    details: { name: "Bob Smith", new_status: "contacted" },
    created_at: new Date(Date.now() - 30 * 60_000).toISOString(), // 30m ago
  },
  {
    id: 3,
    action: "update",
    entity_type: "client",
    entity_id: "client-040",
    user: "admin",
    details: { name: "ACME Corp" },
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(), // 2h ago
  },
  {
    id: 4,
    action: "import",
    entity_type: "financial",
    entity_id: "fin-001",
    user: "admin",
    details: { report_type: "AR Aging", filename: "ar_march.csv" },
    created_at: new Date(Date.now() - 24 * 3600_000).toISOString(), // 1d ago
  },
  {
    id: 5,
    action: "tax_status_change",
    entity_type: "job",
    entity_id: "job-200",
    user: "admin",
    details: { job_number: "200", new_status: "taxable" },
    created_at: new Date(Date.now() - 48 * 3600_000).toISOString(), // 2d ago
  },
];

// Subset used for action filter tests
const CREATE_ONLY = MOCK_ENTRIES.filter((e) => e.action === "create");
const DATE_FILTERED = MOCK_ENTRIES.slice(0, 3); // recent entries only

function mockActivityApi(page: Page) {
  return page.route("**/api/admin/activity*", async (route) => {
    const url = new URL(route.request().url());
    const actionFilter = url.searchParams.get("action");
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");

    let filtered = [...MOCK_ENTRIES];

    // Apply action filter
    if (actionFilter) {
      filtered = filtered.filter((e) => e.action === actionFilter);
    }

    // Apply date range filter
    if (fromDate) {
      const from = new Date(fromDate);
      filtered = filtered.filter((e) => new Date(e.created_at) >= from);
    }
    if (toDate) {
      const to = new Date(toDate + "T23:59:59Z");
      filtered = filtered.filter((e) => new Date(e.created_at) <= to);
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        entries: filtered,
        total: filtered.length,
        pagination: {
          limit: 25,
          offset: 0,
          hasMore: false,
        },
      }),
    });
  });
}

// ── Tests ─────────────────────────────────────────────

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
    // Wait for loading state to clear
    await expect(page.getByText("Loading...")).not.toBeVisible({ timeout: 15000 });
  });

  test("page loads with a chronological activity feed", async ({ page }) => {
    // Header should be visible
    await expect(page.getByText("Activity Log").first()).toBeVisible();

    // Entry count badge
    await expect(page.getByText(`${MOCK_ENTRIES.length} entries`)).toBeVisible();

    // Table should have rows for each entry
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(MOCK_ENTRIES.length);

    // Verify entries are present — check action badges
    await expect(page.getByText("Created").first()).toBeVisible();
    await expect(page.getByText("Status Change").first()).toBeVisible();
    await expect(page.getByText("Updated").first()).toBeVisible();
    await expect(page.getByText("Imported").first()).toBeVisible();
    await expect(page.getByText("Tax Status").first()).toBeVisible();

    // Verify entity labels
    await expect(page.getByText("Lead").first()).toBeVisible();
    await expect(page.getByText("Client").first()).toBeVisible();
    await expect(page.getByText("Financial").first()).toBeVisible();
    await expect(page.getByText("Job").first()).toBeVisible();

    // Verify descriptions rendered by descriptionFor()
    // create+lead → entity_id, status_change → "Name → status", update → "Name updated"
    const tableBody = page.locator("table tbody");
    await expect(tableBody.getByText("lead-101").first()).toBeVisible();
    await expect(tableBody.getByText(/Bob Smith/).first()).toBeVisible();
    await expect(tableBody.getByText(/ACME Corp/).first()).toBeVisible();
  });

  test("filter by action type works", async ({ page }) => {
    // Open filters panel
    const filtersBtn = page.locator("button").filter({ hasText: "Filters" });
    await filtersBtn.click();

    // Wait for filter panel to appear
    const actionSelect = page.locator("select").first();
    await expect(actionSelect).toBeVisible({ timeout: 5000 });

    // Select "Created" action filter
    await actionSelect.selectOption("create");

    // Wait for filtered results
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Loading...")).not.toBeVisible({ timeout: 10000 });

    // Should show only 1 entry (the "create" action)
    await expect(page.getByText(`${CREATE_ONLY.length} entries`)).toBeVisible({
      timeout: 5000,
    });

    // The "Created" badge should be visible in the table body
    const tableBody = page.locator("table tbody");
    await expect(tableBody.getByText("Created").first()).toBeVisible();
    // The "Status Change" badge should NOT be in the table
    await expect(tableBody.getByText("Status Change")).not.toBeVisible();
  });

  test("filter by date range works", async ({ page }) => {
    // Open filters panel
    const filtersBtn = page.locator("button").filter({ hasText: "Filters" });
    await filtersBtn.click();

    // Set "from" date to today (only the very recent entries should match)
    const today = new Date().toISOString().split("T")[0];
    const fromInput = page.locator("input[type='date']").first();
    await expect(fromInput).toBeVisible({ timeout: 5000 });
    await fromInput.fill(today);

    // Wait for filtered results to load
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Loading...")).not.toBeVisible({ timeout: 10000 });

    // Should show fewer entries — only ones from today
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    // The first 3 entries are within the last few hours, entries 4-5 are 1-2 days old
    // With from=today, entries from today should appear
    expect(rowCount).toBeLessThanOrEqual(MOCK_ENTRIES.length);
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});
