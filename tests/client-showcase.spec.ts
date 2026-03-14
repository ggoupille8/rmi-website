import { test, expect } from "@playwright/test";

// The ClientShowcase component has 30 hardcoded static clients as fallback.
// In the test environment (no database), the /api/clients fetch fails silently
// and the component renders all 30 static logos.
const EXPECTED_STATIC_CLIENT_COUNT = 30;

// Client names from the static fallback array
const EXPECTED_CLIENT_NAMES = [
  "Ford Motor Company",
  "General Motors",
  "Toyota",
  "Stellantis",
  "Apple",
  "Amazon",
  "FedEx",
  "Delta Air Lines",
  "BMW",
  "BASF",
  "Flagstar Bank",
  "Verizon",
  "Rocket Mortgage",
  "CBRE",
  "University of Michigan",
  "Meijer",
  "Babcock & Wilcox",
  "Nissan",
  "Target",
  "Cadillac",
  "Starbucks",
  "Consumers Energy",
  "Shake Shack",
  "Five Below",
  "Ascension Health",
  "Culver's",
  "Eastern Michigan University",
  "Mercedes-Benz",
  "Audi",
  "Edward Jones",
] as const;

test.describe("Client Showcase Logo Grid", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Scroll to client showcase section to trigger lazy loading and intersection observer
    const clientSection = page.locator("#clients");
    await clientSection.scrollIntoViewIfNeeded();
    // Wait for entrance animation to complete
    await page.waitForTimeout(600);
  });

  test("renders all client logos in the showcase grid", async ({ page }) => {
    const clientSection = page.locator("#clients");
    await expect(clientSection).toBeVisible();

    // Count all logo images within the client section
    const logos = clientSection.locator("img");
    const logoCount = await logos.count();

    // Should render all static clients (or DB clients if available, but at least 6)
    expect(logoCount).toBeGreaterThanOrEqual(18);
    expect(logoCount).toBe(EXPECTED_STATIC_CLIENT_COUNT);
  });

  test("each client logo has valid alt text", async ({ page }) => {
    const clientSection = page.locator("#clients");
    const logos = clientSection.locator("img");
    const logoCount = await logos.count();

    for (let i = 0; i < logoCount; i++) {
      const logo = logos.nth(i);
      const alt = await logo.getAttribute("alt");
      expect(alt, `Logo at index ${i} should have alt text`).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(0);
    }
  });

  test("each client logo has a valid src pointing to an SVG", async ({ page }) => {
    const clientSection = page.locator("#clients");
    const logos = clientSection.locator("img");
    const logoCount = await logos.count();

    for (let i = 0; i < logoCount; i++) {
      const logo = logos.nth(i);
      const src = await logo.getAttribute("src");
      expect(src, `Logo at index ${i} should have a src`).toBeTruthy();
      expect(src).toContain("/images/clients/");
      expect(src).toMatch(/\.svg$/);
    }
  });

  test("all expected client names are present as logo alt text", async ({ page }) => {
    const clientSection = page.locator("#clients");
    const logos = clientSection.locator("img");
    const logoCount = await logos.count();

    const renderedNames: string[] = [];
    for (let i = 0; i < logoCount; i++) {
      const alt = await logos.nth(i).getAttribute("alt");
      if (alt) renderedNames.push(alt);
    }

    // Verify every expected client name is rendered
    for (const name of EXPECTED_CLIENT_NAMES) {
      expect(renderedNames, `Expected client "${name}" to be in the grid`).toContain(name);
    }
  });

  test("section heading is visible", async ({ page }) => {
    const clientSection = page.locator("#clients");
    await expect(clientSection.locator("text=Clients We Serve")).toBeVisible();
    await expect(clientSection.locator("text=Trusted by Industry Leaders")).toBeVisible();
  });

  test("logo grid has correct column layout", async ({ page }) => {
    const clientSection = page.locator("#clients");
    const grid = clientSection.locator(".grid");
    await expect(grid).toBeVisible();

    // Verify grid has the expected CSS classes for responsive columns
    const gridClasses = await grid.getAttribute("class");
    expect(gridClasses).toContain("grid-cols-3");
    expect(gridClasses).toContain("md:grid-cols-6");
  });
});
