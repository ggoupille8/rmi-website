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
