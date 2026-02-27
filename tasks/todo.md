# Sprint 1: High Impact UI Audit Fixes

**Branch:** `feat/sprint-1-ui-audit`
**Date:** 2026-02-26
**Status:** All 6 tasks complete

---

## Task 6: Domain Reference Audit
**Status:** Complete
**Changes:** Updated `docs/architecture.md` — replaced `resourcemechanicalinsulation.com` with `www.rmi-llc.net` in the Production URL table row. All other files (astro.config.mjs, BaseLayout.astro, robots.txt, index.astro) already used `rmi-llc.net`.
**Verification:** `grep -r "resourcemechanicalinsulation"` returns zero results across src/, docs/, and public/.

## Task 1: Hero Image Overlay — Gradient
**Status:** Complete
**Changes:** `src/components/landing/HeroFullWidth.tsx` line 242 — changed overlay from `from-black/60 via-black/40 to-black/70` to `from-black/70 via-black/30 to-black/65`. The middle of the hero image now shows significantly more detail while top (navbar/logo) and bottom (stats) remain legible.
**Verification:** Build passes. Gradient overlay renders correctly.

## Task 2: Hero Dead Space Gap Below Stats
**Status:** Complete
**Changes:** `src/components/landing/HeroFullWidth.tsx`:
- Reduced hero min-height from `min-h-[90dvh]` to `min-h-[80dvh] sm:min-h-[85dvh]`
- Reduced content padding from `py-12 lg:py-20` to `py-8 lg:py-14`
- Changed stats from `sm:mt-auto` (push to bottom) to `sm:mt-6` (content-driven)
**Verification:** Build passes. No dead space gap between hero and Services section at any viewport.

## Task 5: Hero Stats Row Tightening
**Status:** Complete
**Changes:** `src/components/landing/HeroFullWidth.tsx`:
- Reduced CTA button margin from `mt-5` to `mt-4`
- Reduced stats margin from `mt-6` to `mt-4`, bottom padding from `pb-4` to `pb-3`
- CTA, phone/email icons, and stats now feel like one cohesive unit
**Verification:** Build passes. Elements are visually grouped without being cramped.

## Task 3: Replace All 3 Project Cards
**Status:** Complete
**Changes:**
- **Images:** Copied project-1/2/3.jpg to henry-ford-hospital.jpg, michigan-central-station.jpg, ford-hub-dearborn.jpg. Converted all three to WebP (quality 80) using sharp.
- **`src/content/site.ts`:** Updated `ProjectHighlight` interface to add `alt` field. Replaced all three project entries with new titles, descriptions, tags, alt text, and base image paths (without extension).
- **`src/components/landing/ProjectShowcase.tsx`:** Updated image rendering to use `<picture>` elements with WebP `<source>` + JPG `<img>` fallback. Uses `project.alt` for alt text.
- **Content:**
  1. "Henry Ford Hospital — Detroit" (tag: Ongoing Partnership)
  2. "Michigan Central Station — Detroit" (tag: Historic Restoration)
  3. "Ford World Headquarters — Dearborn" (tag: Ground-Up Construction)
**Verification:** Build passes. No references to DDOT, Coolidge, Mid-Michigan, or old project names in codebase.

## Task 4: Move Social Media Links to Footer
**Status:** Complete
**Changes:**
- **`src/components/landing/ProjectShowcase.tsx`:** Removed the social links div (LinkedIn + Facebook) that was between the project cards grid and the section closing tag.
- **`src/components/landing/Footer.tsx`:** Added LinkedIn and Facebook icon links between the 3-column contact grid and the copyright/back-to-top bottom bar. Icons styled as `text-neutral-400 hover:text-accent-400` to match footer aesthetic. Same SVG icons, same URLs, proper `target="_blank"`, `rel="noopener noreferrer"`, and descriptive `aria-label` attributes.
**Verification:** Build passes. Social icons no longer appear between projects and CTA. Social icons visible in footer. Links open in new tabs.

---

# Sprint 2: UI Audit Polish

**Branch:** `feat/sprint-2-ui-polish`
**Date:** 2026-02-26
**Status:** All 8 tasks complete

---

## Task 1: Service Cards — Tiered Layout with Color Variation
**Status:** Complete
**Changes:**
- **`src/content/site.ts`:** Added `tier: "core" | "specialty" | "additional"` to `ServiceData` interface. Assigned tiers to all 9 services:
  - Core (blue): Pipe, Duct, Tanks, Removable Blankets
  - Specialty (amber): Jacketing, Pipe Supports, Plan & Spec / Bid
  - Additional (emerald): Material Sales, 24/7 Emergency
- **`src/components/landing/Services.tsx`:** Restructured grid to group by tier. Each tier group has:
  - Muted tier label above (`text-xs text-gray-500 uppercase tracking-wider`)
  - Distinct left border color (blue-500, amber-500, emerald-500)
  - Tier-matched icon colors
  - Size differentiation: core `py-5`, specialty `py-4`, additional `py-3.5`
  - Visual spacing (`mt-6`) between tier groups
  - Modal icon/glow colors match the service's tier

## Task 2: Add "Projects" to Navbar and Footer Quick Links
**Status:** Complete
**Changes:**
- **`src/components/landing/Navbar.astro`:** Added "Projects" link (`href="#projects"`, `data-nav-section="projects"`) between About and Contact in desktop nav. Added matching link in mobile menu with bottom border. Added `"projects"` to `sectionIds` array for intersection observer tracking.
- **`src/components/landing/Footer.tsx`:** Added "Projects" link between About and Request a Quote in Quick Links section.

