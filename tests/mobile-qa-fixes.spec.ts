import { test, expect } from "@playwright/test";

// ─── Mobile Viewport (375×812) ─────────────────────────────────────────────

test.describe("Mobile QA Fixes — 375×812", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  // ── Nav Menu (Issue 1) ──────────────────────────────────────────────────

  test.describe("Nav Menu", () => {
    test("hamburger button is visible at mobile viewport", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const toggle = page.locator("#menu-toggle");
      await expect(toggle).toBeVisible();
    });

    test("clicking hamburger opens the mobile menu", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      // Wait for Astro script to attach the click handler
      await page.locator('#menu-toggle[data-ready="true"]').waitFor({ state: "attached", timeout: 10000 });
      const toggle = page.locator("#menu-toggle");
      await toggle.click();
      const menu = page.locator("#mobile-menu");
      await expect(menu).toBeVisible();
    });

    test("mobile menu has z-index >= 60", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const menu = page.locator("#mobile-menu");
      // The class list should include z-[60]
      const classList = await menu.getAttribute("class");
      expect(classList).toContain("z-[60]");
    });

    test("nav links are visible inside the open menu", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.locator('#menu-toggle[data-ready="true"]').waitFor({ state: "attached", timeout: 10000 });
      await page.locator("#menu-toggle").click();
      const menu = page.locator("#mobile-menu");
      await expect(menu).toBeVisible();

      await expect(menu.locator('text="Services"')).toBeVisible();
      await expect(menu.locator('text="About"')).toBeVisible();
      await expect(menu.locator('text="Contact"')).toBeVisible();
      await expect(menu.locator('text="Request a Quote"')).toBeVisible();
    });

    test("clicking a nav link closes the menu", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.locator('#menu-toggle[data-ready="true"]').waitFor({ state: "attached", timeout: 10000 });
      const toggle = page.locator("#menu-toggle");
      const menu = page.locator("#mobile-menu");

      await toggle.click();
      await expect(menu).toBeVisible();

      // Click a nav link
      await menu.locator('.mobile-nav-link:has-text("Services")').click();
      await expect(menu).toBeHidden();
    });

    test("body overflow is hidden when menu is open, restored when closed", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.locator('#menu-toggle[data-ready="true"]').waitFor({ state: "attached", timeout: 10000 });
      const toggle = page.locator("#menu-toggle");

      // Open menu
      await toggle.click();
      const overflowWhenOpen = await page.evaluate(() => document.body.style.overflow);
      expect(overflowWhenOpen).toBe("hidden");

      // Close menu
      await toggle.click();
      const overflowWhenClosed = await page.evaluate(() => document.body.style.overflow);
      expect(overflowWhenClosed).toBe("");
    });
  });

  // ── Hero Slideshow (Issues 2, 3, 4) ────────────────────────────────────

  test.describe("Hero Slideshow", () => {
    test("hero section has overflow-hidden on the slideshow wrapper", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      // The slideshow wrapper is the div directly inside the hero section with absolute positioning
      const wrapper = page.locator('section[aria-labelledby="hero-heading"] > div.absolute.overflow-hidden').first();
      await expect(wrapper).toBeAttached();
      const classList = await wrapper.getAttribute("class");
      expect(classList).toContain("overflow-hidden");
    });

    test("hero images use .webp file extensions", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const images = page.locator('section[aria-labelledby="hero-heading"] picture img');
      const count = await images.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const src = await images.nth(i).getAttribute("src");
        expect(src, `Image ${i} should use .webp extension`).toMatch(/\.webp$/);
      }
    });

    test("first hero image has fetchpriority=high and loading=eager", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const firstImg = page.locator('section[aria-labelledby="hero-heading"] picture img').first();
      await expect(firstImg).toHaveAttribute("fetchpriority", "high");
      await expect(firstImg).toHaveAttribute("loading", "eager");
    });

    test("other hero images have loading=lazy", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const images = page.locator('section[aria-labelledby="hero-heading"] picture img');
      const count = await images.count();
      for (let i = 1; i < count; i++) {
        const loading = await images.nth(i).getAttribute("loading");
        expect(loading, `Image ${i} should be lazy loaded`).toBe("lazy");
      }
    });

    test("all hero images have non-empty alt text", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const images = page.locator('section[aria-labelledby="hero-heading"] picture img');
      const count = await images.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const alt = await images.nth(i).getAttribute("alt");
        expect(alt, `Image ${i} should have non-empty alt`).toBeTruthy();
        expect(alt!.length).toBeGreaterThan(0);
      }
    });

    test("hero images have responsive object-position classes", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const images = page.locator('section[aria-labelledby="hero-heading"] picture img');
      const count = await images.count();
      expect(count).toBeGreaterThan(0);
      let hasResponsivePosition = false;
      for (let i = 0; i < count; i++) {
        const classList = await images.nth(i).getAttribute("class");
        // At least some images should have custom object-position (not just object-center)
        if (classList && /object-\[/.test(classList)) {
          hasResponsivePosition = true;
        }
      }
      expect(hasResponsivePosition, "At least one hero image should have responsive object-position").toBe(true);
    });
  });

  // ── Stats Bar (Issues 5, 6) ─────────────────────────────────────────────

  test.describe("Stats Bar", () => {
    test("stats container has min-height set", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      // The stats container is the flex div with gap inside the hero content area
      const statsContainer = page.locator('section[aria-labelledby="hero-heading"] .min-h-\\[72px\\]');
      await expect(statsContainer).toBeAttached();
    });

    test("all 3 stat labels are visible", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const hero = page.locator('section[aria-labelledby="hero-heading"]');

      // Check for stat labels — on mobile, shortLabel variants may be shown
      // The labels are "Clients", "Projects Annually", and "OSHA Man-Hours" (or "OSHA Hours" on mobile)
      const statsText = await hero.locator('.min-h-\\[44px\\]').allTextContents();
      const allText = statsText.join(" ");

      expect(allText).toMatch(/Clients/i);
      expect(allText).toMatch(/Projects/i);
      expect(allText).toMatch(/OSHA/i);
    });

    test("stats container uses mt-6 on mobile", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const statsContainer = page.locator('section[aria-labelledby="hero-heading"] .min-h-\\[72px\\]');
      const classList = await statsContainer.getAttribute("class");
      expect(classList).toContain("mt-6");
    });

    test("stat cards use fluid width on mobile (flex-1)", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const statCards = page.locator('section[aria-labelledby="hero-heading"] .min-h-\\[44px\\]');
      const count = await statCards.count();
      expect(count).toBe(3);
      for (let i = 0; i < count; i++) {
        const classList = await statCards.nth(i).getAttribute("class");
        expect(classList, `Stat card ${i} should have flex-1`).toContain("flex-1");
      }
    });
  });

  // ── Services Cards (Issue 7) ────────────────────────────────────────────

  test.describe("Services Cards", () => {
    test("service cards have justify-center at mobile viewport", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const serviceButtons = page.locator('section[aria-labelledby="services-heading"] button');
      const count = await serviceButtons.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        const classList = await serviceButtons.nth(i).getAttribute("class");
        expect(classList, `Service card ${i} should have justify-center`).toContain("justify-center");
      }
    });
  });

  // ── Marquee (Issue 8) ──────────────────────────────────────────────────

  test.describe("Marquee", () => {
    test("global CSS has media query with animation-duration > 36s for small screens", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      // Check the computed animation-duration of the marquee track at mobile viewport
      const duration = await page.evaluate(() => {
        const track = document.querySelector(".service-ticker__track");
        if (!track) return null;
        const style = window.getComputedStyle(track);
        return style.animationDuration;
      });
      // At mobile (375px < 639px), should be 90s (> 36s default)
      expect(duration).toBeTruthy();
      const seconds = parseFloat(duration!);
      expect(seconds, "Animation duration should be > 36s on mobile").toBeGreaterThan(36);
    });
  });

  // ── Floating CTA (Issue 9) ─────────────────────────────────────────────

  test.describe("Floating CTA", () => {
    test("FloatingMobileCTA has md:hidden class", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      // Component always renders in DOM now (uses CSS visibility toggle)
      const cta = page.locator('[aria-label="Quick contact actions"]');
      await cta.waitFor({ state: "attached", timeout: 10000 });
      const classList = await cta.getAttribute("class");
      expect(classList).toContain("md:hidden");
    });

    test("FloatingMobileCTA has bottom-20 positioning", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const cta = page.locator('[aria-label="Quick contact actions"]');
      await cta.waitFor({ state: "attached", timeout: 10000 });
      const classList = await cta.getAttribute("class");
      expect(classList).toContain("bottom-20");
    });
  });

  // ── Backdrop Blur (Issue 10) ────────────────────────────────────────────

  test.describe("Backdrop Blur", () => {
    test("hero glassmorphism card has supports-[backdrop-filter] class", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      // The glassmorphism card is the main content card in the hero
      const card = page.locator('section[aria-labelledby="hero-heading"] .supports-\\[backdrop-filter\\]\\:bg-neutral-900\\/25');
      await expect(card).toBeAttached();
    });
  });

  // ── Scroll Anchors (Perf Fix 3) ────────────────────────────────────────

  test.describe("Scroll Anchors", () => {
    test("#services has scroll-mt-14", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const section = page.locator("#services");
      const classList = await section.getAttribute("class");
      expect(classList).toContain("scroll-mt-14");
    });

    test("#about has scroll-mt-14", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const section = page.locator("#about");
      const classList = await section.getAttribute("class");
      expect(classList).toContain("scroll-mt-14");
    });

    test("#contact has scroll-mt-14", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const section = page.locator("#contact");
      const classList = await section.getAttribute("class");
      expect(classList).toContain("scroll-mt-14");
    });
  });

  // ── CLS Prevention (Perf Fix 2) ────────────────────────────────────────

  test.describe("CLS Prevention", () => {
    test("stats container has min-h-[72px] class", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const container = page.locator('section[aria-labelledby="hero-heading"] .min-h-\\[72px\\]');
      await expect(container).toBeAttached();
    });

    test("individual stat cards have min-h-[44px] class", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const cards = page.locator('section[aria-labelledby="hero-heading"] .min-h-\\[44px\\]');
      const count = await cards.count();
      expect(count).toBe(3);
    });
  });
});

