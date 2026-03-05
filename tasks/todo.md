# RMI Website — Task Tracker

## Current

_No active tasks._

---

## Completed

24 sprints completed (Feb 26 – Mar 5, 2026). See git log for full history.

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
