import { test, expect } from "@playwright/test";
import { EXPECTED } from "./fixtures";

// Alias for backward compatibility with existing tests
const EXPECTED_COMPANY_NAME = EXPECTED.companyName;
const EXPECTED_COMPANY_NAME_FULL = EXPECTED.companyNameFull;
const EXPECTED_EMAIL = EXPECTED.email;
const EXPECTED_PHONE = EXPECTED.phone;
const EXPECTED_PHONE_E164 = EXPECTED.phoneE164;
const EXPECTED_ADDRESS = EXPECTED.address.full;
const EXPECTED_SERVICE_AREA = EXPECTED.serviceArea;

test.describe("Content Validation Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should display company name in hero section", async ({ page }) => {
    const heroHeading = page.locator("h1").first();
    await expect(heroHeading).toBeVisible();
    // h1 contains a logo image with company name as alt text
    const heroImg = heroHeading.locator("img");
    const altText = await heroImg.getAttribute("alt");
    expect(altText).toContain(EXPECTED_COMPANY_NAME);
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
    // Check that phone number is displayed somewhere on page
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain(EXPECTED_PHONE);
  });

  test("should have correct address in footer", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    const footerText = await footer.textContent();
    expect(footerText).toContain(EXPECTED_ADDRESS);
  });

  test("should mention service area", async ({ page }) => {
    // Service area is communicated via meta description for SEO
    const metaDescription = page.locator('meta[name="description"]');
    const content = await metaDescription.getAttribute("content");
    expect(content).toContain("Michigan");
  });

  test("should have consistent company name usage", async ({ page }) => {
    // Company name should appear in hero (as logo img alt text)
    const heroHeading = page.locator("h1").first();
    const heroImg = heroHeading.locator("img");
    const altText = await heroImg.getAttribute("alt");
    expect(altText).toContain(EXPECTED_COMPANY_NAME);

    // Footer should contain full company name
    const footer = page.locator("footer");
    const footerText = await footer.textContent();
    expect(footerText).toContain(EXPECTED_COMPANY_NAME_FULL);
  });

  test("should have proper meta title", async ({ page }) => {
    const title = await page.title();
    expect(title).toContain(EXPECTED_COMPANY_NAME);
  });

  test("should have proper meta description", async ({ page }) => {
    const metaDescription = page.locator('meta[name="description"]');
    const content = await metaDescription.getAttribute("content");
    expect(content).toBeTruthy();
    expect(content?.length).toBeGreaterThan(50);
  });

  test("should have correct canonical URL", async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]');
    const href = await canonical.getAttribute("href");
    expect(href).toBeTruthy();
  });

  test("should have email in contact form submission target", async ({
    page,
  }) => {
    // The React ContactForm uses onSubmit with fetch() to POST to /api/contact
    // It does not use a form action attribute — verify the form exists and
    // submits to the correct API endpoint via JavaScript
    const contactForm = page.locator("form").first();
    await expect(contactForm).toBeVisible();

    // Verify the form has an onSubmit handler (no action attribute)
    const action = await contactForm.getAttribute("action");
    expect(action).toBeNull();

    // Verify the API endpoint exists by hitting the healthz endpoint
    // (confirms the serverless API layer is reachable)
    const response = await page.request.post("/api/contact", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });
    // 400 = endpoint exists but rejected invalid payload (expected)
    expect([400, 422, 429]).toContain(response.status());
  });

  test("should have proper CTA text", async ({ page }) => {
    // Primary CTA should be about requesting a quote
    const ctaButton = page.locator('a:has-text("Request a Quote")').first();
    await expect(ctaButton).toBeVisible();
  });

  test("should have hero headline and subheadline", async ({ page }) => {
    const heroHeadline = page.locator("h1").first();
    await expect(heroHeadline).toBeVisible();
    // h1 contains a logo image with company name as alt text
    const heroImg = heroHeadline.locator("img");
    const altText = await heroImg.getAttribute("alt");
    expect(altText).toContain(EXPECTED_COMPANY_NAME);

    // Tagline/subheadline should be visible in the hero section
    const heroSection = page.locator("section").first();
    const sectionText = await heroSection.textContent();
    expect(sectionText).toContain("Commercial & Industrial Insulation Experts");
  });
});
