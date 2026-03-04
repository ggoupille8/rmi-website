# RMI Website — Task Tracker

## Current

_No active tasks._

---

## Completed Sprints

### Sprint 1: High Impact UI Audit Fixes
**Branch:** `feat/sprint-1-ui-audit` | **Date:** 2026-02-26 | **Tasks:** 6/6 complete
- Hero overlay gradient, dead space, stats tightening
- Replaced 3 project cards (Henry Ford Hospital, Michigan Central Station, Ford World HQ)
- Moved social links to footer
- Domain reference audit (`rmi-llc.net` everywhere)

### Sprint 2: UI Audit Polish
**Branch:** `feat/sprint-2-ui-polish` | **Date:** 2026-02-26 | **Tasks:** 8/8 complete
- Service cards tiered layout (core/specialty/additional)
- Added Projects to navbar and footer
- About section content dedup, "Projects / Yr" shortLabel fix
- Marquee fade mask, CTA banner image, FAB positioning, footer service area text

### Sprint 3: Analytics Setup + Final Polish
**Branch:** `feat/sprint-3-analytics-polish` | **Date:** 2026-02-26 | **Tasks:** 6/6 complete
- GA4 install (env-var-driven), form submission tracking, Search Console meta
- EMR safety rating added to About card

### Sprint 5: Icon Visibility, Smooth Scroll & Cleanup
**Branch:** `feat/sprint-5-icon-polish` | **Date:** 2026-02-26 | **Tasks:** 5/5 complete
- About icon borders, smooth scroll, deleted old sprint files

### Google Business Profile Integration
**Branch:** `feat/google-business-integration` | **Date:** 2026-02-26 | **Tasks:** 2/2 complete
- Google Business icon in footer, JSON-LD hours corrected to 07:00-16:00

### Mobile Real-Device Fixes
**Branch:** `feat/mobile-real-device-fixes` | **Date:** 2026-02-26 | **Tasks:** 4/4 complete
- Marquee fade masks, FAB footer observer, ghost CTA, Services/About gap

### Hard Polish — Landing Page Final Pass
**Branch:** `feat/hard-polish` | **Date:** 2026-02-26 | **Tasks:** 7/7 complete
- Removed service subcategory labels and project badges
- Hero dead space fix, CTA banner overlay rewrite
- Section spacing reduction, Safety-First card shortened

### Follow-Up Polish
**Branch:** `feat/followup-polish` | **Date:** 2026-02-26 | **Tasks:** 3/3 complete
- Ghost CTA visibility, marquee CSS mask-image, CTA heading dedup

### Final Polish
**Branch:** `feat/final-polish` | **Date:** 2026-02-26 | **Tasks:** 6/6 complete
- Removed ghost CTA, hero 100dvh, unified card colors, "Featured Projects" rename
- CTA banner size increase, contact form spacing

### Sprint 3: Accessibility & UX
**Branch:** `feat/sprint-3-polish` | **Date:** 2026-02-27 | **Tasks:** 5/5 complete
- CTA alt text, hero stat label font size, service card font size
- Responsive marquee mask, FAB rootMargin trigger

### Sprint 3B: Marquee Mask + Test Fixes
**Branch:** `fix/sprint-3b-polish` | **Date:** 2026-02-27 | **Tasks:** 2/2 complete
- Wider marquee mask, 12 ContactForm unit test fixes

### Deep Polish — Senior Developer Pass
**Branch:** `fix/deep-polish` | **Date:** 2026-02-27 | **Tasks:** 9/9 complete
- Autocomplete attributes, aria-label/aria-haspopup on cards
- Optimized navbar logo (200px WebP/PNG), section spacing normalization
- `npx tsc --noEmit` zero errors (was 12), stale file cleanup

### Polish Round 2 — Production Verification
**Branch:** `fix/polish-r2` | **Date:** 2026-02-27 | **Tasks:** 8/8 complete
- Percentage-based marquee mask, focus-visible outlines
- ErrorBoundary on all 6 React islands, Lighthouse CLS fixes