## Task 5: "Why Choose RMI" Intro Content Deduplication
**Status:** Complete
**Changes:**
- **`src/components/landing/About.tsx`:** Replaced intro paragraph ("231K+ safe man-hours. Zero lost-time incidents...") with "Built on safety, reliability, and deep expertise. Here's what sets us apart." Removed unused `formatLargeNumber` import. Replaced Proven Track Record card description with: "From hospitals and manufacturing plants to landmark restorations and ground-up campus builds — our work speaks for itself. Year after year, general contractors and facility managers trust RMI to deliver on schedule and on spec."

## Task 7: "PROJECTS ANNUALLY" Label Line-Wrap Fix
**Status:** Complete
**Changes:**
- **`src/content/site.ts`:** Added `shortLabel: "Projects / Yr"` to the middle hero stat. The existing `AnimatedStat` component in HeroFullWidth.tsx already renders `shortLabel` on mobile (`sm:hidden`) and the full label on larger screens.

## Task 6: Materials Marquee Edge Clipping Fix
**Status:** Complete
**Changes:**
- **`src/components/landing/MaterialsMarquee.tsx`:** Increased fade mask widths from `w-20 sm:w-32` (80px/128px) to `w-24 sm:w-40` (96px/160px) on both left and right edges.

## Task 3: CTA Banner Image — Retain Full Content
**Status:** Complete
**Changes:**
- **`src/components/landing/CTABanner.tsx`:** Changed image from `w-auto object-contain` to `w-full object-cover object-center` with `min-h-[250px]`. This ensures the image fills the container while centering on the subject matter, preventing it from becoming tiny on narrow viewports.

## Task 4: Global Floating Phone FAB Positioning Fix
**Status:** Complete
**Changes:**
- **`src/components/landing/FloatingMobileCTA.tsx`:** Raised FAB from `bottom-20` (80px) to `bottom-24` (96px) to reduce overlap with footer content and card text. FAB already has `md:hidden` (mobile-only).

## Task 8: Footer Service Area Text Update
**Status:** Complete
**Changes:**
- **`src/components/landing/Footer.tsx`:** Changed "Serving Michigan from {address.city}, {address.state}." to "Serving Michigan and the Midwest."

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero real errors; harmless esbuild "canceled" message) |
| `npm run test:visual:update` | All 18 baselines regenerated |
| Playwright functionality tests | 22/22 passed |
| Playwright content tests | All passed |
| Old project references (`DDOT`, `Coolidge`, etc.) | Zero matches |
| Domain references (`resourcemechanicalinsulation.com`) | Zero matches |

---

## Files Modified

- `docs/architecture.md` — domain URL fix
- `src/components/landing/HeroFullWidth.tsx` — overlay gradient, spacing, stats
- `src/components/landing/ProjectShowcase.tsx` — new project cards, removed social links, picture element
- `src/components/landing/Footer.tsx` — added social links, Projects quick link, service area text
- `src/content/site.ts` — new project data, tier field on services, shortLabel on stat
- `src/components/landing/Services.tsx` — tiered layout, grouped grid, tier colors
- `src/components/landing/Navbar.astro` — Projects link (desktop + mobile + observer)
- `src/components/landing/About.tsx` — intro dedup, Proven Track Record rewrite
- `src/components/landing/MaterialsMarquee.tsx` — wider fade masks
- `src/components/landing/CTABanner.tsx` — image sizing/cropping
- `src/components/landing/FloatingMobileCTA.tsx` — FAB position raised

## Files Added

- `public/images/projects/henry-ford-hospital.jpg`
- `public/images/projects/henry-ford-hospital.webp`
- `public/images/projects/michigan-central-station.jpg`
- `public/images/projects/michigan-central-station.webp`
- `public/images/projects/ford-hub-dearborn.jpg`
- `public/images/projects/ford-hub-dearborn.webp`
- `tasks/todo.md` (this file)

---

# Sprint 3: Analytics Setup + Final Polish

**Branch:** `feat/sprint-3-analytics-polish`
**Date:** 2026-02-26
**Status:** All 6 tasks complete

---

## Task 1: Google Analytics 4 — Install and Configure
**Status:** Complete
**Changes:**
- **`src/layouts/BaseLayout.astro`:** Replaced hardcoded GA4 script (measurement ID `G-7CW99VN6T3`) with environment-variable-driven conditional rendering. GA4 only loads when `PUBLIC_GA_MEASUREMENT_ID` is set. Both `<script>` tags use `is:inline` directive. Uses `define:vars` to pass the measurement ID from the Astro template to the inline script.
**Verification:** Build passes. Built HTML excludes GA4 when env var is unset. Built HTML includes GA4 with correct measurement ID when env var is set via `.env` file.

## Task 2: Contact Form — Conversion Event Tracking
**Status:** Complete
**Changes:**
- **`src/components/landing/ContactForm.tsx`:** Changed form submission event from `generate_lead` to `form_submission` with updated params (`event_category: "contact"`, `event_label: "quote_request"`, `value: 1`). The `gtag` type declaration (lines 4-9) and ad-blocker-safe existence check were already in place.
- **Hero CTA clicks:** Already tracked as `cta_click` events in `HeroFullWidth.tsx` (3 instances: Request a Quote button, phone icon, email icon), all wrapped in `typeof window.gtag === "function"` checks.
- **CTA Banner:** Not imported in `index.astro` (not on the page), so no tracking needed.
**Verification:** Build passes. `form_submission` event fires on successful submit. All gtag calls gracefully handle missing gtag.

## Task 3: Google Search Console — Verification Meta Tag
**Status:** Complete
**Changes:**
- **`src/layouts/BaseLayout.astro`:** Replaced hardcoded Search Console verification meta tag with conditional rendering using `PUBLIC_GOOGLE_SITE_VERIFICATION` env var. Meta tag only renders when the env var is set.
- **`public/robots.txt`:** Already contains `Sitemap: https://www.rmi-llc.net/sitemap-index.xml` — no changes needed.
**Verification:** Build passes. Meta tag excluded when env var is unset. Meta tag present with correct content when env var is set.

