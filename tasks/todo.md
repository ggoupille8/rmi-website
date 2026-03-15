# RMI Website — Task Tracker

## Current

### Dashboard Viewport Fix + Empty States + Lead Categorization (Mar 15, 2026)
Branch: `feat/test-leads-dashboard` (committed, NOT merged)

Spec: `SPEC-03-DASHBOARD-VIEWPORT-LEADS.md` — Three objectives: (1) eliminate all scrollbars on admin dashboard, (2) add proper empty states for all cards, (3) add lead categorization so employment verifications don't count as leads.

**Task 1 — Eliminate All Scrollbars (COMPLETE):**
Dashboard layout uses `h-full overflow-hidden` on the root container. AdminLayout sets `h-screen flex flex-col overflow-hidden` on the outer wrapper, with `flex-1 min-h-0 overflow-y-auto` on `<main>`. The 3 KPI cards use `grid-cols-3`, Jobs+Invoices use `grid-cols-2`, and Recent Activity + Recent Leads use `flex-1 min-h-0` with internal `overflow-y-auto` for panel-level scrolling.

E2E tests verify:
- No horizontal scrollbar at 1280px and 1440px viewports
- All 3 KPI cards render in a single row on desktop
- Recent Activity and Recent Leads panels have `overflow: hidden` outer + `overflow-y: auto` inner

**Task 2 — Empty States (COMPLETE):**
All dashboard cards have proper empty states with helpful context:

| Card | Empty State |
|------|-------------|
| Lead Pipeline (0 leads) | Inbox icon + "No active leads" + "New submissions will appear here" + link to contact form |
| WIP Summary (no data) | Briefcase icon + "No WIP data imported yet" + link to /admin/wip |
| Financial Health (no data) | FileText icon + "No financial data imported yet" + link to /admin/financials |
| Jobs (no jobs) | Briefcase icon + "No jobs synced yet" |
| Invoices (no invoices) | FileText icon + "No invoices entered yet" + "Import invoices to track billing" |
| Recent Activity (empty) | Clock icon + "No recent activity" + "Actions like lead updates and imports will show here" |
| Recent Leads (empty) | Users icon + "No leads yet" + "Leads from the contact form will appear here" |
| WIP error state | AlertTriangle icon + "WIP data unavailable" |
| Financial error state | AlertTriangle icon + "Financial data unavailable" |

**Task 3 — Lead Categorization (COMPLETE):**

*Step 1 — Database:*
- Migration `013_add_lead_category.sql` adds `category VARCHAR(30) DEFAULT 'lead'` column to contacts
- `ensure-contacts-category.ts` runs idempotent ALTER TABLE on API startup
- Category column added to `schema.sql`

*Step 2 — Lead Management UI:*
- `LeadsTable.tsx`: Category filter dropdown (All Categories, Leads, Employment Verification, Vendor, Spam, Other)
- Non-lead category badges display on lead rows with color coding (purple=emp verify, cyan=vendor, neutral=spam, yellow=other)
- `LeadDetail.tsx`: Category selection buttons in the detail panel with instant save

*Step 3 — Dashboard Pipeline:*
- `index.astro`: All lead stat queries filter `WHERE (category IS NULL OR category = 'lead')`
- Recent Leads query also filters by category (only shows actual leads)
- Non-lead exclusion count queried separately
- `ExecutiveDashboard.tsx`: Displays "(excluding X non-leads)" note below Total Active Leads count

*Step 4 — API:*
- `contacts.ts` GET: supports `?category=` filter parameter
- `contacts.ts` PATCH: supports `category` field update with validation

**Files Modified:**
- `src/pages/admin/index.astro` — Added excludedNonLeads query, filtered recent leads by category, passed prop
- `src/components/admin/ExecutiveDashboard.tsx` — Added excludedNonLeads prop, displays exclusion note

**Files Already Complete (prior commits on this branch):**
- `src/components/admin/LeadsTable.tsx` — Category filter + badges
- `src/components/admin/LeadDetail.tsx` — Category selection UI
- `src/pages/api/admin/contacts.ts` — Category filter + update support
- `src/lib/ensure-contacts-category.ts` — Column migration
- `migrations/013_add_lead_category.sql` — SQL migration
- `schema.sql` — Category column definition
- `tests/e2e/admin-leads-dashboard.spec.ts` — 8 E2E tests (category, scrollbar, layout)

**Verification:**
- [x] `npm run build` — zero errors (only 1 warning: unused Repeat import in AnalyticsDashboard)
- [x] 24/24 E2E tests pass across Chromium, Firefox, WebKit
- [x] No horizontal scrollbar at 1280px, 1440px (verified by E2E)
- [x] Recent Activity and Recent Leads scroll internally (verified by E2E)
- [x] All empty states show helpful messages with icons
- [x] Lead category column exists in DB (migration + ensure function)
- [x] Leads can be categorized from admin UI (LeadDetail category buttons)
- [x] Dashboard pipeline only counts actual leads (SQL WHERE clause)
- [x] "(excluding X non-leads)" note displays when non-leads exist

---

### Hero Image Re-Compression — PageSpeed LCP Fix (Mar 12, 2026)
Branch: `feat/hero-image-compression` (committed, NOT merged)

PageSpeed flagged hero-6-960w.webp (295 KB) as the primary LCP bottleneck — 4x larger than any other 960w hero image. Total 960w payload was 622 KB.