### Sprint 2: SEO & Polish
**Branch:** `feat/sprint-2-seo-polish` | **Date:** 2026-02-27 | **Tasks:** 5/5 complete
- Meta description/keywords, service schema JSON-LD, CTA image positioning

### Footer Section Polish
**Branch:** `feat/footer-polish` | **Date:** 2026-02-27 | **Tasks:** 4/4 complete
- Removed Google Business icon, added dividers, Quick Links spacing

### Vercel Analytics & Speed Insights
**Branch:** `feat/vercel-analytics` | **Date:** 2026-03-01 | **Tasks:** 4/4 complete
- Installed @vercel/analytics + @vercel/speed-insights, added to BaseLayout

### Service Image Slideshows
**Branch:** `feat/service-image-slideshows` | **Date:** 2026-03-01 | **Tasks:** 6/6 complete
- Renamed/optimized 91 service images (WebP + JPG, 43% size savings)
- New hero-6 image, ImageSlideshow component in service modals
- ServiceImage interface + images arrays in site.ts

### Sprint 2: Content Fix + UI Polish
**Branch:** `feat/sprint-2-content-fixes` | **Date:** 2026-03-03 | **Tasks:** 4/4 complete
- Ford HQ name fix, About heading aria-label, canonical URL audit

### Astro 4 → 5 Upgrade
**Branch:** `feat/astro-5-upgrade` | **Date:** 2026-03-03 | **Tasks:** 5/5 complete
- astro 5.18.0, @astrojs/react 4.4.2, @astrojs/vercel 9.0.4
- See `tasks/lessons.md` for upgrade notes and remaining vulnerabilities

### Sprint 2: UI Polish & Visual Improvements
**Branch:** `feat/sprint-2-ui-polish` | **Date:** 2026-03-03 | **Tasks:** 5/5 complete
- Marquee responsive masks, service card visual tiering
- About subtitle dedup, Track Record proof points, JSON-LD areaServed (5 states)

### Mobile Polish & Remaining Fixes
**Branch:** `fix/mobile-polish-march4` | **Date:** 2026-03-04 | **Tasks:** 8/8 complete
- Hero preload href, favicon.ico, logo WebP, GA preconnect
- Footer Contact link, service card touch targets, marquee a11y, form input height

### Error Handling & 404 Page Enhancements
**Branch:** `feat/error-handling-404` | **Date:** 2026-03-04 | **Tasks:** 6/6 complete
- Custom 404 page (decorative text, secondary CTA, Footer)
- Contact form blur validation, email/phone format checks
- Server error UI with phone link and "Try Again" button

### Performance & LCP Optimization
**Branch:** `fix/perf-lcp-optimization` | **Date:** 2026-03-04 | **Tasks:** 5/5 complete
- Inline critical CSS (`build.inlineStylesheets: 'always'`)
- CTA background image responsive variants (960w/1920w WebP)
- Width/height on ImageSlideshow `<img>` tags
- Hero srcsets and font-display already implemented from prior sprints

### UX Micro-Interactions
**Branch:** `feat/ux-micro-interactions` | **Date:** 2026-03-04 | **Tasks:** 6/6 complete
- Enhanced navbar scroll shadow (opacity 0.1 → 0.3)
- Hero slideshow dot indicators with role="tablist"
- Project card hover overlay (bg-black/0 → bg-black/20)
- Contact form success animation (animated checkmark, "Thank you!", "Send Another Message")
- Floating back-to-top button with scroll-based opacity
- Animated stats counter already implemented — verified

### Code Cleanup & Technical Debt
**Branch:** `chore/code-cleanup` | **Date:** 2026-03-04 | **Tasks:** 6/6 complete
- Task 1: ValueProps.tsx and StatsBar.tsx already removed (no action)
- Task 2: Deleted 4 orphaned placeholder images (plan-spec, emergency-response)
- Task 3: Service data already consolidated — ServiceData + ServiceImage interfaces in site.ts
- Task 4: Consolidated todo.md from 1440 lines to ~120 lines
- Task 5: 321/321 unit tests pass, no orphaned test files
- Task 6: npm audit findings documented (see Dependencies section below)

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