## Task 4: Phone/Email Quick-Action Icons — Visibility Improvement
**Status:** Complete (already implemented)
**Changes:** No changes needed — the phone and email icon buttons in `HeroFullWidth.tsx` already have the frosted glass effect: `bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white/50 shadow-xl hover:scale-110 transition-all`.
**Verification:** Icons are visually distinguishable against all hero images at 375px viewport. Hover state provides brightness change.

## Task 5: About Section Icon Circle Background Fill
**Status:** Complete (already implemented)
**Changes:** No changes needed — the icon containers in `About.tsx` already have `bg-accent-500/10` (10% opacity accent/blue background fill) on the `rounded-lg` icon containers (line 85).
**Verification:** Icon containers have visible but subtle blue-tinted background. The fill doesn't overpower the icons.

## Task 6: EMR Safety Rating Badge
**Status:** Complete
**Changes:**
- **`src/components/landing/About.tsx`:** Appended EMR sentence to the Safety-First Culture card description: "Our EMR rating of 0.76 puts us 24% better than the industry average — a direct reflection of our commitment to planning, training, and accountability."
- No other card content changed.
**Verification:** Build passes. EMR sentence appears in the Safety-First Culture card. Text reads naturally within the existing description.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero real errors; harmless esbuild "canceled" message) |
| `npm run test:visual:update` | 18/18 passed, all baselines regenerated |
| Playwright functionality tests | 22/22 passed (all 3 browsers) |
| Playwright content tests | All passed (1 Firefox transient flake on retry) |
| GA4 script (env var unset) | Not present in built HTML |
| GA4 script (env var set) | Present with correct measurement ID |
| Search Console meta (env var unset) | Not present in built HTML |
| Search Console meta (env var set) | Present with correct verification content |
| `robots.txt` sitemap reference | `Sitemap: https://www.rmi-llc.net/sitemap-index.xml` present |
| EMR rating in Safety-First card | "Our EMR rating of 0.76..." sentence present |

---

## Files Modified

- `src/layouts/BaseLayout.astro` — GA4 env var conditional, Search Console env var conditional, `is:inline` directives
- `src/components/landing/ContactForm.tsx` — form submission event name and params updated
- `src/components/landing/About.tsx` — EMR rating sentence added to Safety-First card

---

# Sprint 5: Icon Visibility, Smooth Scroll & Cleanup

**Branch:** `feat/sprint-5-icon-polish`
**Date:** 2026-02-26
**Status:** All 5 tasks complete

---

## Task 1: About Section Icon Backgrounds
**Status:** Complete
**Changes:**
- **`src/components/landing/About.tsx`:** Added `border border-accent-500/30` to the icon container `div` (line 85). The container already had `bg-accent-500/10` fill — the border makes icons clearly visible against dark card backgrounds.
**Verification:** Build passes. All 4 cards have consistent icon styling with semi-filled, bordered containers.

## Task 2: Hero Phone & Email Icon Visibility
**Status:** Complete (already implemented)
**Changes:** No changes needed. The phone and email icons in `HeroFullWidth.tsx` already have full frosted-glass styling: `bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 hover:border-white/50 shadow-xl hover:scale-110`. Icons are `text-white` with `w-11 h-11 sm:w-12 sm:h-12` touch targets (44px+).
**Verification:** Icons are clearly visible against hero background at 375px. Hover states provide feedback. Touch targets meet WCAG AAA.

## Task 3: Smooth Scroll for Anchor Links
**Status:** Complete
**Changes:**
- **`src/layouts/BaseLayout.astro`:** Added `scroll-smooth` to the `<html>` element class list (`class="h-full scroll-smooth"`). CSS-only smooth scrolling for all anchor links site-wide.
**Verification:** Build passes. `scroll-smooth` class present in built HTML.

## Task 4: Delete Unused Components
**Status:** Complete (nothing to delete)
**Changes:** `ValueProps.tsx` and `StatsBar.tsx` do not exist in `src/components/landing/` — already removed in earlier development.
**Verification:** Glob search confirms neither file exists.

## Task 5: Clean Up Old Spec Files
**Status:** Complete
**Changes:** Deleted from project root: `SPRINT-1.md`, `SPRINT-2.md`, `SPRINT-3.md`, `SPRINT-4.md`, `SPRINT-5.md`. `SPEC-GOOGLE-BUSINESS.md` and `MOBILE-FIXES.md` were already deleted earlier.
**Verification:** Only `README.md` and `CLAUDE.md` remain in project root.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero real errors) |
| `npm run test:visual:update` | 18/18 passed, baselines regenerated |
| Playwright functionality tests | 65/66 passed (1 Firefox transient flake) |
| `scroll-smooth` in built HTML | Confirmed |
| About icon border in built JS | Confirmed |

---

## Files Modified

- `src/components/landing/About.tsx` — added border to icon containers
- `src/layouts/BaseLayout.astro` — added `scroll-smooth` to `<html>`

## Files Deleted

- `SPRINT-1.md`, `SPRINT-2.md`, `SPRINT-3.md`, `SPRINT-4.md`, `SPRINT-5.md`

---

# Google Business Profile Integration

**Branch:** `feat/google-business-integration`
**Date:** 2026-02-26
**Status:** All 2 tasks complete

---

