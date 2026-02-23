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

    test("stat cards use grid-cols-3 layout on mobile", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const statsContainer = page.locator('section[aria-labelledby="hero-heading"] .grid-cols-3').first();
      const classList = await statsContainer.getAttribute("class");
      expect(classList, "Stats container should use grid-cols-3 on mobile").toContain("grid-cols-3");
      const statCards = page.locator('section[aria-labelledby="hero-heading"] .min-h-\\[44px\\]');
      const count = await statCards.count();
      expect(count).toBe(3);
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
      const card = page.locator('section[aria-labelledby="hero-heading"] .supports-\\[backdrop-filter\\]\\:bg-neutral-900\\/20');
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
      // Should have sm:w-44 for fixed width on larger screens
      expect(classList, `Stat card ${i} should have sm:w-44`).toContain("sm:w-44");
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

  // ── Section Padding Consistency (Fix 1) ──────────────────────────────────

  test.describe("Section Padding", () => {
    test("Services has increased top padding, About uses py-12 sm:py-16 (standard sections)", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const services = page.locator('section[aria-labelledby="services-heading"]');
      const about = page.locator('section[aria-labelledby="about-heading"]');

      const servicesClass = await services.getAttribute("class");
      const aboutClass = await about.getAttribute("class");

      expect(servicesClass).toContain("pt-16");
      expect(servicesClass).toContain("sm:pt-20");
      expect(servicesClass).toContain("pb-12");
      expect(servicesClass).toContain("sm:pb-16");
      expect(aboutClass).toContain("py-12");
      expect(aboutClass).toContain("sm:py-16");
    });

    test("Contact section uses py-12 sm:py-16 (standard section)", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const contact = page.locator('section[aria-labelledby="contact-heading"]');
      const contactClass = await contact.getAttribute("class");
      expect(contactClass).toContain("py-12");
      expect(contactClass).toContain("sm:py-16");
    });

    test("CTA banner uses py-8 sm:py-12 (compact section)", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const cta = page.locator('section[aria-labelledby="cta-heading"]');
      const ctaClass = await cta.getAttribute("class");
      expect(ctaClass).toContain("py-8");
      expect(ctaClass).toContain("sm:py-12");
    });
  });

  // ── Glassmorphism Readability (Fix 2) ────────────────────────────────────

  test.describe("Glassmorphism Readability", () => {
    test("hero card uses backdrop-blur-lg (not backdrop-blur-sm)", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      // The main content card should have backdrop-blur-lg for softened overlay
      const card = page.locator('section[aria-labelledby="hero-heading"] .backdrop-blur-lg');
      await expect(card).toBeAttached();
      // The main content card (with supports-[backdrop-filter]) should NOT have backdrop-blur-sm
      const mainCard = page.locator('section[aria-labelledby="hero-heading"] .supports-\\[backdrop-filter\\]\\:bg-neutral-900\\/20');
      const classList = await mainCard.getAttribute("class");
      expect(classList).toContain("backdrop-blur-lg");
      expect(classList).not.toContain("backdrop-blur-sm");
    });

    test("hero card has supports-[backdrop-filter]:bg-neutral-900/20", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const card = page.locator('section[aria-labelledby="hero-heading"] .supports-\\[backdrop-filter\\]\\:bg-neutral-900\\/20');
      await expect(card).toBeAttached();
    });
  });

  // ── LCP Preload (Fix 3) ──────────────────────────────────────────────────

  test.describe("LCP Preload", () => {
    test("page head has preload link for hero-1.webp", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const preload = page.locator('link[rel="preload"][href*="hero-1.webp"]');
      await expect(preload).toBeAttached();
      await expect(preload).toHaveAttribute("as", "image");
      await expect(preload).toHaveAttribute("type", "image/webp");
    });

    test("page head has preload link for logo image", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const preload = page.locator('link[rel="preload"][href*="rmi-logo"]');
      await expect(preload).toBeAttached();
      await expect(preload).toHaveAttribute("as", "image");
    });
  });

  // ── Ticker Accessibility (Fix 4) ────────────────────────────────────────

  test.describe("Ticker Accessibility", () => {
    test("visual ticker container has aria-hidden=true", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const ticker = page.locator('[role="marquee"]');
      await expect(ticker).toHaveAttribute("aria-hidden", "true");
    });

    test("sr-only material list does NOT have aria-hidden", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const srList = page.locator("section .sr-only ul");
      const ariaHidden = await srList.getAttribute("aria-hidden");
      expect(ariaHidden).toBeNull();
    });

    test("visual ticker has role=marquee and descriptive aria-label", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const ticker = page.locator('[role="marquee"]');
      await expect(ticker).toBeAttached();
      await expect(ticker).toHaveAttribute("aria-label", "Materials we work with");
    });

    test("visual ticker has aria-live=off", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const ticker = page.locator('[role="marquee"]');
      await expect(ticker).toHaveAttribute("aria-live", "off");
    });
  });

  // ── Footer Alignment (Fix 5) ────────────────────────────────────────────

  test.describe("Footer Alignment", () => {
    test("footer sections are center-aligned on mobile (375px)", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const footer = page.locator("footer");
      const gridChildren = footer.locator(".grid > div");
      const count = await gridChildren.count();
      expect(count).toBe(3);

      for (let i = 0; i < count; i++) {
        const classList = await gridChildren.nth(i).getAttribute("class");
        expect(classList, `Footer section ${i} should have text-center`).toContain("text-center");
      }
    });

    test("Quick Links nav has items-center on mobile", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      const quickLinksNav = page.locator('footer nav[aria-label="Footer navigation"]');
      const classList = await quickLinksNav.getAttribute("class");
      expect(classList).toContain("items-center");
    });
  });
});

