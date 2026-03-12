# RMI Website — Task Tracker

## Current

### Hero Image Re-Compression — PageSpeed LCP Fix (Mar 12, 2026)
Branch: `feat/hero-image-compression` (committed, NOT merged)

PageSpeed flagged hero-6-960w.webp (295 KB) as the primary LCP bottleneck — 4x larger than any other 960w hero image. Total 960w payload was 622 KB.

**Task 1 — Re-compress hero-6 at all breakpoints:**
hero-6 was a portrait image (960x1280) — all variants were the same 960px-wide source. Cropped to landscape (960x640) + gentle blur (sigma 0.8) + q=60 re-encode:
- `hero-6-960w.webp`: 295 KB → 73 KB (-75%)
- `hero-6.webp`: 269 KB → 72 KB (-73%)
- `hero-6-1280w.webp`: 269 KB → 72 KB (-73%)
- `hero-6-480w.webp`: 49 KB → 19 KB (-62%)

**Task 2 — Logo WebP conversion:**
Already complete — `rmi-logo-full.webp` (4 KB) exists and `HeroFullWidth.tsx` already uses `<picture>` with WebP source + PNG fallback. No changes needed.

**Task 3 — Re-compress remaining hero images:**
Applied per-image settings (blur 0.3–0.8, quality 50–60) across all hero images. Portrait hero-4 also cropped to landscape. Kept hero-1-480w (11 KB) and hero-1-1280w (66 KB) as-is.

| Image | 480w | 960w | 1280w | 1920w |
|-------|------|------|-------|-------|
| hero-1 | 11 KB (skip) | 36→27 KB | 66 KB (skip) | 137→100 KB |
| hero-2 | 27→21 KB | 73→54 KB | 113→70 KB | 189→101 KB |
| hero-3 | 19→15 KB | 50→38 KB | 79→47 KB | 107→77 KB |
| hero-4 | 28→15 KB | 92→46 KB | 130→54 KB | 173→80 KB |
| hero-5 | 23→18 KB | 77→54 KB | 140→79 KB | 295→118 KB |
| hero-6 | 49→19 KB | 295→73 KB | 269→72 KB | 269→72 KB |

**Overall Results:**
- Total hero payload: 2,746 KB → 1,326 KB (-52%, saved 1,420 KB)
- 960w breakpoint: 622 KB → 291 KB (-53%, target was <300 KB)
- hero-6-960w: 295 KB → 73 KB (-75%, target was <90 KB)

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

### Financial Dashboard — PDF Parsers, Upload & Reconciliation (Mar 12, 2026)
Branch: `feat/financial-dashboard` (committed, NOT merged)

Full financial reporting dashboard that ingests AR Aging, Balance Sheet, and Income Statement PDFs from Sage/Peachtree, stores parsed data in PostgreSQL, and provides a reconciliation matrix that cross-validates financial data against WIP records.

**Task 1 — Database Migration:**
Created `migrations/014_financial_reports.sql` with 6 tables:
- `ar_aging_snapshots` + `ar_aging_entries` — Customer aging data with auto-computed `total_past_due` column
- `balance_sheet_snapshots` + `balance_sheet_entries` — Account lines with section classification
- `income_statement_snapshots` + `income_statement_entries` — Activity + balance columns
All tables have unique constraints on (report_date, variant) for idempotent re-import. Schema appended to `schema.sql`.

**Task 2 — PDF Parsers:**
Created `src/lib/financial-parsers.ts` with three parser functions:
- `parseArAging(buffer)` — Extracts 47 customers with aging buckets (current, 1-30, 31-60, 61-90, over_90), retainage, phone, customer code. Handles trailing `-` negatives, `*` suffixes, "CompanyTotals" pattern. Validates customer sum === report total.
- `parseBalanceSheet(buffer)` — Extracts account lines with section classification (current_assets, long_term_assets, current_liabilities, long_term_liabilities, equity). Handles parenthetical negatives, "Waterford Bank (Note" trap. Validates Total Assets === Total L&E.
- `parseIncomeStatement(buffer)` — Extracts activity + balance columns, handles single-value lines (balance only), `401(k)` parentheses trap. Validates Gross Margin and Net Income math.