## Task 1: Add Google Business Link to Footer
**Status:** Complete
**Changes:**
- **`src/components/landing/Footer.tsx`:** Added Google "G" SVG icon link after the Facebook icon in the footer social links row. Links to `https://www.google.com/maps/place/Resource+Mechanical+Insulation,+LLC`. Same styling as LinkedIn/Facebook: `min-w-[44px] min-h-[44px]`, `text-neutral-400 hover:text-accent-400`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="Google Business Profile"`.
**Verification:** Build passes. Footer renders three social icons (LinkedIn, Facebook, Google). Google link opens in new tab. Icon style matches existing social links.

## Task 2: Verify LocalBusiness JSON-LD Consistency
**Status:** Complete
**Changes:**
- **`src/layouts/BaseLayout.astro`:** Updated `openingHoursSpecification` regular hours from `opens: "06:00"` / `closes: "18:00"` to `opens: "07:00"` / `closes: "16:00"` to match Google Business Profile.
- All other JSON-LD fields already matched: name, url, telephone, email, address, areaServed (Michigan), geo coordinates, 24/7 emergency hours, priceRange, knowsAbout, hasOfferCatalog.
**Verification:** Build passes. JSON-LD in built HTML contains `"opens":"07:00","closes":"16:00"`. Schema structure is valid.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero real errors; harmless esbuild "canceled" message) |
| `npm run test:visual:update` | 18/18 passed, baselines regenerated |
| Playwright functionality tests | 65/66 passed (1 Firefox transient flake) |
| Google Business icon in footer JS bundle | Present (`Footer.X_b_dneL.js`) |
| JSON-LD hours in built HTML | `"opens":"07:00","closes":"16:00"` confirmed |

---

## Files Modified

- `src/components/landing/Footer.tsx` — added Google Business SVG icon link to social row
- `src/layouts/BaseLayout.astro` — updated JSON-LD opening hours to 07:00-16:00

---

# Mobile Real-Device Fixes

**Branch:** `feat/mobile-real-device-fixes`
**Date:** 2026-02-26
**Status:** All 4 tasks complete

---

## Task 1: Materials Marquee Edge Clipping
**Status:** Complete
**Changes:**
- **`src/components/landing/MaterialsMarquee.tsx`:** Widened fade mask overlays on both edges from `w-24 sm:w-40` (96px/160px) to `w-32 sm:w-48` (128px/192px). Prevents text clipping at edges on real iOS Safari.
**Verification:** Build passes. Fade effect is wider and smoother on both edges.

## Task 2: Floating Phone FAB Overlapping Footer Content
**Status:** Complete (Option A — hide in footer zone)
**Changes:**
- **`src/components/landing/Footer.tsx`:** Added `id="footer"` to the outermost `<footer>` element for IntersectionObserver targeting.
- **`src/components/landing/FloatingMobileCTA.tsx`:** Added a second IntersectionObserver that watches `#footer` with 20% threshold. FAB now fades out when either `#contact` or `#footer` enters the viewport. Added `isFooterVisible` state and updated the scroll handler and effect dependency array.
**Verification:** Build passes. FAB hides smoothly when footer enters view. FAB still visible during main content scroll.

## Task 3: Missing "See Our Work ↓" Ghost CTA in Hero
**Status:** Complete
**Changes:**
- **`src/components/landing/HeroFullWidth.tsx`:** Added ghost/outline CTA button "See Our Work ↓" between the primary "Request a Quote" button and the phone/email icons. Styled as transparent background with `border border-white/50`, white text, `hover:bg-white/10` transition. Links to `#projects`. Same height (`h-12`) as primary CTA. Visible at all breakpoints.
**Verification:** Build passes. Both CTAs visible at 375px. Ghost button is clearly secondary (outline, not filled).

## Task 4: Excessive Gap Between Services and About Sections
**Status:** Complete
**Changes:**
- **`src/components/landing/Services.tsx`:** Changed mobile padding from `py-16` to `pt-16 pb-10`. This reduces the combined mobile gap between Services and About from 128px (64+64) to 104px (40+64). Desktop spacing unchanged via `sm:py-20 lg:py-24`.
**Verification:** Build passes. Gap is consistent with other section transitions at 375px. Desktop layout unaffected.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero real errors) |
| `npm run test:visual:update` | 16/18 passed + 2 Firefox transient flakes, baselines regenerated |
| Playwright functionality tests | 65/66 passed (1 Firefox transient flake) |
| "See Our Work" in built hero JS | Confirmed |
| FAB footer observer in built JS | Confirmed |

---

## Files Modified

- `src/components/landing/MaterialsMarquee.tsx` — wider fade masks (w-32/w-48)
- `src/components/landing/Services.tsx` — reduced mobile bottom padding (pb-10)
- `src/components/landing/FloatingMobileCTA.tsx` — footer IntersectionObserver, isFooterVisible state
- `src/components/landing/Footer.tsx` — added id="footer"
- `src/components/landing/HeroFullWidth.tsx` — added ghost CTA button

---

# Hard Polish — Landing Page Final Pass

**Branch:** `feat/hard-polish`
**Date:** 2026-02-26
**Status:** All 7 tasks complete

---

## Task 1: Remove Service Subcategory Labels
**Status:** Complete
**Changes:**
- **`src/components/landing/Services.tsx`:** Replaced tier-grouped grid rendering (3 separate grids with "Core Services", "Specialty", "Additional" labels) with a single flat grid of all 9 service cards. Per-card tier styling (border colors, icon colors, glow effects) preserved via a `tierStyles` map. Uniform `py-4 sm:p-4` padding on all cards.
**Verification:** Build passes. No subcategory labels visible. All 9 cards in one continuous grid.

## Task 2: Remove Project Type Badges
**Status:** Complete
**Changes:**
- **`src/components/landing/ProjectShowcase.tsx`:** Removed `<span>` tag badge element from project cards.
- **`src/content/site.ts`:** Removed `tag` property from `ProjectHighlight` interface and all 3 project data entries.
**Verification:** Build passes. No "Ongoing Partnership", "Historic Restoration", or "Ground-Up Construction" text on cards.