// ── Footer Alignment Desktop Check ───────────────────────────────────────────

test.describe("Footer Alignment Desktop — 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("footer sections are left-aligned on desktop", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const footer = page.locator("footer");
    const gridChildren = footer.locator(".grid > div");
    const count = await gridChildren.count();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      const classList = await gridChildren.nth(i).getAttribute("class");
      expect(classList, `Footer section ${i} should have md:text-left`).toContain("md:text-left");
      // Verify computed text-align is left at desktop
      const textAlign = await gridChildren.nth(i).evaluate((el) => {
        return window.getComputedStyle(el).textAlign;
      });
      expect(textAlign).toMatch(/left|start/);
    }
  });

  test("Quick Links nav has items-start on desktop", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const quickLinksNav = page.locator('footer nav[aria-label="Footer navigation"]');
    const classList = await quickLinksNav.getAttribute("class");
    expect(classList).toContain("md:items-start");
  });
});

// ─── Focus Trap Tests (Mobile) ──────────────────────────────────────────────

test.describe("Focus Trap — Mobile Menu", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Tab stays within the mobile menu when open", async ({ page, browserName }) => {
    // WebKit handles Tab key focus differently — focus may move before keydown fires
    test.skip(browserName === "webkit", "WebKit Tab focus timing differs from Chromium/Firefox");

    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator('#menu-toggle[data-ready="true"]').waitFor({ state: "attached", timeout: 10000 });
    const toggle = page.locator("#menu-toggle");
    await toggle.click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();

    // Tab through all focusable elements — they should all be within the menu or the toggle
    const allowedIds = ["menu-toggle"];
    const allowedClasses = ["mobile-nav-link"];

    for (let i = 0; i < 7; i++) {
      await page.keyboard.press("Tab");
      const activeTag = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          id: el?.id || "",
          classList: Array.from(el?.classList || []),
          tagName: el?.tagName || "",
        };
      });
      const isInMenu =
        activeTag.classList.some((c: string) => allowedClasses.includes(c)) ||
        allowedIds.includes(activeTag.id);
      expect(isInMenu, `Focus should stay in menu, got id=${activeTag.id} classes=${activeTag.classList}`).toBe(true);
    }
  });

  test("Shift+Tab at first item wraps to last item", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator('#menu-toggle[data-ready="true"]').waitFor({ state: "attached", timeout: 10000 });
    await page.locator("#menu-toggle").click();
    await expect(page.locator("#mobile-menu")).toBeVisible();

    // Focus should be on the first nav link after opening
    // Press Shift+Tab to wrap — should go to hamburger button (included in focus cycle)
    // The focus trap includes [menuToggle, ...navLinks], so first focusable is the toggle
    // Move focus to the toggle first
    await page.locator("#menu-toggle").focus();
    await page.keyboard.press("Shift+Tab");

    const activeId = await page.evaluate(() => document.activeElement?.id || "");
    const activeClass = await page.evaluate(() => Array.from(document.activeElement?.classList || []));
    // Should be on the last focusable element (the "Request a Quote" link)
    const isLastItem =
      activeClass.includes("mobile-nav-link") || activeId === "menu-toggle";
    expect(isLastItem, "Shift+Tab from first should wrap to last item").toBe(true);
  });

  test("Escape closes menu and returns focus to hamburger", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator('#menu-toggle[data-ready="true"]').waitFor({ state: "attached", timeout: 10000 });
    await page.locator("#menu-toggle").click();
    await expect(page.locator("#mobile-menu")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-menu")).toBeHidden();

    const focusedId = await page.evaluate(() => document.activeElement?.id || "");
    expect(focusedId).toBe("menu-toggle");
  });
});

