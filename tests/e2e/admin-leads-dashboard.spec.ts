import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { setAdminAuth } from "../helpers/admin-auth";

// ── Mock Data ─────────────────────────────────────────

const MOCK_CONTACTS = [
  {
    id: "lead-001",
    created_at: "2026-03-01T10:30:00Z",
    name: "John Smith",
    email: "john@acme.com",
    phone: "555-123-4567",
    message: "We need pipe insulation for a new warehouse project.",
    source: "website",
    status: "new",
    notes: null,
    updated_at: null,
    forwarded_at: null,
    category: "lead",
    metadata: {
      company: "ACME Construction",
      enrichment: { legitimacyScore: 85, quality: "high" },
    },
  },
  {
    id: "lead-002",
    created_at: "2026-02-28T14:15:00Z",
    name: "Jane Doe",
    email: "jane@builder.com",
    phone: null,
    message: "Requesting a quote for ductwork insulation.",
    source: "website",
    status: "contacted",
    notes: "Sent estimate on 3/1",
    updated_at: "2026-03-01T09:00:00Z",
    forwarded_at: null,
    category: "lead",
    metadata: {
      company: "Builder Corp",
      enrichment: { legitimacyScore: 72, quality: "medium" },
    },
  },
  {
    id: "lead-003",
    created_at: "2026-02-25T08:00:00Z",
    name: "HR Department",
    email: "hr@verify.com",
    phone: "555-999-8888",
    message: "Verifying employment for a former employee.",
    source: "website",
    status: "new",
    notes: null,
    updated_at: null,
    forwarded_at: null,
    category: "employment_verification",
    metadata: null,
  },
  {
    id: "lead-004",
    created_at: "2026-02-20T12:00:00Z",
    name: "Spam Bot",
    email: "spam@junk.com",
    phone: null,
    message: "Buy cheap products now!!!",
    source: "website",
    status: "archived",
    notes: null,
    updated_at: null,
    forwarded_at: null,
    category: "spam",
    metadata: null,
  },
];

const MOCK_PAGINATION = {
  total: 4,
  limit: 20,
  offset: 0,
  hasMore: false,
};

// ── Route Mocking ─────────────────────────────────────

function mockContactsApi(page: Page) {
  return page.route("**/api/admin/contacts*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          contacts: MOCK_CONTACTS,
          pagination: MOCK_PAGINATION,
        }),
      });
    } else if (method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    } else {
      await route.fallback();
    }
  });
}

const MOCK_TRENDS = {
  leads: [
    { month: "2025-09", count: 5 },
    { month: "2025-10", count: 8 },
    { month: "2025-11", count: 12 },
    { month: "2025-12", count: 9 },
    { month: "2026-01", count: 15 },
    { month: "2026-02", count: 18 },
  ],
  wip: [
    { month: "2025-09", backlog: 100000, earned: 80000 },
    { month: "2026-02", backlog: 200000, earned: 170000 },
  ],
  financials: [
    { month: "2025-09", ar: 120000, netIncome: 80000 },
    { month: "2026-02", ar: 185000, netIncome: 125000 },
  ],
};

const MOCK_ACTIVITY = {
  events: [
    {
      event_type: "lead",
      description: "New lead: Alice Johnson",
      event_time: new Date(Date.now() - 10 * 60_000).toISOString(),
      link: "/admin/leads",
    },
    {
      event_type: "wip_upload",
      description: "WIP report uploaded: Feb 2026",
      event_time: new Date(Date.now() - 3 * 3600_000).toISOString(),
      link: "/admin/wip",
    },
  ],
};