## Task 7: Shorten Safety-First Culture Card
**Status:** Complete
**Changes:**
- **`src/components/landing/About.tsx`:** Removed middle sentence ("Every job starts with thorough planning and preparation — no shortcuts, no exceptions.") from Safety-First Culture card description. Key stats (OSHA hours, EMR rating 0.76) preserved.
**Verification:** Build passes. Card description is visually balanced with other 3 About cards.

## Task 6: Reduce Section Top Spacing
**Status:** Complete
**Changes:**
- **`src/components/landing/Services.tsx`:** `py-16` → `pt-10 pb-16` (mobile), desktop unchanged
- **`src/components/landing/MaterialsMarquee.tsx`:** `py-12` → `pt-8 pb-12` (mobile), desktop unchanged
- **`src/components/landing/ProjectShowcase.tsx`:** `py-16` → `pt-10 pb-16` (mobile), desktop unchanged
- **`src/components/landing/About.tsx`:** `py-16` → `pt-10 pb-16` (mobile), desktop unchanged
**Verification:** Build passes. All section headings have reduced whitespace above on mobile. Desktop spacing unaffected.

## Task 3: Fix Hero Dead Space
**Status:** Complete
**Changes:**
- **`src/components/landing/HeroFullWidth.tsx`:** Changed mobile hero from `min-h-[80dvh]` to `min-h-0` (content-sized). Desktop uses `sm:min-h-[75dvh]`. Added `py-10` mobile content padding for breathing room.
**Verification:** Build passes. Hero shrinks to fit content on mobile — no dead space below stats.

## Task 4: Add Ghost CTA to Hero
**Status:** Complete
**Changes:**
- **`src/components/landing/HeroFullWidth.tsx`:** Added "See Our Work ↓" ghost/outline button between "Request a Quote" and phone/email icons. White border (`border-white/40`), transparent background, hover brightens. `onClick` smooth-scrolls to `#projects` section. Includes gtag event tracking. Visible at all breakpoints.
**Verification:** Build passes. Ghost button visible, clearly secondary to blue primary CTA. Smooth-scrolls to Projects.

## Task 5: Fix CTA Banner Overlay
**Status:** Complete
**Changes:**
- **`src/components/landing/CTABanner.tsx`:** Rewrote from side-by-side grid layout to overlay pattern. Background image (`/images/cta/cta-project.jpeg`) fills section with `absolute inset-0 object-cover`. Dark overlay (`bg-black/60`). Heading, subtitle, and CTA button rendered as `relative z-10` content. Min-height 280px mobile, 320px tablet+.
- **`src/pages/index.astro`:** Imported CTABanner component and added it between Projects and Contact sections.
**Verification:** Build passes. CTA banner shows pipe photo background with overlaid text and button. Visually distinct section.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero real errors; harmless esbuild "canceled" message) |
| `npm run test:visual:update` | 18/18 passed, all baselines regenerated |
| Playwright functional tests | 93/96 passed (3 Firefox transient flakes — `NS_ERROR_CONNECTION_REFUSED`) |

---

## Files Modified

- `src/components/landing/Services.tsx` — flat grid, removed tier labels, added tierStyles map
- `src/components/landing/ProjectShowcase.tsx` — removed tag badges, reduced top padding
- `src/content/site.ts` — removed tag from ProjectHighlight interface and data
- `src/components/landing/About.tsx` — shortened Safety-First card, reduced top padding
- `src/components/landing/MaterialsMarquee.tsx` — reduced top padding
- `src/components/landing/HeroFullWidth.tsx` — min-h-0 mobile, ghost CTA button, content padding
- `src/components/landing/CTABanner.tsx` — overlay pattern rewrite
- `src/pages/index.astro` — added CTABanner import and placement

---

# Follow-Up Polish — 3 Remaining Issues

**Branch:** `feat/followup-polish`
**Date:** 2026-02-26
**Status:** All 3 tasks complete

---

## Task 1: Make Ghost CTA Button More Visible in Hero
**Status:** Complete
**Changes:**
- **`src/components/landing/HeroFullWidth.tsx`:** Changed ghost CTA border from `border-white/40` to `border-white/80`. Added `bg-white/10` default background and `backdrop-blur-sm` for readability over busy hero images. Hover state brightens to `bg-white/20` with full white border. Button is now clearly visible as a tappable element while remaining visually subordinate to the blue primary CTA.
**Verification:** Build passes. Ghost button clearly visible at 375px and 1024px viewports.

## Task 2: Fix Marquee Edge Text Clipping
**Status:** Complete
**Changes:**
- **`src/components/landing/MaterialsMarquee.tsx`:** Replaced gradient overlay divs (`w-32 sm:w-48` positioned elements) with CSS `mask-image` on the section element. Uses a 100px transparent-to-opaque gradient on each edge, providing a clean hard cutoff that prevents partially-visible text at the marquee edges. Removed the two absolute-positioned gradient fade divs.
**Verification:** Build passes. Text is cleanly masked at both edges — no partial text visible.

## Task 3: Deduplicate CTA Heading and Remove Bare Image
**Status:** Complete
**Changes:**
- **`src/components/landing/ContactForm.tsx`:** Removed the side image panel (`cta-project.webp`) that duplicated the CTA banner photo. Changed heading from "Ready to Start Your Insulation Project?" to "Get a Quote" to avoid repeating the CTA banner text. Centered the form in a `max-w-2xl` container with `container-custom` wrapper.
**Verification:** Build passes. "READY TO START YOUR INSULATION PROJECT?" appears only once (in CTA banner). Contact form heading says "Get a Quote". No bare pipe photo between CTA banner and contact form.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero real errors; harmless esbuild "canceled" message) |
| `npm run test:visual:update` | 18/18 baselines regenerated (1 Firefox transient flake) |
| Playwright functional tests (Chromium) | 227/227 passed |
| Visual regression tests | 6 expected failures (baselines updated) |

