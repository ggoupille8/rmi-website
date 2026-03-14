import { test, expect } from "@playwright/test";
import { setAdminAuth } from "../helpers/admin-auth";

// Mock lead data returned by /api/admin/contacts
const MOCK_CONTACTS = [
  {
    id: "lead-001",
    created_at: "2026-03-01T10:30:00Z",
    name: "John Smith",
    email: "john@acme.com",
    phone: "555-123-4567",
    message: "We need pipe insulation for a new warehouse project in Detroit.",
    source: "website",
    status: "new",
    notes: null,
    updated_at: null,
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
    metadata: {
      company: "Builder Corp",
      enrichment: { legitimacyScore: 72, quality: "medium" },
    },
  },
  {
    id: "lead-003",
    created_at: "2026-02-25T08:00:00Z",
    name: "Bob Wilson",
    email: "bob@example.com",
    phone: "555-999-8888",
    message: "Looking for fiberglass insulation for HVAC system.",
    source: "website",
    status: "archived",
    notes: null,
    updated_at: "2026-02-26T10:00:00Z",
    metadata: null,
  },
];

const MOCK_PAGINATION = {
  total: 3,
  limit: 20,
  offset: 0,
  hasMore: false,
};

function mockContactsApi(page: import("@playwright/test").Page) {
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

test.describe("Admin Leads — Detail Panel", () => {
  test.beforeEach(async ({ page }) => {
    const authed = await setAdminAuth(page);
    if (!authed) {
      test.skip(true, "ADMIN_JWT_SECRET not available");
      return;
    }
    await mockContactsApi(page);
    await page.goto("/admin/leads", { waitUntil: "load", timeout: 30000 });
    // Wait for React hydration and data load
    await page.waitForLoadState("networkidle");
    // Wait for "Loading leads..." to disappear (component has loaded data)
    await expect(page.getByText("Loading leads...")).not.toBeVisible({ timeout: 15000 });
  });

  test("renders lead rows with contact data", async ({ page }) => {
    // Use getByText().first() to handle desktop+mobile dual rendering
    await expect(page.getByText("John Smith").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Jane Doe").first()).toBeVisible();
    await expect(page.getByText("Bob Wilson").first()).toBeVisible();

    // Verify company names appear
    await expect(page.getByText("ACME Construction").first()).toBeVisible();
    await expect(page.getByText("Builder Corp").first()).toBeVisible();
  });

  test("clicking a lead row expands detail panel with message", async ({ page }) => {
    // Wait for lead rows to render
    await expect(page.getByText("John Smith").first()).toBeVisible({ timeout: 15000 });

    // Click the lead row (first match — desktop table or mobile card)
    await page.getByText("John Smith").first().click();

    // Verify the detail panel opens with the message content
    await expect(
      page.getByText("We need pipe insulation for a new warehouse project in Detroit.").first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("expanded lead detail shows email and phone", async ({ page }) => {
    await expect(page.getByText("John Smith").first()).toBeVisible({ timeout: 15000 });

    // Expand John Smith's detail
    await page.getByText("John Smith").first().click();

    // Check contact details are visible in the expanded panel
    // The email/phone may already be visible in the table row; look for them in detail view
    await expect(page.getByText("john@acme.com").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("555-123-4567").first()).toBeVisible();
  });

  test("expanded lead detail shows status buttons", async ({ page }) => {
    await expect(page.getByText("John Smith").first()).toBeVisible({ timeout: 15000 });
    await page.getByText("John Smith").first().click();

    // Wait for detail panel to open (message appears)
    await expect(
      page.getByText("We need pipe insulation").first()
    ).toBeVisible({ timeout: 5000 });

    // The detail panel renders status buttons (New, Contacted, Archived)
    // These buttons are in the LeadDetail inline component
    const newBtns = page.locator('button:has-text("New")');
    const contactedBtns = page.locator('button:has-text("Contacted")');
    const archivedBtns = page.locator('button:has-text("Archived")');

    // At least one of each status button should be visible
    await expect(newBtns.first()).toBeVisible();
    await expect(contactedBtns.first()).toBeVisible();
    await expect(archivedBtns.first()).toBeVisible();
  });

  test("clicking a different lead collapses previous and expands new", async ({ page }) => {
    await expect(page.getByText("John Smith").first()).toBeVisible({ timeout: 15000 });

    // Expand first lead
    await page.getByText("John Smith").first().click();
    await expect(
      page.getByText("We need pipe insulation for a new warehouse project in Detroit.").first()
    ).toBeVisible({ timeout: 5000 });

    // Click second lead
    await page.getByText("Jane Doe").first().click();

    // Second lead's message should be visible
    await expect(
      page.getByText("Requesting a quote for ductwork insulation.").first()
    ).toBeVisible({ timeout: 5000 });

    // First lead's message should be hidden (only one expanded at a time)
    await expect(
      page.getByText("We need pipe insulation for a new warehouse project in Detroit.")
    ).not.toBeVisible();
  });

  test("status filter buttons render and can be clicked", async ({ page }) => {
    // The filter bar has All, New, Contacted, Archived buttons
    const allBtn = page.locator("button").filter({ hasText: /^All$/ });
    const newBtn = page.locator("button").filter({ hasText: /^New$/ }).first();

    await expect(allBtn).toBeVisible({ timeout: 15000 });
    await expect(newBtn).toBeVisible();

    // Click New filter — triggers API re-fetch
    await newBtn.click();
    await page.waitForTimeout(500);
  });

  test("search input is present and accepts text", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    await searchInput.fill("John");
    await expect(searchInput).toHaveValue("John");
  });
});