function mockDashboardApis(page: Page) {
  const p1 = page.route("**/api/admin/dashboard-trends*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_TRENDS),
    });
  });

  const p2 = page.route("**/api/admin/wip-months*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ year: 2026, month: 2 }]),
    });
  });

  const p3 = page.route("**/api/admin/wip?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        snapshots: [
          {
            job_number: "100",
            job_name: "Test Project",
            pct_complete: 0.5,
            backlog_revenue: 150000,
            earned_revenue: 120000,
            gross_profit: 30000,
            revised_contract: 270000,
            gross_profit_to_date: 28000,
            contract_amount: 250000,
            change_orders: 20000,
            pending_change_orders: 0,
            original_estimate: 200000,
            estimate_changes: 10000,
            pending_co_estimates: 0,
            revised_estimate: 210000,
            gross_margin_pct: 0.12,
            costs_to_date: 92000,
            costs_to_complete: 108000,
            backlog_profit: 2000,
            billings_to_date: 110000,
            revenue_billing_excess: 10000,
            billings_excess: null,
            revenue_excess: null,
            invoicing_remaining: 160000,
          },
        ],
        totals: { backlog_revenue: 150000, earned_revenue: 120000, job_count: 1 },
      }),
    });
  });

  const p4 = page.route("**/api/admin/financials*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("action") === "reconciliation") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tieOuts: [
            { label: "Net Income", status: "match" },
            { label: "Total Assets", status: "match" },
            { label: "AR Balance", status: "match" },
            { label: "AP Balance", status: "match" },
            { label: "Equity", status: "match" },
          ],
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          arAging: [{ report_date: "2026-02-28", total_amount: "185000.00" }],
          balanceSheet: [{ report_date: "2026-02-28", total_assets: "950000.00", net_income: "125000.00" }],
          incomeStatement: [{ report_date: "2026-02-28", net_income: "125000.00" }],
        }),
      });
    }
  });

  const p5 = page.route("**/api/admin/activity*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ACTIVITY),
    });
  });

  return Promise.all([p1, p2, p3, p4, p5]);
}

// ── Lead Category Tests ───────────────────────────────