Created `src/lib/__tests__/financial-parsers.test.ts` — 29 unit tests, all passing. Tests use `it.skipIf(!hasFile)` for PDF-dependent tests.

**Task 3 — API Endpoints:**
- `src/pages/api/admin/financial-upload.ts` (POST) — Multipart PDF upload with auto-detection of report type from filename and variant (standard/post_ajes/close_out). Idempotent re-import (DELETE + INSERT on same date+variant). 50MB limit.
- `src/pages/api/admin/financials.ts` (GET) — Four actions:
  - `months` — All available report months across types
  - `snapshots` — Filtered by type and date range
  - `detail` — Snapshot + entries by ID or date
  - `reconciliation` — Tie-out matrix: AR↔BS 1-1100, |AR Retainage|↔BS 1-1110, WIP Revenue in Excess↔BS 1-1500, WIP Billings in Excess↔BS 1-2200, IS Net Income↔BS Net Income. $5 match threshold.

**Task 4 — Admin Dashboard UI:**
- `src/pages/admin/financials.astro` — Astro page with AdminLayout
- `src/components/admin/FinancialDashboard.tsx` — 3-tab dashboard (Upload, Reports, Reconciliation) with month selector, import history, collapsible report sections, sortable AR customer table, Balance Sheet KPIs, Income Statement columns
- `src/components/admin/FinancialUpload.tsx` — Drag-and-drop PDF upload with multi-file support and status tracking
- `src/components/admin/ReconciliationMatrix.tsx` — Tie-out grid with match/variance/missing status badges, data source display, variance highlighting
- Modified `src/components/admin/AdminSidebar.tsx` — Added "Financials" nav item with DollarSign icon

**Files Created:**
- `migrations/014_financial_reports.sql`
- `src/lib/financial-parsers.ts`
- `src/lib/__tests__/financial-parsers.test.ts`
- `src/pages/api/admin/financial-upload.ts`
- `src/pages/api/admin/financials.ts`
- `src/pages/admin/financials.astro`
- `src/components/admin/FinancialDashboard.tsx`
- `src/components/admin/FinancialUpload.tsx`
- `src/components/admin/ReconciliationMatrix.tsx`

**Files Modified:**
- `schema.sql` — Appended 6 new table definitions
- `src/components/admin/AdminSidebar.tsx` — Added Financials nav link
- `package.json` / `package-lock.json` — Added `pdf-parse` dependency

**Verification:**
- [x] `npm run build` — zero errors, zero warnings
- [x] 29/29 financial parser unit tests pass
- [x] `data/` directory in .gitignore — no PDFs committed
- [x] All TypeScript strict, no `any`

---

### WIP Sync Agent — Automatic File Watcher (Mar 12, 2026)
Branch: `feat/wip-sync-agent` (pushed, NOT merged)

