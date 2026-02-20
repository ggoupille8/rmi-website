I audited the live production site at rmi-llc.net and cross-referenced with an external audit. Many flagged issues are already handled by our recent work. Below are the REAL remaining issues that need fixing, plus a stale test cleanup. Work through all items in order, then build, test, and commit.

IMPORTANT: Before starting any fixes, check what branch you're on. If you're on fix/mobile-qa-bugs or polish/landing-page-v2, stay there. Do NOT create a new branch — just add commits on top.

---

## FIX 1 — Section Padding Inconsistency (Medium Priority)

The vertical spacing between sections is inconsistent on production:

- Services: pt=32px pb=64px (pt-6 pb-12 sm:pt-8 sm:pb-16)
- About: pt=48px pb=48px (section-padding)
- Materials: pt=48px pb=48px (section-padding-sm)
- CTA Banner: pt=40px pb=40px (py-8)
- Contact: pt=56px pb=64px (pt-14 pb-12 sm:pb-16)

This creates an uneven visual rhythm, especially on mobile where spacing differences are more noticeable.

**Fix:** Normalize section padding to a consistent system. Use these Tailwind classes:

- Standard sections (Services, About, Contact): `py-12 sm:py-16` (48px/64px)
- Compact sections (Materials marquee, CTA banner): `py-8 sm:py-12` (32px/48px)

Files to check and update:

- The section wrapping Services content (inside or after #services div)
- The section wrapping About content (inside or after #about div)
- The Materials section
- The CTA banner section (contains "READY TO START YOUR INSULATION PROJECT?")
- The Contact section (inside or after #contact div)

Be careful: the #services, #about, #contact IDs are on wrapper divs with scroll-mt-14. The actual <section> elements are siblings or children of those. Don't change the scroll-mt-14 anchors.

---

## FIX 2 — Hero Glassmorphism Card Readability (Medium Priority)

**File:** frontend/src/components/landing/HeroFullWidth.tsx

The hero glassmorphism card uses `backdrop-blur-sm` which is only `blur(4px)`. On busy industrial background images, white text can be hard to read through the semi-transparent card.

Current card classes: "max-w-3xl mx-auto bg-neutral-900/60 supports-[backdrop-filter]:bg-neutral-900/25 backdrop-blur-sm rounded-xl border border-neutral-700/30 py-6 px-6 sm:px-10"

**Fix:**

1. Increase blur from `backdrop-blur-sm` (4px) to `backdrop-blur-md` (12px) — much better text readability
2. Increase the supported background opacity from `bg-neutral-900/25` to `bg-neutral-900/35` — slightly darker when blur is active
3. Keep the fallback at `bg-neutral-900/60` — already good

New classes should be: "max-w-3xl mx-auto bg-neutral-900/60 supports-[backdrop-filter]:bg-neutral-900/35 backdrop-blur-md rounded-xl border border-neutral-700/30 py-6 px-6 sm:px-10"

---

## FIX 3 — Preload LCP Hero Image (High Priority — Performance)

**File:** frontend/src/layouts/BaseLayout.astro

There are NO preload hints in the <head> for the hero image, which is the Largest Contentful Paint element. On mobile 4G connections, this delays the first meaningful paint.

**Fix:** Add a preload link for the first hero image in the <head> of BaseLayout.astro:

```html
<link
  rel="preload"
  as="image"
  type="image/webp"
  href="/images/hero/hero-1.webp"
  fetchpriority="high"
/>
```

Place it BEFORE any stylesheet links in the <head> so the browser discovers it as early as possible. Also add a preload for the logo image if it's in the initial viewport:

```html
<link rel="preload" as="image" href="/images/logo/rmi-logo-white.png" />
```

---

## FIX 4 — Materials Ticker Accessibility (Medium Priority)

**File:** frontend/src/components/landing/MaterialsMarquee.tsx

The materials section has:

- 2 visual ticker tracks (44 items total = 22 items x 2 for seamless loop) — these are decorative/visual
- 1 sr-only accessible list with 22 li items — this is for screen readers

Problem: The visual ticker tracks are NOT hidden from screen readers. A screen reader user hears the full material list THREE times (2 ticker copies + 1 sr-only list).

**Fix:**

1. Add `aria-hidden="true"` to the visual ticker container (the `.service-ticker` wrapper or the `.relative` div that contains it)
2. Verify the sr-only list (the div with class `sr-only` containing the ul) does NOT have aria-hidden
3. Add `role="marquee"` and `aria-label="Materials we work with"` to the visual ticker container for proper semantics
4. Add `aria-live="off"` to the ticker container so screen readers don't try to announce the animated content

---

## FIX 5 — Footer Mobile Alignment (Low Priority)

**File:** frontend/src/components/landing/Footer.tsx

The footer uses `grid grid-cols-1 md:grid-cols-3 gap-8`. On mobile (single column), check if all three sections (Company info, Quick Links, Contact) are consistently aligned.

**Fix:** On mobile, center-align all footer sections for a clean single-column look. Add `text-center md:text-left` to each of the three grid children. For the Quick Links nav, add `items-center md:items-start` to center the link stack on mobile.

Check the current alignment classes and only add what's missing — don't break the desktop 3-column layout.

---

## FIX 6 — Stale Test Cleanup (High Priority — DevX)

**File:** frontend/tests/ (multiple test files)

We have 42 pre-existing test failures that are NOT related to our mobile fixes. They clutter every test run and make it impossible to tell if new changes break anything. These need to be fixed or removed.

The 4 categories of stale tests:

### Category A: Mobile-audit hamburger menu tests (18 failures)

Root cause: Astro inline script timing — test clicks toggle, hidden class IS removed, but Playwright still sees element as not visible.
**Fix:** These tests need a proper wait for the data-ready attribute we added to the hamburger button. Update the failing tests to `await page.waitForSelector('[data-ready="true"]')` before interacting with the menu. If the tests are in mobile-audit.spec.ts, update them to match the pattern used in our new mobile-qa-fixes.spec.ts.

### Category B: Content validation tests (9 failures)

Root cause: Tests expect a text-based hero heading but the site now uses a logo image.
**Fix:** Update these tests to check for the logo image instead of text content. The hero heading contains an img with alt="Resource Mechanical Insulation" — tests should assert on the image presence and alt text, not on text content.

### Category C: Dark mode tests (6 failures)

Root cause: Tests check for light-mode backgrounds but the site is dark-only.
**Fix:** Remove or skip these tests entirely — they test functionality that doesn't exist. Add a comment explaining the site is dark-mode only and no theme toggle exists.

### Category D: Accessibility/form tests (9 failures — 6 accessibility + 3 functionality)

Root cause: Form label/error assertions don't match current implementation. Form tests check required="" attribute but form uses required (boolean, no value).
**Fix:** Update the accessibility tests to match the current form structure. For the required attribute check, use [required] selector instead of [required=""]. Update label-input associations to match current DOM.

### Approach:

1. First run `npx playwright test` and capture the EXACT failure messages for each of the 42 tests
2. For each category, apply the fix described above
3. Re-run `npx playwright test` after each category fix to verify progress
4. Goal: 0 failures across the entire test suite

---

## FIX 7 — Write Tests for Fixes 1-5 (Required)

After completing fixes 1-5, add Playwright tests to verify them. Add these to the existing frontend/tests/mobile-qa-fixes.spec.ts:

### Section Padding Tests

- All main content sections have consistent padding classes
- Services and About sections use the same padding values

### Glassmorphism Readability Test

- Hero card has backdrop-blur-md (not backdrop-blur-sm)
- Hero card has supports-[backdrop-filter]:bg-neutral-900/35

### LCP Preload Test

- Check that a link[rel="preload"][href*="hero-1.webp"] exists in the page head

### Ticker Accessibility Tests

- Visual ticker container has aria-hidden="true"
- sr-only material list does NOT have aria-hidden
- Visual ticker has role="marquee"

### Footer Alignment Tests (mobile viewport 375x812)

- All 3 footer sections are center-aligned on mobile
- Footer sections are left-aligned on desktop (1440x900)

---

## AFTER ALL FIXES:

1. Run `npm run build` — must pass
2. Run `npx playwright test` — goal is 0 failures total
3. If visual baselines need updating: `npm run test:visual:update`
4. Commit with message: "fix: section padding, glassmorphism readability, LCP preload, ticker a11y, footer alignment, stale test cleanup"
5. Do NOT push — report back results