// ─── Tablet Viewport (768×1024) ─────────────────────────────────────────────

test.describe("Tablet cross-check — 768×1024", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("hamburger menu is NOT visible at tablet viewport (md breakpoint)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const toggle = page.locator("#menu-toggle");
    // At 768px, md: breakpoint kicks in, hamburger should be hidden
    await expect(toggle).toBeHidden();
  });

  test("desktop nav links ARE visible at tablet viewport", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator('a.nav-link[data-nav-section="services"]')).toBeVisible();
    await expect(page.locator('a.nav-link[data-nav-section="about"]')).toBeVisible();
    await expect(page.locator('a.nav-link[data-nav-section="contact"]')).toBeVisible();
  });
});

// ─── Desktop Viewport (1440×900) ────────────────────────────────────────────

test.describe("Desktop cross-check — 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("hamburger menu is NOT visible on desktop", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const toggle = page.locator("#menu-toggle");
    await expect(toggle).toBeHidden();
  });

  test("desktop nav links ARE visible", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator('a.nav-link[data-nav-section="services"]')).toBeVisible();
    await expect(page.locator('a.nav-link[data-nav-section="about"]')).toBeVisible();
    await expect(page.locator('a.nav-link[data-nav-section="contact"]')).toBeVisible();
  });

  test("service cards are left-aligned (justify-start) on desktop via sm: class", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const serviceButtons = page.locator('section[aria-labelledby="services-heading"] button');
    const count = await serviceButtons.count();
    expect(count).toBeGreaterThan(0);

    // At desktop (>= 640px), sm:justify-start should apply
    for (let i = 0; i < count; i++) {
      const classList = await serviceButtons.nth(i).getAttribute("class");
      expect(classList, `Service card ${i} should have sm:justify-start`).toContain("sm:justify-start");
      // Verify the computed style is actually start/flex-start
      const justifyContent = await serviceButtons.nth(i).evaluate((el) => {
        return window.getComputedStyle(el).justifyContent;
      });
      expect(justifyContent).toMatch(/flex-start|start|normal/);
    }
  });

  test("stats cards use fixed width on desktop (sm:w-44)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const statCards = page.locator('section[aria-labelledby="hero-heading"] .min-h-\\[44px\\]');
    const count = await statCards.count();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      const classList = await statCards.nth(i).getAttribute("class");
      // Should have sm:w-44 and sm:flex-none for fixed width on larger screens
      expect(classList, `Stat card ${i} should have sm:w-44`).toContain("sm:w-44");
      expect(classList, `Stat card ${i} should have sm:flex-none`).toContain("sm:flex-none");
    }
  });

  test("FloatingMobileCTA is hidden on desktop (md:hidden)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Scroll to trigger the CTA's visibility logic
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await page.waitForTimeout(500);

    // The component should not render at all or be hidden on md+ viewport
    // Since it uses React conditional rendering (returns null when !isVisible),
    // and at 1440px md:hidden would apply via CSS, check DOM
    const cta = page.locator('[aria-label="Quick contact actions"]');
    const count = await cta.count();
    if (count > 0) {
      // If rendered, it should be hidden via md:hidden
      await expect(cta).toBeHidden();
    }
    // If count is 0, the React component returned null — also acceptable
  });
});