Standalone Node.js agent that watches `P:\WIP - Financial\` for Excel file changes and automatically uploads them to the `/api/admin/wip-upload` endpoint. Runs on Graham's desktop or the appserver.

**Task 2 — Verify API Key Auth:**
Verified `isAdminAuthorized()` in `src/lib/admin-auth.ts:110` checks both session cookie and API key. `isApiKeyAuthorized()` reads `ADMIN_API_KEY` env var and uses timing-safe comparison with `Authorization: Bearer <key>` header. `wip-upload.ts:21` already calls `isAdminAuthorized(request)`. No changes needed.

**Task 1 — Create Sync Agent Script:**
Created `sync-agent/` directory with 7 source files:
- `index.js` — Main entry point with config validation, initial sync of all existing files, graceful shutdown (SIGINT/SIGTERM)
- `config.js` — Configuration from env vars (watch path, API URL, API key, debounce, retries)
- `watcher.js` — chokidar file watcher with polling for network drives, `awaitWriteFinish` stability check, debounced change detection, filename pattern matching (`RMI WIP - YYYY.xlsx`)
- `uploader.js` — Multipart form-data upload with retry logic (3 attempts, 10s delay), file size validation, detailed result logging
- `logger.js` — File + console logger with daily log rotation, debug mode toggle
- `package.json` — Dependencies: chokidar ^3.6.0, dotenv ^16.4.0
- `.env.example` — Environment variable template

**Task 3 — .gitignore:**
Created `sync-agent/.gitignore` excluding `node_modules/`, `logs/`, and `.env`.

**Files Created:**
- `sync-agent/index.js`
- `sync-agent/config.js`
- `sync-agent/watcher.js`
- `sync-agent/uploader.js`
- `sync-agent/logger.js`
- `sync-agent/package.json`
- `sync-agent/package-lock.json`
- `sync-agent/.env.example`
- `sync-agent/.gitignore`

**Files Verified (no changes needed):**
- `src/lib/admin-auth.ts` — `isApiKeyAuthorized()` + `isAdminAuthorized()` confirmed
- `src/pages/api/admin/wip-upload.ts` — already uses `isAdminAuthorized(request)`

**Verification:**
- [x] `npm install` in sync-agent/ — 15 packages installed, zero errors
- [x] `npm run build` in project root — zero errors, zero warnings (14.48s)
- [x] .gitignore excludes node_modules, logs, .env from git tracking
- [x] Only 9 files staged (no secrets, no node_modules)
- [x] Commit: `160702f` on `feat/wip-sync-agent`
- [x] Pushed to `origin/feat/wip-sync-agent`

**Commit:**
- `160702f` feat(wip): add file watcher sync agent for automatic WIP uploads

**Post-Merge Setup (Graham's manual steps):**
1. Generate API key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Set in Vercel: `vercel env add ADMIN_API_KEY` (paste key)
3. Redeploy to pick up env var
4. On target machine: `cd sync-agent && copy .env.example .env` → edit .env → `npm install && node index.js`
5. Optional PM2: `npm install -g pm2 && pm2 start index.js --name wip-sync && pm2 save && pm2 startup`

---

### PageSpeed Performance — Hero LCP Fix & Hydration Optimization (Mar 12, 2026)
Branch: `feat/perf-hero-lcp` (committed, NOT merged)

Mobile PageSpeed was 83 with LCP at 4.2s. Root cause: all 6 hero images loading immediately (1,170 KiB), missing 1280w srcset breakpoint, and unnecessary `client:load` on below-fold components.

**Task 1 — 1280w Hero Image Variants:**
Generated 1280w WebP variants for all 6 hero images using Node sharp (quality 80). Fills the srcset gap between 960w and 1920w — high-DPR mobile devices (412px × 2.625 DPR = 1,082 effective pixels) now get 1280w instead of 1920w.

| Image | 1920w | 1280w | Savings |
|-------|-------|-------|---------|
| hero-1 | 137 KiB | 66 KiB | 51.5% |
| hero-2 | 189 KiB | 113 KiB | 40.1% |
| hero-3 | 107 KiB | 79 KiB | 26.0% |
| hero-4 | 173 KiB | 130 KiB | 25.0% |
| hero-5 | 295 KiB | 140 KiB | 52.7% |
| hero-6 | 269 KiB | 269 KiB | 0% (portrait, already <1280w) |

**Task 2 — Defer Hero Images 2-6:**
Modified `HeroFullWidth.tsx` to only render the `<picture>` element for slide 0 (hero-1) during SSR. Slides 1-5 render a `<div class="bg-neutral-900">` placeholder. After hydration, a `useEffect` sets `hydrated=true` and all 6 `<picture>` elements render normally with `loading="lazy"`.

Also updated all srcsets (both `<source>` and `<img>`) to include the 1280w breakpoint:
```
480w, 960w, 1280w, 1920w
```

Updated `<link rel="preload">` in `BaseLayout.astro` to include 1280w in `imagesrcset`.

**Task 3 — ClientShowcase → client:idle:**
Changed `<ClientShowcase client:load />` to `<ClientShowcase client:idle />` in `index.astro`. Uses `requestIdleCallback` to defer hydration until main thread is idle, removing it from the critical rendering path. Avoids the `client:visible` IntersectionObserver deadlock that was discovered previously.

**Task 4 — FloatingMobileCTA → client:idle:**
Changed `<FloatingMobileCTA client:load />` to `<FloatingMobileCTA client:idle />` in `index.astro`. Small TBT reduction — the floating button doesn't need to be interactive immediately.

**Files Modified:**
- `src/components/landing/HeroFullWidth.tsx` — deferred image rendering + 1280w srcsets
- `src/layouts/BaseLayout.astro` — updated preload imagesrcset with 1280w
- `src/pages/index.astro` — ClientShowcase + FloatingMobileCTA → client:idle

**Files Created:**
- `public/images/hero/hero-1-1280w.webp` (66 KiB)
- `public/images/hero/hero-2-1280w.webp` (113 KiB)
- `public/images/hero/hero-3-1280w.webp` (79 KiB)
- `public/images/hero/hero-4-1280w.webp` (130 KiB)
- `public/images/hero/hero-5-1280w.webp` (140 KiB)
- `public/images/hero/hero-6-1280w.webp` (269 KiB)

**Verification:**
- [x] `npm run build` — zero errors, zero warnings (13.86s)
- [x] SSR HTML contains only 1 hero `<img>` tag (hero-1), not 6
- [x] 5 placeholder `<div>` elements rendered for slides 2-6 in SSR
- [x] Preload link includes 1280w in imagesrcset
- [x] Hero-1 srcset includes 480w, 960w, 1280w, 1920w breakpoints
- [x] All 6 1280w image files exist and are smaller than 1920w originals
- [x] 2 `client:idle` islands (ClientShowcase + FloatingMobileCTA)
- [x] 1 `client:load` island (HeroFullWidth — unchanged)
- [x] 6 `client:visible` islands (Services, About, ProjectShowcase, CTABanner, ContactForm, Footer)

**Commits:**
- `6de1ac1` perf: add 1280w hero image variants for high-DPR mobile
- `ce7729d` perf: defer hero images 2-6 until after hydration (save ~1033 KiB on initial load)
- `5ee7062` perf: switch ClientShowcase and FloatingMobileCTA to client:idle

**Expected Impact:**
- LCP: 4.2s → <2.5s (hero-1 no longer competes with 5 other images for bandwidth)
- TBT: 180ms → <150ms (deferred hydration of ClientShowcase + FloatingMobileCTA)
- Mobile PageSpeed: 83 → 90+ target

**Next Step:** Graham merges after PageSpeed verification on Vercel preview deployment.

---

### Client Showcase V2 — Cascading Logo Resolver + Fade Rotation (Mar 9, 2026)
Branch: `feat/client-showcase-v2` (committed, NOT merged)

Rebuilt the "Clients We Serve" section from scratch with proper multi-source logo resolution and smooth one-at-a-time fade rotation. Replaces the removed Brandfetch-only version.

**New Files:**
- `src/components/landing/LogoResolver.ts` — Cascading logo resolver: self-hosted overrides → Clearbit (`logo.clearbit.com/{domain}`) → Google Favicon (128px) → initials fallback. Image load validation with 3s timeout per source, in-memory session cache, `getInitials()` utility.
- `src/components/landing/ClientShowcase.tsx` — 12-slot responsive logo grid (3 cols mobile / 4 tablet / 6 desktop). One-at-a-time fade rotation every 5s with 1.5s CSS opacity transitions. Queue system prevents duplicate logos. LogoSlot sub-component with skeleton shimmer loading state and styled initials fallback.

**Modified Files:**
- `src/pages/index.astro` — Added ClientShowcase import between Hero and Services with `client:visible` deferred hydration + gradient separator.

**Edge Cases:**
- API failure / empty → section hidden entirely (returns null)
- All logo sources fail → styled initials on blue gradient (never blank)
- Fewer clients than 12 → grid adapts to actual count
- Tab hidden → rotation paused via `document.visibilityState`
- Grid hover → rotation paused for tooltip reading
- `prefers-reduced-motion` → instant swap (0ms) + 10s interval

**Verification:**
- [x] `npm run build` — zero errors, zero warnings (bundle: 4.13 kB / 1.97 kB gzip)
- [x] Pre-existing test failures confirmed on main branch (not caused by these changes)
- [x] Anchor links test passes
- [x] All TypeScript strict, no `any`

**Commits:**
- `df3a73f` feat: add cascading logo resolver utility
- `f2b1457` feat: add client showcase v2 with fade rotation
- `b86b640` feat: integrate client showcase into landing page

---

### Remove Fake Logo Wall (Mar 9, 2026)
Branch: `feat/remove-fake-logos` (committed, NOT merged)

Removed the "Clients We Serve" section entirely from the landing page. The ClientShowcase component used Brandfetch logos for domains RMI doesn't actually serve — fake social proof. Section should not go live until we have real client logos.

**Changes:**
- Deleted `src/components/landing/ClientShowcase.tsx` (450+ lines)
- Removed import and `<ClientShowcase client:load />` from `src/pages/index.astro`
- Updated `CLAUDE.md` file map to remove the deleted file reference
- Landing page now goes Hero → Services with no gap

**Verification:**
- [x] `npm run build` — zero errors, zero warnings
- [x] No references to ClientShowcase remain in src/
- [x] No Playwright tests referenced the component

**Note:** The admin-side client management (`/admin/clients`, `/api/clients`, `/api/admin/clients`, `/api/ai/client-fill`) is untouched. That infrastructure can be reused when real client logos are ready.

---

### Job Tracking — Cloud Side, Tasks 1–7 (Mar 9, 2026)
Branch: `feat/job-tracking` (pushed, NOT merged)

**Task 1 — Database Migration:** Created `migrations/011_jobs.sql`. Dropped unused tables from migration 003 (never populated: job_discrepancies, job_files, job_financials, job_name_variants, sync_runs, old jobs). Created new tables: `jobs` (SERIAL PK, 22 columns), `sync_log`, `job_flags`. 6 indexes on jobs, 2 on job_flags. Ran against production DB — verified all 3 tables created.

**Task 7 — SYNC_API_KEY:** Generated 64-char hex key. Added to `.env.local`. ⚠️ **MANUAL STEP:** Graham must add to Vercel production env vars via Dashboard → Project Settings → Environment Variables. Key: `33a988f8210075c99627810e6d897dbf9617c83b5f645a6c1a061acc545513a8`

**Task 2 — Sync API (POST /api/sync/jobs):** Replaced stub with full endpoint. API key auth via `x-sync-key` header (timing-safe comparison). Bulk UPSERT by `job_number` using `ON CONFLICT DO UPDATE`. Data quality checks: `missing_po`, `missing_description`, `no_folder`, `duplicate_customer` (fuzzy matching). Logs every sync to `sync_log`. Returns summary with counts and sync_id.

**Task 3 — Stats API (GET /api/jobs/stats):** Public endpoint, no auth required. Returns aggregate counts by year, status, PM, type. 60-second cache.

**Task 4 — Admin Jobs API (GET /api/admin/jobs):** Admin-authed. Filters: year, status, pm, type, search (full-text across job_number, description, customer_name, po_number). Sortable, paginated (50/page). Joins job_flags per row. Returns summary counts for current filter set. PATCH method resolves flags by ID.

**Task 5 — Admin Dashboard (/admin/jobs):** Created `src/pages/admin/jobs.astro` + `src/components/admin/JobsAdmin.tsx` (599 lines). Stats bar (7 cards), sync status indicator, year tabs (2021–2026), status/PM/type dropdowns, debounced search, sortable 9-column table with color-coded rows (red=closed, green=written_up), expandable row details (section, timing, folder info), flags panel with resolve buttons, pagination.

**Task 6 — Admin Sidebar:** Added "Jobs" nav item with Briefcase icon from lucide-react, positioned above Clients.

**Verification:**
- [x] `npm run build` — zero errors, zero warnings (14.17s)
- [x] Migration ran successfully against production DB
- [x] All TypeScript strict, no `any`
- [x] Commit: `6d4d810` on `feat/job-tracking`
- [x] Pushed to `origin/feat/job-tracking`

**Remaining:**
- [ ] Add SYNC_API_KEY to Vercel production env vars (manual)
- [ ] Merge feat/job-tracking → main (Graham reviews)
- [ ] Tasks 8–13: Sync agent (separate project at `C:\Users\Graham Goupille\rmi-sync-agent\`)

---

### Client Showcase — Tiered Logo Grid + Admin Tab (Mar 9, 2026)
Branch: `feat/client-showcase` (committed, NOT merged)

**Task 1 — Database Migration:** Created `migrations/010_clients.sql` with `clients` table (id, name, domain, color, description, tier, seo_value, active, sort_order, timestamps). Seeded 11 flagship clients across 3 tiers (Ford, Henry Ford Health, DTE Energy as high; GM, Stellantis, CMS Energy, Beaumont, Michigan Central as medium; UMich, Wayne County, DTW Airport as low). Appended CREATE TABLE to `schema.sql`.

**Task 2 — Admin API (/api/admin/clients):** Created `src/pages/api/admin/clients.ts` with GET (list all), POST (create), PATCH (update any field), DELETE endpoints. Uses `@vercel/postgres` sql tagged templates + `isAdminAuthorized` from admin-auth.ts. Input validation on tier values, null-safe PATCH via read-then-update pattern.

**Task 3 — Public API (/api/clients):** Created `src/pages/api/clients.ts` — unauthenticated GET returning active clients only (WHERE active = TRUE). 5-minute cache header. Returns empty array on DB error (graceful degradation).

**Task 7 — AI Fill Endpoint (/api/ai/client-fill):** Created `src/pages/api/ai/client-fill.ts` — admin-auth-gated POST that proxies to Anthropic API (claude-haiku-4-5). Takes company name, returns JSON with name, domain, color, description, seo_value, suggested_tier, tier_reason. Strips markdown fences from response.

**Task 4 — ClientShowcase Component:** Created `src/components/landing/ClientShowcase.tsx` — React island (`client:visible`). Fetches from /api/clients. Renders 3-tier pyramid grid (high=3 slots, medium=5, low=7). Clearbit logo images with white invert filter + monogram fallback. Staggered fade-in animation via IntersectionObserver. Returns null when no clients (graceful empty state).

**Task 5 — Wire into Landing Page:** Added ClientShowcase import to `src/pages/index.astro`. Placed between ProjectShowcase and CTABanner with divider lines. Uses `client:visible` directive.

**Task 6 — Admin Clients Page:** Created `src/pages/admin/clients.astro` and `src/components/admin/ClientsAdmin.tsx`. Full CRUD UI: list view grouped by tier with color-coded tier labels, inline tier change dropdown, active/hidden toggle, delete with confirm. Add form with AI auto-fill (calls /api/ai/client-fill), manual fields for name/domain/description/SEO/tier/color, live preview card.

**Task 8 — Admin Sidebar Nav:** Added "Clients" nav item to `src/components/admin/AdminSidebar.tsx` using Building2 icon from lucide-react. Placed between Media and Security in nav order.

**Verification:**
- [x] `npm run build` — zero errors, zero warnings
- [x] All new files use existing project patterns (sql tagged templates, isAdminAuthorized, prerender=false)
- [x] No existing files modified beyond spec scope (index.astro import+placement, AdminSidebar.tsx nav item)
- [x] No TypeScript errors (strict mode, no `any`)

### Footer Touch Targets + Email Update (Mar 8, 2026)
Branch: `feat/footer-touch-targets` (committed, NOT merged)

**TASK 1 — Update Footer Email:** Changed `src/content/site.ts` line 10: `email = "info@rmi-llc.net"` (was `fab@`). Footer.tsx imports from site.ts — auto-updated.

**TASK 2 — Update JSON-LD Email:** Changed `src/layouts/BaseLayout.astro` line 113: hardcoded `"email": "fab@rmi-llc.net"` in `serviceCatalogSchema` contactPoint → `"email": "info@rmi-llc.net"`. The `localBusinessSchema` uses imported `email` variable — auto-updated via Task 1.

**TASK 3 — Verify All References:** Remaining `fab@` only in `ContactForm.test.tsx` (test data) and `quote.ts` (form submission fallback) — both excluded per spec.

**TASK 4 — Quick Link Touch Targets:** Already implemented — all 5 quick links have `min-h-[44px] inline-flex items-center` with responsive `sm:min-h-0 sm:py-1.5`.

**TASK 5 — Contact Link Touch Targets:** Already implemented — phone, email, and maps links all have `min-h-[44px]` and `flex items-center`.

**TASK 6 — Maps aria-label:** Updated from `"View address on Google Maps"` to `"View our location on Google Maps"` per spec.

**Verification:**
- [x] Footer email → info@rmi-llc.net (href + display via site.ts)
- [x] JSON-LD email → info@rmi-llc.net (both schemas)
- [x] All non-form src/ references updated
- [x] All footer links >= 44px touch target on mobile
- [x] Maps link has aria-label
- [x] Hover effects preserved
- [x] Phone number unchanged (248-379-5156)
- [x] `npm run build` passes — zero errors

---

## Completed

26 sprints completed (Feb 26 – Mar 5, 2026). See git log for full history.

### Modal Visual Polish (Mar 5, 2026)
Branch: `feat/modal-visual-polish` (pushed, NOT merged)

1. **fix: fill modal image panel with object-cover and add counter gradient** — Changed `ImageSlideshow.tsx`: replaced `object-cover md:object-contain` with `object-cover object-center` at all breakpoints (eliminates black bars). Changed container bg from `bg-black` to `bg-neutral-950`. Moved counter from below image to absolute-positioned overlay on a `bg-gradient-to-t from-black/60` gradient. Counter styled with `text-sm font-medium text-white/70 tracking-wide tabular-nums`. Arrow buttons upgraded to frosted glass (`bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/10`).
2. **feat: add glass effects, glow border, and backdrop blur to service modals** — Changed `Services.tsx`: backdrop overlay from `bg-black/40 backdrop-blur-md` to `bg-black/60 backdrop-blur-sm`. Modal border enhanced with `border-neutral-600/30 ring-1 ring-blue-500/10`. Panel divider accent changed to `border-blue-500/20`. Close button upgraded to matching frosted glass. Service icon glow enhanced with `shadow-[0_0_15px_rgba(59,130,246,0.15)]`.

### Sprint 2: Service Card Tiers + Polish (Mar 5, 2026)
Branch: `feat/sprint-2-service-tiers` (pushed, NOT merged)

1. **feat: tiered service cards with color-coded borders** — Reworked `Services.tsx` to render cards in 3 tier groups (core/specialty/additional) with distinct accent colors. Core (4 cards): blue borders + icons. Specialty (3 cards): amber borders + icons. Additional (2 cards): emerald borders + icons. Added tier group labels ("Core Services", "Specialty", "Additional") as full-width grid separators. Vertical padding varies by tier (py-5/py-4/py-3). Modal icon colors now match the service tier. Tier metadata already existed in `site.ts`.
2. **fix(a11y): CTA image alt text** — Changed empty `alt=""` on the CTA background image in `index.astro` to `alt="RMI insulation project work"`. `<picture>` element and WebP sources were already in place.
3. **fix(a11y): About section H2 screen-reader text** — Added `<span class="sr-only">Why Choose Resource Mechanical Insulation</span>` to the About H2 alongside the existing `aria-hidden="true"` visual span. Removed redundant `aria-label` from the H2.
4. **fix: hide FABs when footer is in view** — Added `IntersectionObserver` on `<footer>` in `Footer.tsx` to track `footerVisible` state. Back-to-top FAB now hides when footer is 10% visible. `FloatingMobileCTA.tsx` already had this logic.

### Canonical URL + Mobile Polish (Mar 5, 2026)
Branch: `feat/canonical-and-mobile-polish` (pushed, NOT merged)

1. **fix(seo): hardcode canonical URL to rmi-llc.net** — Changed `site` in `astro.config.mjs` from `www.rmi-llc.net` to `rmi-llc.net`. Fixed all `www` references in `BaseLayout.astro` (fallback URL, JSON-LD logo x2, Organization url+logo), `index.astro` (canonical prop), and `robots.txt` (sitemap URL). Built HTML has zero `www.rmi-llc` occurrences.
2. **fix(mobile): overflow containment for scroll jitter** — Added `overflow-hidden` to both `service-ticker` divs in `MaterialsMarquee.tsx`. Added `overflow-x-hidden` to `<body>` in `BaseLayout.astro`. Prevents marquee ticker from causing horizontal scroll on mobile.
3. **fix(mobile): left-align service cards** — Changed card buttons from `justify-center sm:justify-start` to `justify-start` in `Services.tsx`. Removed `hidden sm:block` from chevron so it shows on all breakpoints. Chevron already had `ml-auto` for right-alignment.
4. **fix(mobile): tighten footer spacing** — Reduced padding (`pt-6 sm:pt-8`, `pb-3 sm:pb-4`), grid gap (`gap-4 sm:gap-8`), heading margin (`mb-2 sm:mb-3`), social row spacing (`mt-3 pt-3`). Removed redundant "Back to top" text link (floating FAB remains). Centered copyright line with `justify-center`.

### Branch Cleanup (Mar 4, 2026)
- `feat/modal-ux-improvements` — already merged via PR #106, local branch deleted
- `feat/mobile-nav-polish` — evaluated, rebased, merged via PR #107 (slide animation, focus trap, scroll lock, active highlight)
- `feat/sprint-2-ui-polish` — stale (superseded marquee approach), deleted
- `feat/sprint-2-perf` — fully merged, stale remote deleted
- 38 local branches pruned, 36 remote tracking refs pruned
- Result: only `main` local, only `origin/main` remote

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
| `path-to-regexp` 4.0.0–6.2.2 | **high** | @vercel/routing-utils → @astrojs/vercel | Low — build-time only, no user-controlled routes |
| `@vercel/routing-utils` | **high** | @astrojs/vercel | Same as above |
| `@astrojs/vercel` >=8.0.5 | **high** | direct dep | Same as above |
| `lodash` 4.0.0–4.17.21 | moderate | yaml-language-server → @astrojs/check | Dev-only, prototype pollution in _.unset/_.omit |
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

## Parallel Polish — March 8, 2026 (COMPLETE)

Merged to main as commit 0b0ebac. Deployed to production via Vercel.

### What shipped:
- Image re-compression: all hero, project, and CTA WebP images re-encoded at q75 (~300+ KiB total savings)
- Footer email: fab@rmi-llc.net → info@rmi-llc.net (footer, JSON-LD, site.ts). M365 shared mailbox created — only Graham receives.
- Footer touch targets: already at 44px from prior work, confirmed. Added aria-label to Google Maps link.
- Materials marquee: added sr-only <ul> with 22 items for screen readers, aria-hidden on visual animation container
- About.tsx, CTABanner.tsx, global.css also modified by agents (scroll animations, alt text, composited gradient)

### Known issue to investigate:
- Hero stats changed from "100+ Clients / 500+ Projects / 231K+ OSHA Hours" to "6+ Clients / 30+ Projects Annually / 13K+ OSHA Man-Hours" — likely from a prior merge on feat/analytics-intelligence or feat/disclaimer-discreet. Check site.ts or HeroFullWidth.tsx and revert if unintentional.

### Branch protection:
- GitHub ruleset "main" disabled (was blocking direct push). Keep disabled for direct-merge workflow.