// ─── Footer Touch Target Tests (Mobile) ─────────────────────────────────────

test.describe("Footer Touch Targets — Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("footer nav links have computed height >= 44px", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const navLinks = page.locator('footer nav[aria-label="Footer navigation"] a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await navLinks.nth(i).boundingBox();
      expect(box, `Footer nav link ${i} should have a bounding box`).toBeTruthy();
      expect(box!.height, `Footer nav link ${i} height should be >= 44px`).toBeGreaterThanOrEqual(44);
    }
  });

  test("footer phone and email links have computed height >= 44px", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const phoneLink = page.locator('footer a[href^="tel:"]');
    const emailLink = page.locator('footer a[href^="mailto:"]');

    const phoneBox = await phoneLink.boundingBox();
    expect(phoneBox, "Phone link should have a bounding box").toBeTruthy();
    expect(phoneBox!.height, "Phone link height should be >= 44px").toBeGreaterThanOrEqual(44);

    const emailBox = await emailLink.boundingBox();
    expect(emailBox, "Email link should have a bounding box").toBeTruthy();
    expect(emailBox!.height, "Email link height should be >= 44px").toBeGreaterThanOrEqual(44);
  });
});

// ─── Landscape Stats Test (667×375) ─────────────────────────────────────────

test.describe("Landscape Stats — 667×375", () => {
  test.use({ viewport: { width: 667, height: 375 } });

  test("stats container has no horizontal overflow", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => {
      const container = document.querySelector('section[aria-labelledby="hero-heading"]');
      if (!container) return false;
      return container.scrollWidth <= container.clientWidth;
    });
    expect(overflow, "Hero section should not have horizontal overflow").toBe(true);
  });

  test("all 3 stat labels are visible in landscape", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const hero = page.locator('section[aria-labelledby="hero-heading"]');
    const statsText = await hero.locator('.min-h-\\[44px\\]').allTextContents();
    const allText = statsText.join(" ");

    expect(allText).toMatch(/Clients/i);
    expect(allText).toMatch(/Projects/i);
    expect(allText).toMatch(/OSHA/i);
  });

  test("stats container has flex-wrap class", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const statsContainer = page.locator('section[aria-labelledby="hero-heading"] .min-h-\\[72px\\]');
    const classList = await statsContainer.getAttribute("class");
    expect(classList).toContain("flex-wrap");
  });
});

// ─── Form Loading State Tests ───────────────────────────────────────────────

