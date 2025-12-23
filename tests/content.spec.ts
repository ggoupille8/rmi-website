import { test, expect } from "@playwright/test";

// Expected content from single source of truth
const EXPECTED_COMPANY_NAME = "Resource Mechanical Insulation";
const EXPECTED_COMPANY_NAME_FULL = "Resource Mechanical Insulation, LLC";
const EXPECTED_EMAIL = "ggoupille@rmi-llc.net";
const EXPECTED_PHONE = "419-705-6153";
const EXPECTED_PHONE_E164 = "+14197056153";
const EXPECTED_ADDRESS = "11677 Wayne Road, Suite 112, Romulus, MI 48174";
const EXPECTED_SERVICE_AREA = "Michigan and surrounding areas";

test.describe("Content Validation Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display company name in hero section", async ({ page }) => {
    const heroHeading = page.locator("h1").first();
    await expect(heroHeading).toBeVisible();
    const headingText = await heroHeading.textContent();
    expect(headingText).toContain(EXPECTED_COMPANY_NAME);
  });

  test("should have correct email in all email links", async ({ page }) => {
    const emailLinks = page.locator('a[href^="mailto:"]');
    const emailLinkCount = await emailLinks.count();

    expect(emailLinkCount).toBeGreaterThan(0);

    for (let i = 0; i < emailLinkCount; i++) {
      const emailLink = emailLinks.nth(i);
      const href = await emailLink.getAttribute("href");
      expect(href).toContain(EXPECTED_EMAIL);
    }
  });

  test("should have correct phone number in all phone links", async ({
    page,
  }) => {
    const phoneLinks = page.locator('a[href^="tel:"]');
    const phoneLinkCount = await phoneLinks.count();

    expect(phoneLinkCount).toBeGreaterThan(0);

    for (let i = 0; i < phoneLinkCount; i++) {
      const phoneLink = phoneLinks.nth(i);
      const href = await phoneLink.getAttribute("href");
      // Should contain E164 format in tel: link
      expect(href).toContain(EXPECTED_PHONE_E164);
    }
  });

  test("should display phone number correctly", async ({ page }) => {
    // Check if phone number appears in visible text
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain(EXPECTED_PHONE);
  });

  test("should have correct address in footer", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    const footerText = await footer.textContent();
    expect(footerText).toContain("Romulus");
    expect(footerText).toContain("MI");
    expect(footerText).toContain("48174");
  });

  test("should mention service area", async ({ page }) => {
    const pageContent = await page.textContent("body");
    expect(pageContent?.toLowerCase()).toContain(
      EXPECTED_SERVICE_AREA.toLowerCase()
    );
  });

  test("should have consistent company name usage", async ({ page }) => {
    const pageContent = await page.textContent("body");
    // Should not have inconsistent variations
    // Check that we're using the correct name
    if (pageContent) {
      // Should contain the company name
      expect(
        pageContent.includes(EXPECTED_COMPANY_NAME) ||
          pageContent.includes(EXPECTED_COMPANY_NAME_FULL)
      ).toBe(true);
    }
  });

  test("should have proper meta title", async ({ page }) => {
    const title = await page.title();
    expect(title).toContain(EXPECTED_COMPANY_NAME);
  });

  test("should have proper meta description", async ({ page }) => {
    const metaDescription = page.locator('meta[name="description"]');
    const content = await metaDescription.getAttribute("content");
    expect(content).toBeTruthy();
    expect(content?.toLowerCase()).toContain("mechanical insulation");
  });

  test("should have correct canonical URL", async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]');
    const href = await canonical.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toContain("resourcemechanicalinsulation.com");
  });

  test("should have email in contact form submission target", async ({
    page,
  }) => {
    // Check that form action or email references match expected email
    // This is a basic check - actual form submission would be tested in integration tests
    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Check that email input has proper type
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test("should have proper CTA text", async ({ page }) => {
    const requestQuoteCTA = page.locator('a:has-text("Request a Quote")');
    await expect(requestQuoteCTA.first()).toBeVisible();
  });

  test("should have hero headline and subheadline", async ({ page }) => {
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    const h1Text = await h1.textContent();
    expect(h1Text?.length).toBeGreaterThan(0);

    // Check for subheadline (paragraph after h1)
    const subheadline = page.locator("h1 + p, section p").first();
    await expect(subheadline).toBeVisible();
    const subheadlineText = await subheadline.textContent();
    expect(subheadlineText?.length).toBeGreaterThan(0);
  });
});
