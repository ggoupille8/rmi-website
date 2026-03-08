# RMI Website — Task Tracker

## Current

_No active tasks._

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