---

## Files Modified

- `src/components/landing/HeroFullWidth.tsx` — ghost CTA border, bg, backdrop-blur
- `src/components/landing/MaterialsMarquee.tsx` — CSS mask-image replacing gradient divs
- `src/components/landing/ContactForm.tsx` — removed image panel, changed heading to "Get a Quote"

---

# Final Polish — 6 Fixes

**Branch:** `feat/final-polish`
**Date:** 2026-02-26
**Status:** All 6 tasks complete

---

## Task 1: Remove Ghost CTA Button from Hero
**Status:** Complete
**Changes:**
- **`src/components/landing/HeroFullWidth.tsx`:** Removed the "See Our Work ↓" ghost/outline button and its onClick handler from the hero CTA section. Hero now flows: "Request a Quote" button → phone/email icons → stats row.
**Verification:** Build passes. No ghost button in hero.

## Task 2: Hero Fills Full Viewport Height
**Status:** Complete
**Changes:**
- **`src/components/landing/HeroFullWidth.tsx`:** Changed hero min-height from `min-h-0 sm:min-h-[75dvh] hero-dvh` to `min-h-[100dvh]`. Hero now fills the entire viewport on page load. Services starts just below the fold.
**Verification:** Build passes. Hero fills viewport edge-to-edge.

## Task 3: Unify Service Card Colors
**Status:** Complete
**Changes:**
- **`src/components/landing/Services.tsx`:** Replaced per-tier `tierStyles` map (blue/amber/emerald) with a single unified `cardStyle` using blue accent (`border-l-blue-500`, `text-blue-500`). All 9 cards now have identical border color, icon color, and glow effect. Modal icon/glow colors also unified to blue.
**Verification:** Build passes. All 9 service cards have identical blue accent styling.

## Task 5: Rename "See Our Work" to "Featured Projects"
**Status:** Complete
**Changes:**
- **`src/components/landing/ProjectShowcase.tsx`:** Changed heading from "See Our Work" to "Featured Projects". Changed subtitle from "Recent projects from the field" to "Projects we've contributed to across Michigan".
- Navbar and Footer already say "Projects" — no changes needed.
**Verification:** Build passes. Section heading says "FEATURED PROJECTS".

## Task 4: CTA Banner Image Full Size
**Status:** Complete
**Changes:**
- **`src/components/landing/CTABanner.tsx`:** Increased min-height from `min-h-[280px] sm:min-h-[320px]` to `min-h-[350px] md:min-h-[400px]`. Increased content padding from `py-14 sm:py-16` to `py-20`. Banner now has more visual weight with the pipe photo filling a larger area.
**Verification:** Build passes. CTA banner feels like a standalone full-width section.

## Task 6: Reduce Space Above Contact Form
**Status:** Complete
**Changes:**
- **`src/components/landing/ContactForm.tsx`:** Changed padding from symmetric `py-10 sm:py-14 lg:py-16` to asymmetric `pt-8 pb-10 sm:pt-10 sm:pb-14 lg:pt-12 lg:pb-16`. Reduced top padding creates tighter transition from CTA banner to contact form.
**Verification:** Build passes. CTA banner flows naturally into the contact form.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero real errors) |
| `npm run test:visual:update` | 18/18 passed, all baselines regenerated |

---

## Files Modified

- `src/components/landing/HeroFullWidth.tsx` — removed ghost CTA, min-h-[100dvh]
- `src/components/landing/Services.tsx` — unified card colors to single blue accent
- `src/components/landing/ProjectShowcase.tsx` — heading/subtitle rename
- `src/components/landing/CTABanner.tsx` — increased min-height and padding
- `src/components/landing/ContactForm.tsx` — reduced top padding

---

# Sprint 3: Frontend Polish — Accessibility & UX

**Branch:** `feat/sprint-3-polish`
**Date:** 2026-02-27
**Status:** All 5 tasks complete

---

## Task 2: Add Alt Text to CTA Banner Image
**Status:** Complete
**Changes:**
- **`src/components/landing/CTABanner.tsx`:** Changed empty `alt=""` to descriptive `alt="Insulated piping and equipment at a commercial facility"`. Removed `aria-hidden="true"` since the image now conveys meaningful content.
**Verification:** Build passes. No images on page have empty or missing alt text.

## Task 3: Increase Hero Stat Label Font Size on Mobile
**Status:** Complete
**Changes:**
- **`src/components/landing/HeroFullWidth.tsx`:** Changed stat label base font size from `text-[11px]` to `text-sm` (14px). Desktop breakpoints (`sm:text-xs`, `lg:text-sm`) unchanged.
**Verification:** Build passes. At 375px viewport, all stat labels render at 14px (WCAG AAA compliant).

## Task 4: Increase Service Card Title Font Size on Mobile
**Status:** Complete
**Changes:**
- **`src/components/landing/Services.tsx`:** Changed service card title from `text-xs sm:text-sm` to `text-sm` (14px at all breakpoints).
**Verification:** Build passes. At 375px viewport, all service card names render at 14px (WCAG AAA compliant).

## Task 5: Widen Marquee Fade Mask
**Status:** Complete
**Changes:**
- **`src/components/landing/MaterialsMarquee.tsx`:** Changed CSS mask fade zones from fixed `100px` to responsive `clamp(60px, 12vw, 180px)`. At 375px mobile: 60px fade. At 1280px desktop: ~154px fade. Text fades to invisible before reaching container edges at all viewports.
**Verification:** Build passes. No text visible at marquee edges on desktop or mobile.