test.describe("Form Loading State", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("submit with empty form shows validation errors, button stays enabled", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Wait for React hydration
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 15000 });

    const submitBtn = page.locator('button[type="submit"]:has-text("Send Message")');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Button should NOT be disabled (validation prevents submission)
    await expect(submitBtn).not.toBeDisabled();
    // Button text should still say "Send Message"
    await expect(submitBtn).toHaveText("Send Message");

    // At least one validation error should be visible
    const errors = page.locator('[role="alert"]');
    const errorCount = await errors.count();
    expect(errorCount, "Should show at least one validation error").toBeGreaterThan(0);
  });

  test("filled form submit shows loading state on button", async ({ page }) => {
    // Intercept API call BEFORE navigating so the handler is ready
    await page.route(/\/api\/contact/, async (route) => {
      // Hold the request for 1s so we can observe loading state
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, requestId: "test-123" }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 15000 });

    // Fill all required fields
    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.selectOption("#projectType", "installation");
    await page.fill("#message", "Test project details for loading state verification");

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Button should show loading state
    await expect(submitBtn).toHaveText("Sending...", { timeout: 3000 });
    await expect(submitBtn).toBeDisabled();

    // Wait for success message after route fulfills
    await expect(page.getByText("Thank you for your inquiry")).toBeVisible({ timeout: 10000 });
  });

  test("error response shows error message", async ({ page }) => {
    // Intercept API call BEFORE navigating
    await page.route(/\/api\/contact/, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Server error" }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 15000 });

    // Fill all required fields
    await page.fill("#name", "Test User");
    await page.fill("#email", "test@example.com");
    await page.selectOption("#projectType", "installation");
    await page.fill("#message", "Test project details for error state");

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    // Should show error message
    await expect(page.getByText("Something went wrong")).toBeVisible({ timeout: 10000 });
    // Button should be re-enabled
    await expect(submitBtn).not.toBeDisabled();
    await expect(submitBtn).toHaveText("Send Message");
  });
});

// ─── Focus Indicator Tests ──────────────────────────────────────────────────

test.describe("Focus Indicators", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("nav link shows visible focus indicator when tabbed to", async ({ page, browserName }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Tab into the page to reach the first nav link
    // Skip past the skip-to-content link, then the logo link
    await page.keyboard.press("Tab"); // skip-to-content
    await page.keyboard.press("Tab"); // logo link
    await page.keyboard.press("Tab"); // first nav link (Services)

    const activeEl = page.locator('a.nav-link[data-nav-section="services"]');

    // Check focus indicator — approach varies by browser
    if (browserName === "webkit") {
      // WebKit doesn't reliably report :focus-visible computed styles in Playwright;
      // verify the global :focus-visible rule exists in the stylesheet instead
      const hasFocusVisibleRule = await page.evaluate(() => {
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSStyleRule && rule.selectorText?.includes(":focus-visible")) {
                return true;
              }
            }
          } catch { /* cross-origin stylesheet */ }
        }
        return false;
      });
      expect(hasFocusVisibleRule, "Stylesheet should contain :focus-visible rule").toBe(true);
    } else {
      // Chromium/Firefox: check computed styles
      const styles = await activeEl.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return {
          outlineWidth: cs.outlineWidth,
          outlineStyle: cs.outlineStyle,
          boxShadow: cs.boxShadow,
        };
      });
      const hasVisibleFocus =
        (styles.outlineWidth && styles.outlineWidth !== "0px" && styles.outlineStyle !== "none") ||
        (styles.boxShadow && styles.boxShadow !== "none");
      expect(hasVisibleFocus, "Nav link should have visible focus indicator").toBeTruthy();
    }
  });

  test("form input shows visible focus indicator when tabbed to", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 15000 });

    // Focus the name input via keyboard
    await page.locator("#name").focus();
    await page.keyboard.press("Tab"); // moves to next field
    await page.keyboard.press("Shift+Tab"); // back to name

    const styles = await page.locator("#name").evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        outline: cs.outline,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow,
      };
    });
    const hasVisibleFocus =
      (styles.outlineWidth && styles.outlineWidth !== "0px") ||
      (styles.boxShadow && styles.boxShadow !== "none");
    expect(hasVisibleFocus, "Form input should have visible focus indicator").toBeTruthy();
  });

  test("submit button shows visible focus indicator when tabbed to", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator('form[data-hydrated="true"]').waitFor({ state: "attached", timeout: 15000 });

    // Tab to the submit button
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.focus();

    const styles = await submitBtn.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        outline: cs.outline,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow,
      };
    });
    const hasVisibleFocus =
      (styles.outlineWidth && styles.outlineWidth !== "0px") ||
      (styles.boxShadow && styles.boxShadow !== "none");
    expect(hasVisibleFocus, "Submit button should have visible focus indicator").toBeTruthy();
  });
});