**Task 1 — Re-compress hero-6 at all breakpoints:**
hero-6 was a portrait image (960x1280) — all variants were the same 960px-wide source. Cropped to landscape (960x640) + gentle blur (sigma 0.8) + q=60 re-encode:
- `hero-6-960w.webp`: 295 KB -> 73 KB (-75%)
- `hero-6.webp`: 269 KB -> 72 KB (-73%)
- `hero-6-1280w.webp`: 269 KB -> 72 KB (-73%)
- `hero-6-480w.webp`: 49 KB -> 19 KB (-62%)

**Task 2 — Logo WebP conversion:**
Already complete — `rmi-logo-full.webp` (4 KB) exists and `HeroFullWidth.tsx` already uses `<picture>` with WebP source + PNG fallback. No changes needed.

**Task 3 — Re-compress remaining hero images:**
Applied per-image settings (blur 0.3-0.8, quality 50-60) across all hero images. Portrait hero-4 also cropped to landscape. Kept hero-1-480w (11 KB) and hero-1-1280w (66 KB) as-is.

| Image | 480w | 960w | 1280w | 1920w |
|-------|------|------|-------|-------|
| hero-1 | 11 KB (skip) | 36->27 KB | 66 KB (skip) | 137->100 KB |
| hero-2 | 27->21 KB | 73->54 KB | 113->70 KB | 189->101 KB |
| hero-3 | 19->15 KB | 50->38 KB | 79->47 KB | 107->77 KB |
| hero-4 | 28->15 KB | 92->46 KB | 130->54 KB | 173->80 KB |
| hero-5 | 23->18 KB | 77->54 KB | 140->79 KB | 295->118 KB |
| hero-6 | 49->19 KB | 295->73 KB | 269->72 KB | 269->72 KB |

**Overall Results:**
- Total hero payload: 2,746 KB -> 1,326 KB (-52%, saved 1,420 KB)
- 960w breakpoint: 622 KB -> 291 KB (-53%, target was <300 KB)
- hero-6-960w: 295 KB -> 73 KB (-75%, target was <90 KB)

**Script:** `scripts/compress-heroes.mjs` — Node.js sharp script with per-file configs (quality, blur sigma, landscape crop for portrait images). Re-encodes from existing WebP files.

**Verification:**
- [x] hero-6-960w.webp < 90 KB (73 KB)
- [x] hero-6.webp < 160 KB (72 KB)
- [x] hero-6-480w.webp < 30 KB (19 KB)
- [x] hero-5-960w.webp < 55 KB (54 KB)
- [x] hero-2-960w.webp < 55 KB (54 KB)
- [x] Total 960w < 300 KB (291 KB)
- [x] `npm run build` — zero errors, zero warnings
- [x] Logo already WebP with `<picture>` fallback

**Files Modified:**
- `public/images/hero/*.webp` — 22 images re-compressed in place

**Files Created:**
- `scripts/compress-heroes.mjs` — compression utility script

---

## Completed

27 sprints completed (Feb 26 - Mar 15, 2026). See git log for full history.

---

## Backlog

- Contact section: add info panel beside form, floating labels, premium input styling
- Footer: gradient bg, link hover effects, social icon colors, service area badge
- About section: scroll entrance animations, icon glow, card hover
- Mobile nav: slide animation, focus trap, active section highlight
- Service modal: swipe gestures, entrance/exit animation

---

## Dependencies

**Last audited:** 2026-03-04

### Vulnerabilities (8 total — all transitive, no safe fixes)

| Package | Severity | Via | Risk |
|---------|----------|-----|------|
| `path-to-regexp` 4.0.0-6.2.2 | **high** | @vercel/routing-utils -> @astrojs/vercel | Low — build-time only, no user-controlled routes |
| `@vercel/routing-utils` | **high** | @astrojs/vercel | Same as above |
| `@astrojs/vercel` >=8.0.5 | **high** | direct dep | Same as above |
| `lodash` 4.0.0-4.17.21 | moderate | yaml-language-server -> @astrojs/check | Dev-only, prototype pollution in _.unset/_.omit |
| `yaml-language-server` | moderate | @astrojs/check | Dev-only |
| `volar-service-yaml` | moderate | @astrojs/check | Dev-only |
| `@astrojs/language-server` | moderate | @astrojs/check | Dev-only |
| `@astrojs/check` | moderate | direct dev dep | Dev-only |

**Note:** `npm audit fix` has no effect. All fixes require `--force` which would downgrade @astrojs/vercel to 8.0.4 (breaking) or @astrojs/check to 0.9.2 (breaking). Do NOT force-fix.

### Outdated Packages

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `react` / `react-dom` | 18.3.1 | 19.2.4 | **Major** — dedicated upgrade sprint needed |
| `@types/react` / `@types/react-dom` | 18.x | 19.x | Upgrade with React 19 |
| `tailwindcss` | 3.4.19 | 4.2.1 | **Major** — dedicated upgrade sprint needed |
| `@playwright/test` / `playwright` | 1.57.0 | 1.58.2 | Minor — safe to update |
| `happy-dom` | 20.6.1 | 20.8.3 | Minor — safe to update |
| `lucide-react` | 0.561.0 | 0.577.0 | Minor — safe to update |

### Node.js Engine Warning
- `chokidar@5.0.0` and `readdirp@5.0.0` require Node >= 20.19.0 (current: 20.18.1)
- Warnings only — no functional impact. Update Node when convenient.