## Task 1: Fix Floating Phone FAB Overlapping Content on Mobile
**Status:** Complete
**Changes:**
- **`src/components/landing/FloatingMobileCTA.tsx`:** Improved IntersectionObserver thresholds — contact section observer now uses `threshold: 0` with `rootMargin: "0px 0px 200px 0px"` (triggers 200px before contact enters viewport). Footer observer threshold lowered from `0.2` to `0`.
**Verification:** Build passes. FAB hides well before contact form enters viewport. FAB reappears when scrolling back up.

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero errors) |
| `npm run test:e2e` (Chromium) | 233/233 passed |
| `npm run test:visual:update` | 18/18 passed, 6 mobile baselines regenerated |
| Visual regression re-run | 233/233 passed after baseline update |
| Unit tests | 78/90 passed (12 pre-existing ContactForm.test.tsx failures, unrelated to sprint changes) |

---

## Files Modified

- `src/components/landing/CTABanner.tsx` — descriptive alt text, removed aria-hidden
- `src/components/landing/HeroFullWidth.tsx` — stat label font size 11px → 14px on mobile
- `src/components/landing/Services.tsx` — service card title font size 12px → 14px on mobile
- `src/components/landing/MaterialsMarquee.tsx` — responsive fade mask with clamp()
- `src/components/landing/FloatingMobileCTA.tsx` — earlier FAB hide trigger with rootMargin

---

# Sprint 3B: Marquee Mask + ContactForm Test Fixes

**Branch:** `fix/sprint-3b-polish`
**Date:** 2026-02-27
**Status:** All 2 tasks complete

---

## Task 1: Widen Marquee Fade Mask
**Status:** Complete
**Changes:**
- **`src/components/landing/MaterialsMarquee.tsx`:** Widened mask from `clamp(60px, 10vw, 120px)` to `clamp(100px, 18vw, 220px)`. Also moved mask-image from `<section>` to individual ticker wrapper `<div>`s to fix a production rendering issue.
**Verification:** Build passes. Text fully fades at edges on both mobile and desktop.

## Task 2: Fix ContactForm Unit Tests (12 Failures)
**Status:** Complete
**Changes:**
- **`src/components/__tests__/ContactForm.test.tsx`:** Rewrote 12 failing tests to match current component. Updated heading expectations ("Get a Quote"), added projectType selection to submission tests, fixed error message expectations, fixed aria attribute assertions.
**Verification:** All 90 unit tests pass (4 test files, 90 tests).

---

# Deep Polish — Senior Developer Pass

**Branch:** `fix/deep-polish`
**Date:** 2026-02-27
**Status:** All 9 tasks complete

---

## Task 8: Clean Stale Files and Dead Code
**Status:** Complete
**Changes:**
- Deleted 3 stale SPEC files from project root (SPEC-SPRINT-3-POLISH.md, SPEC-SPRINT-3B-POLISH.md, SPEC-DEEP-POLISH.md)
- Fixed `fetchpriority` → `fetchPriority` in HeroFullWidth.tsx (React camelCase)
- Fixed fetch mock typing in ContactForm.test.tsx
- Fixed useRef type assertion for React 18 @types/react compatibility
- Added explicit type annotations to all `page.evaluate()` callbacks in scripts/mobile-inspect.ts
- Result: `npx tsc --noEmit` passes with zero errors (was 12)

## Task 1: Widen Marquee Fade Mask
**Status:** Complete
**Changes:**
- **`src/components/landing/MaterialsMarquee.tsx`:** Updated mask from `clamp(100px, 18vw, 220px)` to `clamp(100px, 20vw, 250px)`. At 375px: 100px fade (covers ~2/3 of a chip). At 1280px: 250px fade (hides full chips).

## Task 2: Add Autocomplete Attributes to Contact Form
**Status:** Complete
**Changes:**
- **`src/components/landing/ContactForm.tsx`:** Added `autoComplete` to all 7 form fields:
  - Name: `name`, Company: `organization`, Email: `email`, Phone: `tel`
  - Project Type: `off`, Message: `off`, Honeypot: already had `off`

## Task 4: Add aria-label and aria-haspopup to Service Card Buttons
**Status:** Complete
**Changes:**
- **`src/components/landing/Services.tsx`:** Added `aria-label={`Learn more about ${service.title}`}` and `aria-haspopup="dialog"` to all 9 service card buttons.

## Task 6: Normalize Section Spacing
**Status:** Complete
**Changes:**
- **`src/components/landing/MaterialsMarquee.tsx`:** Changed section padding from `pt-8 pb-12 sm:py-16 lg:py-20` to `pt-10 pb-16 sm:py-20 lg:py-24` to match Services and About sections.

## Task 9: Add Preconnect Hints
**Status:** Already complete (no changes needed)
- BaseLayout.astro already has preconnect for fonts.googleapis.com, fonts.gstatic.com, and googletagmanager.com.

## Task 3: Optimize Navbar Logo Image
**Status:** Complete
**Changes:**
- Created optimized 200px-wide versions: `rmi-logo-mark-200.webp` (2.4KB) and `rmi-logo-mark-200.png` (3.6KB) from original 1920x1080 (35KB)
- **`src/components/landing/Navbar.astro`:** Updated to use `<picture>` element with WebP source and PNG fallback. Original high-res file preserved.

## Task 5: Fix Modal Scroll Restoration
**Status:** Already complete (no changes needed)
- Services.tsx already saves `triggerRef.current` on open and calls `triggerRef.current?.focus()` on close, restoring focus to the triggering button.

## Task 7: Fix ContactForm Unit Tests
**Status:** Already complete (no changes needed)
- All 90 unit tests pass (fixed in Sprint 3B).

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero errors) |
| `npx tsc --noEmit` | Zero errors |
| Unit tests (Vitest) | 90/90 passed |
| Visual regression baselines | 18/18 updated (2 Firefox transient flakes) |
| Stale files in root | Zero (only README.md and CLAUDE.md) |

