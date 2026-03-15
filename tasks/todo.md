# RMI Website — Task Tracker

## Current

### Mobile Polish & Build-Out (Mar 15, 2026)
Branch: `feat/mobile-polish-march15` (committed, NOT merged)

Spec: `SPEC-MOBILE-POLISH.md` — 10 layout/spacing changes across 10 landing page components to improve mobile UX at 375px-414px. No text/content changes.

**Task 1 — Service Cards 2-Column Grid (COMPLETE):**
- `Services.tsx`: Grid changed from `grid-cols-1` to `grid-cols-2` on mobile
- 9th card spans full width (`col-span-2 sm:col-span-1`)
- Reduced mobile padding (`px-3 py-3`), icon size (`w-5 h-5`), text size (`text-xs`), gap (`gap-2`)

**Task 2 — Client Showcase Tighter Grid (COMPLETE):**
- `ClientShowcase.tsx`: Grid changed from `grid-cols-3` to `grid-cols-4` on mobile (8 rows instead of 11)
- Capped oversized logo scales: FedEx 3.2→2.0, Delta 3.0→2.0, Cadillac 3.0→2.0, Ford 2.4→2.0
- Reduced cell height (`h-10`), image max-width (`max-w-[80px]`), gaps (`gap-x-1`, `gap-y-2`)

**Task 3 — Footer Back to Top Centering (COMPLETE):**
- `Footer.tsx`: "Back to Top" container changed to `justify-center sm:justify-end`
- Reduced padding (`pt-4`) and gap (`gap-3`) on mobile

**Task 4 — CTA Banner Compact Mobile (COMPLETE):**
- `CTABanner.tsx`: Reduced min-height to `min-h-[280px]` on mobile
- Tighter content padding (`py-12 px-4` on mobile)
- Button text: `text-base sm:text-lg`

**Task 5 — Hero Stats Overflow Prevention (COMPLETE):**
- `HeroFullWidth.tsx`: Changed stat `min-w-[100px]` to `min-w-0` on mobile
- Removed `whitespace-nowrap` from stat labels
- Tightened stats area: `mt-3 pb-1` on mobile

**Task 6 — About Cards 2-Column Grid (COMPLETE):**
- `About.tsx`: Grid changed from `grid-cols-1` to `grid-cols-2` on mobile
- Icon+title stacked vertically on mobile (`flex-col sm:flex-row`)
- Title size reduced (`text-xs`), descriptions truncated (`line-clamp-3 sm:line-clamp-none`)
- Reduced gap (`gap-2`)

**Task 7 — Project Cards Tighter Spacing (COMPLETE):**
- `ProjectShowcase.tsx`: Section padding `py-6`, gap `gap-2.5`, card text `px-4 py-3` on mobile

**Task 8 — Materials Marquee Compact (COMPLETE):**
- `MaterialsMarquee.tsx`: Section padding `py-6`, header margin `mb-3`, subtitle `text-sm` on mobile

**Task 9 — Contact Form Tighter Spacing (COMPLETE):**
- `ContactForm.tsx`: Container padding `py-6`, form padding `p-4`, spacing `space-y-3`, subtitle `mt-2` on mobile

**Task 10 — Navbar Safe Area Padding (COMPLETE):**
- `Navbar.astro`: Added `env(safe-area-inset-left/right)` to header style
- Added `env(safe-area-inset-bottom)` to mobile menu panel nav

**Task 11 — SKIPPED** (per spec: dividers are fine as-is)

**Files Modified (10):**
- `src/components/landing/Services.tsx`
- `src/components/landing/ClientShowcase.tsx`
- `src/components/landing/Footer.tsx`
- `src/components/landing/CTABanner.tsx`
- `src/components/landing/HeroFullWidth.tsx`
- `src/components/landing/About.tsx`
- `src/components/landing/ProjectShowcase.tsx`
- `src/components/landing/MaterialsMarquee.tsx`
- `src/components/landing/ContactForm.tsx`
- `src/components/landing/Navbar.astro`

**Verification:**
- [x] `npm run build` — zero errors
- [x] All 10 component files modified per spec
- [x] No content/text changes — only layout, spacing, and responsive classes

---

### Financial Command Center Overview Tab (Mar 15, 2026)
Branch: `main` (committed fee43ad, pushed)

Spec: `SPEC-02-FINANCIALS-OVERVIEW.md` — The Financials page previously opened to the Upload tab. Now it opens to a comprehensive financial command center showing $14M revenue at a glance.

**Task 1 — Overview API Endpoint (COMPLETE):**
- Added `action=overview` to `src/pages/api/admin/financials.ts`
- `handleOverview()` queries 5 DB tables in parallel:
  - Income Statement snapshots (Dec year-end + Jan YTD, standard variant)
  - AR Aging (latest snapshot with bucket breakdown)
  - Borrowing Base (latest record with utilization)
  - Revenue/profitability trend (all IS snapshots)
  - Reconciliation status (AR vs BS tie-outs)
  - Data freshness (MAX dates from all 5 tables)

**Task 2 — FinancialOverview Component (COMPLETE):**
- Complete rewrite of `src/components/admin/financials/FinancialOverview.tsx` (256 -> 500+ lines)
- **Top Row — 4 KPI Cards:** Annual Revenue ($14.2M), Gross Profit (with margin %), Net Income ($2.3M with net margin %), YTD 2026 (January with prior year comparison)
- **Second Row — Cash & Receivables:** AR Aging stacked bar chart (Recharts BarChart, green/yellow/orange/red color ramp), Borrowing Base capacity card with utilization bar
- **Third Row — Trend Charts:** Revenue Trend (Recharts AreaChart, blue gradient), Profitability Trend (AreaChart, green gradient)
- **Bottom Row — Status Cards:** Reconciliation Status (5/5 matches in green), Data Freshness (latest imported dates per report type)
- Loading skeleton, error handling, empty states for missing data

**Task 3 — Tab Order & Default (COMPLETE):**
- Added `LayoutDashboard` import to `FinancialDashboard.tsx`
- Changed Tab type to include `"overview"`
- Default tab: `"overview"` (was `"reports"`)
- Tab order: Overview | Reports | Borrowing Base | Reconciliation | Upload
- Reports tab now uses `ReportsView` with month selector
- Month selector shows for both Reports and Reconciliation tabs

**Files Modified:**
- `src/pages/api/admin/financials.ts` — Added `overview` action route + `handleOverview()` function
- `src/components/admin/financials/FinancialOverview.tsx` — Complete rewrite with charts, KPIs, status cards
- `src/components/admin/FinancialDashboard.tsx` — Overview tab first, default tab, tab rendering changes

**Verification:**
- [x] `npm run build` — zero errors (server 5.81s, client 13.49s, 2421 modules)
- [x] Financials page opens to Overview tab by default
- [x] 4 KPI cards render (Revenue, Gross Profit, Net Income, YTD)
- [x] AR Aging BarChart and Borrowing Base capacity bar render
- [x] Revenue and Profitability AreaCharts render
- [x] Reconciliation status and data freshness cards display
- [x] Tab order: Overview | Reports | Borrowing Base | Reconciliation | Upload
- [x] All existing tabs still work (Reports now uses ReportsView with date selector)
- [x] Pushed to main (fee43ad)

---

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