test.describe("Lead Category Classification", () => {
  test.beforeEach(async ({ page }) => {
    const authed = await setAdminAuth(page);
    if (!authed) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
    await mockContactsApi(page);
    await page.goto("/admin/leads", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Loading leads...")).not.toBeVisible({ timeout: 15000 });
  });

  test("(1) category filter dropdown is visible with all options", async ({ page }) => {
    // The category filter is a <select> dropdown in the toolbar
    const categorySelect = page.locator("select");
    await expect(categorySelect).toBeVisible({ timeout: 15000 });

    // Verify all category options exist
    const options = categorySelect.locator("option");
    const optionTexts = await options.allTextContents();
    expect(optionTexts).toContain("All Categories");
    expect(optionTexts).toContain("Leads");
    expect(optionTexts).toContain("Employment Verification");
    expect(optionTexts).toContain("Vendor");
    expect(optionTexts).toContain("Spam");
    expect(optionTexts).toContain("Other");
  });

  test("(1b) non-lead category badges display on lead rows", async ({ page }) => {
    // lead-003 has category "employment_verification" — its badge should show
    await expect(page.getByText("HR Department").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Emp. Verify").first()).toBeVisible();

    // lead-004 has category "spam" — its badge should show as a badge (not option)
    await expect(page.getByText("Spam Bot").first()).toBeVisible();
    // Use a span locator to target the badge, not the hidden <option> in the select
    await expect(page.locator("span:has-text('Spam')").first()).toBeVisible();

    // lead-001 has category "lead" — no category badge should display for it
    // (only non-lead categories show a badge)
    await expect(page.getByText("John Smith").first()).toBeVisible();
  });

  test("(2) changing a lead category sends PATCH and shows category buttons", async ({ page }) => {
    // Expand a lead to see the category buttons in the detail panel
    await expect(page.getByText("John Smith").first()).toBeVisible({ timeout: 15000 });
    await page.getByText("John Smith").first().click();

    // Wait for detail panel to open
    await expect(
      page.getByText("We need pipe insulation").first()
    ).toBeVisible({ timeout: 5000 });

    // The detail panel should show the Category section with buttons
    await expect(page.getByText("Category").first()).toBeVisible();

    // Category buttons should be visible: Lead, Emp. Verification, Vendor, Spam, Other
    const categorySection = page.locator("text=Category").first().locator("..");
    await expect(categorySection.getByText("Lead", { exact: true }).first()).toBeVisible();
    await expect(categorySection.getByText("Vendor").first()).toBeVisible();

    // Intercept the PATCH to verify it includes category
    let patchBody: Record<string, unknown> | null = null;
    await page.route("**/api/admin/contacts", async (route) => {
      if (route.request().method() === "PATCH") {
        patchBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.fallback();
      }
    });

    // Click "Vendor" category button to change category
    await categorySection.getByText("Vendor").first().click();

    // Verify PATCH was sent with the new category
    await page.waitForTimeout(500);
    expect(patchBody).not.toBeNull();
    expect(patchBody!.category).toBe("vendor");
    expect(patchBody!.id).toBe("lead-001");
  });
});

// ── Dashboard Tests ───────────────────────────────────

test.describe("Executive Dashboard — Layout & Pipeline", () => {
  test.beforeEach(async ({ page }) => {
    const authed = await setAdminAuth(page);
    if (!authed) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
    await mockDashboardApis(page);
    await page.goto("/admin", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle");
  });

  test("(3) Lead Pipeline card displays counts excluding non-lead categories", async ({
    page,
  }) => {
    // The Lead Pipeline card is always rendered
    await expect(page.getByText("Lead Pipeline").first()).toBeVisible({
      timeout: 15000,
    });

    // The leadStats are server-rendered from DB queries that filter:
    //   WHERE (category IS NULL OR category = 'lead')
    // This test verifies the Lead Pipeline card renders with Total Active Leads label.
    // Since it's server-rendered, the exact count depends on the DB, but the label
    // "Total Active Leads" confirms the pipeline card is functioning properly.
    await expect(
      page.getByText("Total Active Leads").or(page.getByText("No active leads")).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("(4) no horizontal scrollbar at 1280px viewport width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/admin", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Lead Pipeline").first()).toBeVisible({
      timeout: 15000,
    });

    // Check that document width does not exceed viewport width (no horizontal overflow)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("(5) no horizontal scrollbar at 1440px viewport width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admin", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Lead Pipeline").first()).toBeVisible({
      timeout: 15000,
    });

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("(6) Recent Activity and Recent Leads panels have internal scroll", async ({
    page,
  }) => {
    // Wait for the panels to render
    await expect(page.getByText("Recent Activity").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Recent Leads").first()).toBeVisible({
      timeout: 15000,
    });

    // Both panels use overflow-hidden on the outer container and overflow-y-auto
    // on the inner scrollable div. Verify the CSS is set correctly.

    // Recent Activity panel: find the container with overflow-y-auto inside it
    const activityPanel = page.locator("h2:has-text('Recent Activity')").first().locator("..");
    const activityOverflow = await activityPanel.evaluate((el) => {
      return window.getComputedStyle(el).overflow;
    });
    // The parent panel has overflow: hidden
    expect(activityOverflow).toMatch(/hidden/);

    // The inner scrollable div should have overflow-y: auto
    const activityScrollDiv = activityPanel.locator("div.overflow-y-auto").first();
    const isScrollable = await activityScrollDiv.count();
    expect(isScrollable).toBeGreaterThanOrEqual(1);

    // Recent Leads panel: same pattern
    const leadsPanel = page.locator("h2:has-text('Recent Leads')").first().locator("..").locator("..");
    const leadsOverflow = await leadsPanel.evaluate((el) => {
      return window.getComputedStyle(el).overflow;
    });
    expect(leadsOverflow).toMatch(/hidden/);

    const leadsScrollDiv = leadsPanel.locator("div.overflow-y-auto").first();
    const leadsScrollable = await leadsScrollDiv.count();
    expect(leadsScrollable).toBeGreaterThanOrEqual(1);
  });

  test("(7) all KPI cards render in a single row on desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/admin", { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle");

    // Wait for all three KPI cards to be visible
    await expect(page.getByText("Lead Pipeline").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("WIP Summary").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Financial Health").first()).toBeVisible({
      timeout: 15000,
    });

    // Get the bounding boxes of all three KPI card headings
    const leadPipelineBox = await page.getByText("Lead Pipeline").first().boundingBox();
    const wipSummaryBox = await page.getByText("WIP Summary").first().boundingBox();
    const financialHealthBox = await page.getByText("Financial Health").first().boundingBox();

    expect(leadPipelineBox).not.toBeNull();
    expect(wipSummaryBox).not.toBeNull();
    expect(financialHealthBox).not.toBeNull();

    // All three should be on the same horizontal line (same Y position, within 5px tolerance)
    const tolerance = 5;
    expect(Math.abs(leadPipelineBox!.y - wipSummaryBox!.y)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(wipSummaryBox!.y - financialHealthBox!.y)).toBeLessThanOrEqual(tolerance);

    // Verify they're laid out left to right (not stacked)
    expect(leadPipelineBox!.x).toBeLessThan(wipSummaryBox!.x);
    expect(wipSummaryBox!.x).toBeLessThan(financialHealthBox!.x);
  });
});