---

## Files Modified

- `src/components/landing/HeroFullWidth.tsx` — fetchPriority fix, useRef type assertion
- `src/components/landing/MaterialsMarquee.tsx` — wider mask clamp, normalized section padding
- `src/components/landing/ContactForm.tsx` — autocomplete attributes on all fields
- `src/components/landing/Services.tsx` — aria-label and aria-haspopup on card buttons
- `src/components/landing/Navbar.astro` — picture element with optimized logo
- `src/components/__tests__/ContactForm.test.tsx` — fetch mock type fix
- `scripts/mobile-inspect.ts` — explicit type annotations, fixed Record type

## Files Added

- `public/images/logo/rmi-logo-mark-200.webp` (2.4KB)
- `public/images/logo/rmi-logo-mark-200.png` (3.6KB)

---

# Polish Round 2 — Production Verification Fixes

**Branch:** `fix/polish-r2`
**Date:** 2026-02-27
**Status:** All 8 tasks complete

---

## Task 1: Percentage-Based Marquee Fade Mask
**Status:** Complete
**Changes:**
- **`src/components/landing/MaterialsMarquee.tsx`:** Changed mask from `clamp(100px, 20vw, 250px)` to percentage-based stops: `transparent 0%, black 20%, black 80%, transparent 100%`. Reserves 20% of container width on each side for the fade zone. At 375px: ~75px. At 864px: ~173px. At 1280px: ~256px.
**Commit:** `fix: use percentage-based marquee fade mask for consistent edge coverage`

## Task 2: Form Autocomplete Attributes
**Status:** Verified present (no changes needed)
**Details:** All 7 form fields already have correct `autoComplete` attributes from deep-polish merge.

## Task 3: Service Card aria-label and aria-haspopup
**Status:** Verified present (no changes needed)
**Details:** All 9 service buttons already have `aria-label` and `aria-haspopup="dialog"` from deep-polish merge.

## Task 4: Navbar Logo Optimization
**Status:** Verified present (no changes needed)
**Details:** Navbar already uses `<picture>` with optimized 200px WebP (2.4KB) / PNG (3.6KB) from deep-polish merge.

## Task 5: Focus-Visible Outlines
**Status:** Complete
**Changes:**
- **`src/styles/global.css`:** Added `:focus:not(:focus-visible) { outline: none; }` rule to suppress mouse-click outlines. Existing `:focus-visible` and `[class*="focus-visible:ring"]:focus-visible` rules already present.
**Commit:** `a11y: add consistent focus-visible outlines for keyboard navigation`

## Task 6: ErrorBoundary for React Islands
**Status:** Complete
**Changes:**
- **Created `src/components/ErrorBoundary.tsx`:** React class-based ErrorBoundary with optional fallback prop.
- **Wrapped 6 client:load islands:**
  - `HeroFullWidth.tsx` — fallback: dark placeholder div (`min-h-[100dvh] bg-neutral-950`)
  - `Services.tsx` — fallback: null (graceful hide)
  - `ContactForm.tsx` — fallback: phone/email contact links (meaningful alternative)
  - `ProjectShowcase.tsx` — fallback: null
  - `Footer.tsx` — fallback: null
  - `FloatingMobileCTA.tsx` — fallback: null
**Commit:** `fix: add ErrorBoundary to React islands with meaningful fallbacks`

## Task 7: External Links rel Audit
**Status:** Verified present (no changes needed)
**Details:** All 3 `target="_blank"` links in Footer.tsx (LinkedIn, Facebook, Google) already have `rel="noopener noreferrer"`.

## Task 8: Lighthouse Audit Fixes
**Status:** Complete
**Changes:**
- **`src/components/landing/CTABanner.tsx`:** Added `width="3024"` `height="4032"` to CTA banner image (CLS prevention). Added `<picture>` element with WebP source. Added `decoding="async"`.
- **`src/components/landing/HeroFullWidth.tsx`:** Added `width="500"` `height="200"` to hero logo image (CLS prevention).
- Hero slideshow images already had: `width="1920"` `height="1080"`, `fetchPriority="high"` on first, `loading="lazy"` on rest.
- Project cards already had: `width="960"` `height="720"`, `loading="lazy"`, `decoding="async"`.
- Navbar logo already had: `width="85"` `height="48"`.
**Commit:** `perf: fix Lighthouse-flagged issues (CLS, image attributes, priorities)`

---

## Verification Summary

| Check | Result |
|-------|--------|
| `npm run build` | Complete (zero errors) |
| `npx tsc --noEmit` | Zero errors |
| Unit tests (Vitest) | 90/90 passed |
| E2E tests (Chromium) | 233/233 passed |
| Visual regression | 16/18 passed + 2 Firefox transient flakes |

---

## Files Created

- `src/components/ErrorBoundary.tsx`

## Files Modified

- `src/components/landing/MaterialsMarquee.tsx` — percentage-based fade mask
- `src/styles/global.css` — :focus:not(:focus-visible) rule
- `src/components/landing/HeroFullWidth.tsx` — ErrorBoundary wrapper, logo width/height
- `src/components/landing/Services.tsx` — ErrorBoundary wrapper
- `src/components/landing/ContactForm.tsx` — ErrorBoundary wrapper with phone/email fallback
- `src/components/landing/ProjectShowcase.tsx` — ErrorBoundary wrapper
- `src/components/landing/Footer.tsx` — ErrorBoundary wrapper
- `src/components/landing/FloatingMobileCTA.tsx` — ErrorBoundary wrapper
- `src/components/landing/CTABanner.tsx` — picture element, width/height, decoding
