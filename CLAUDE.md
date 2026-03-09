# RMI — Claude Code Context

> Read this file at the start of every session before doing anything else.
> Then read docs/CURRENT_TASK.md for the active task.

---

## Project Identity

Resource Mechanical Insulation (RMI) is a mechanical insulation contractor based in
Romulus, MI. This codebase is a production lead generation website + business
automation system. The owner (Graham) is the only developer. Tone is always
professional, clean, and precise — never over-engineered.

---

## Tech Stack

| Layer        | Technology                                   |
| ------------ | -------------------------------------------- |
| Framework    | Astro 5 (islands architecture)               |
| UI           | React 18 (islands only — client:load)        |
| Language     | TypeScript (strict — no `any`)               |
| Styling      | Tailwind CSS 3 (dark theme only)             |
| Testing      | Playwright (E2E + visual regression)         |
| Unit Tests   | Vitest (happy-dom environment)               |
| Backend      | Astro API routes (serverless)                |
| Database     | PostgreSQL via @vercel/postgres              |
| Email        | SendGrid (@sendgrid/mail) + Resend (backup)  |
| AI           | Anthropic SDK (@anthropic-ai/sdk)            |
| Storage      | Vercel Blob (@vercel/blob)                   |
| Analytics    | Vercel Analytics + Google Analytics Data API |
| Deployment   | Vercel (auto-deploy from main)               |
| Node         | 20.x (locked via .nvmrc)                     |

---

## Architecture Overview

### Frontend (Islands Architecture)
Static Astro pages with selective React hydration. Only interactive components
are hydrated with `client:load`. Page structure:

```
index.astro → Navbar → Hero → Services → About → Marquee → CTA → Contact → Footer
```

### Backend (Serverless API Routes)
All API routes live under `src/pages/api/`. Public routes handle form submissions
and health checks. Admin routes are JWT-authenticated via `src/middleware.ts`.

### Admin Panel
Full admin dashboard at `/admin/` with authentication, lead management, analytics,
media management, job tracking, client management, and IP blacklisting.

### Database
PostgreSQL with 12+ migration files in `migrations/`. Schema versioning is
incremental SQL files — never modify `schema.sql` directly for changes, add
new migration files instead.

---

## Critical File Map

### Core Pages & Layouts
```
src/pages/index.astro            — Landing page (public)
src/pages/404.astro              — 404 error page
src/layouts/BaseLayout.astro     — SEO meta tags, JSON-LD schema
src/layouts/AdminLayout.astro    — Admin panel layout (auth-gated)
src/middleware.ts                — Auth middleware, route protection
```

### Landing Page Components
```
src/components/landing/Navbar.astro          — Fixed header, mobile menu
src/components/landing/HeroFullWidth.tsx     — Hero + animated stats + slideshow
src/components/landing/Services.tsx          — 9 service cards with modal
src/components/landing/About.tsx             — Why Choose RMI section
src/components/landing/ContactForm.tsx       — Quote request form
src/components/landing/MaterialsMarquee.tsx  — Scrolling materials ticker
src/components/landing/CTABanner.tsx         — Call-to-action banner
src/components/landing/Footer.tsx            — Footer + back to top
src/components/landing/FloatingMobileCTA.tsx — Mobile floating contact button
src/components/landing/ProjectShowcase.tsx   — Project gallery cards
src/components/landing/ImageSlideshow.tsx    — Image carousel component
```

### Admin Components
```
src/components/admin/AdminHeader.tsx    — Admin panel header
src/components/admin/AdminSidebar.tsx   — Admin navigation sidebar
src/components/admin/LeadsTable.tsx     — Lead management table
src/components/admin/LeadDetail.tsx     — Individual lead detail view
src/components/admin/AnalyticsDashboard.tsx — Analytics visualization
src/components/admin/MediaManager.tsx   — Media file management
src/components/admin/MediaSlotGrid.tsx  — Media slot grid display
src/components/admin/MediaAuditLog.tsx  — Media audit history
src/components/admin/ImageUploader.tsx  — Image upload interface
src/components/admin/IPBlacklist.tsx    — IP blocking management
src/components/admin/JobsAdmin.tsx      — Job posting management
src/components/admin/ClientsAdmin.tsx   — Client management
```

### Admin Pages
```
src/pages/admin/index.astro      — Admin dashboard
src/pages/admin/login.astro      — Admin login
src/pages/admin/leads.astro      — Leads management
src/pages/admin/analytics.astro  — Analytics dashboard
src/pages/admin/security.astro   — Security settings (IP blacklist)
src/pages/admin/media.astro      — Media management
src/pages/admin/jobs.astro       — Job posting management
src/pages/admin/clients.astro    — Client management
```

### Public API Routes
```
src/pages/api/contact.ts         — Contact form submission (POST)
src/pages/api/quote.ts           — Quote request submission (POST)
src/pages/api/healthz.ts         — Health check endpoint (GET)
src/pages/api/clients.ts         — Public client list (GET)
src/pages/api/media/[slot].ts    — Dynamic media endpoint (GET)
src/pages/api/jobs/stats.ts      — Job statistics (GET)
```

### Admin API Routes (JWT-authenticated)
```
src/pages/api/admin/auth.ts          — Authentication
src/pages/api/admin/contacts.ts      — Contact management
src/pages/api/admin/quotes.ts        — Quote management
src/pages/api/admin/leads.ts         — Lead management
src/pages/api/admin/analytics.ts     — Analytics data
src/pages/api/admin/stats.ts         — Dashboard stats
src/pages/api/admin/audit-log.ts     — Audit log retrieval
src/pages/api/admin/notifications.ts — Notification system
src/pages/api/admin/media.ts         — Media CRUD
src/pages/api/admin/media-audit.ts   — Media audit tracking
src/pages/api/admin/upload.ts        — File upload handler
src/pages/api/admin/blacklist.ts     — IP blacklist management
src/pages/api/admin/jobs.ts          — Job management
src/pages/api/admin/clients.ts       — Client management
src/pages/api/admin/forward-lead.ts  — Lead forwarding
src/pages/api/ai/client-fill.ts      — AI-powered client data completion
src/pages/api/sync/jobs.ts           — Job data synchronization
src/pages/api/sync/status.ts         — Sync status
```

### Library / Utilities
```
src/lib/validation.ts            — Form/input validation
src/lib/rate-limiter.ts          — Request rate limiting
src/lib/db-env.ts                — Database environment setup
src/lib/emailTemplate.ts         — Email template rendering
src/lib/admin-auth.ts            — Admin JWT authentication
src/lib/admin-notifications.ts   — Admin notification system
src/lib/lead-enrichment.ts       — Lead data enrichment
src/lib/leadResponseDraft.ts     — AI-generated response drafts
src/lib/intelligenceCollector.ts — Lead intelligence gathering
src/lib/imageProcessor.ts        — Image processing/resizing
src/lib/media-loader.ts          — Media file loading
src/lib/ipBlacklist.ts           — IP blacklist management
src/lib/ipGeo.ts                 — IP geolocation lookup
src/lib/geo-lookup.ts            — Geographic lookup
src/lib/audit-logger.ts          — Audit logging
src/lib/ensure-audit-table.ts    — Audit table init migration
src/lib/ensure-contacts-soft-delete.ts — Soft delete migration
src/lib/ensure-media-table.ts    — Media table init migration
```

### Content & Styles
```
src/content/site.ts              — All text content (manual edits only)
src/styles/global.css            — CSS custom properties + keyframes
```

### Configuration
```
astro.config.mjs                 — Astro config (Vercel, React, Tailwind, Sitemap)
tailwind.config.mjs              — Design tokens (source of truth for theming)
tsconfig.json                    — TypeScript strict config + path aliases
playwright.config.ts             — E2E config (Chromium/Firefox/WebKit, 1% pixel diff)
vitest.config.ts                 — Unit test config (happy-dom, src/**/*.test.ts)
schema.sql                       — Master database schema (PostgreSQL)
vercel.json                      — Vercel deployment configuration
.env.example                     — Environment variable template
```

### Database Migrations
```
migrations/001_add_phone_nullable_email.sql
migrations/001_add_contact_status.sql
migrations/002_add_lead_intelligence.sql
migrations/003_add_jobs_tables.sql
migrations/004_delete_test_leads.sql
migrations/005_delete_duplicate_sumpter.sql
migrations/006_add_media_audit_log.sql
migrations/007_add_lead_drafts.sql
migrations/008_expand_lead_intelligence.sql
migrations/009_add_ip_blacklist.sql
migrations/010_clients.sql
migrations/011_jobs.sql
migrations/012_beaumont_to_corewell.sql
```

---

## Commands

```bash
npm run dev                              # Start dev server (port 4321)
npm run dev:all                          # Free ports + start dev
npm run build                            # Production build (run before every commit)
npm run test                             # Unit tests + E2E tests
npm run test:visual                      # Visual regression tests
npm run test:visual:update               # Update visual regression baselines
npm run test:unit                        # Vitest unit tests only
npm run test:unit:watch                  # Vitest watch mode
npm run test:unit:coverage               # Vitest with coverage
npm run test:e2e                         # Playwright E2E (Chromium only)
npm run test:e2e:all                     # Playwright E2E (all browsers)
npx playwright test [file]               # Run specific test file
npm run check-secrets                    # Scan for exposed secrets
npm run db:init                          # Initialize database tables
npm run shots                            # Capture screenshots at all breakpoints
```

---

## Testing Architecture

### Unit Tests (Vitest)
- Environment: happy-dom (not jsdom)
- Location: colocated `__tests__/` directories alongside source
- Pattern: `src/**/*.test.ts(x)`
- Setup: `src/test/setup.ts`
- Run: `npm run test:unit`

### E2E Tests (Playwright)
- Browsers: Chromium (default), Firefox, WebKit (via `test:e2e:all`)
- Location: `tests/` directory
- Key test files:
  - `tests/functionality.spec.ts` — core user flows
  - `tests/content.spec.ts` — content verification
  - `tests/accessibility.spec.ts` — WCAG compliance
  - `tests/dark-mode.spec.ts` — dark theme validation
  - `tests/error-scenarios.spec.ts` — error handling
  - `tests/mobile-audit.spec.ts` — mobile UX
- Visual regression: `tests/visual/home.spec.ts`
- Pixel diff threshold: 1% (set in playwright.config.ts)
- Dev server auto-starts on port 4321

### Test Fixtures
- `tests/fixtures.ts` — shared test utilities and mocks

---

## Environment Variables

Required variables (see `.env.example`):
```
SENDGRID_API_KEY         — SendGrid email service
QUOTE_TO_EMAIL           — Destination for form submissions (fab@rmi-llc.net)
QUOTE_FROM_EMAIL         — Sender address for emails
POSTGRES_URL             — PostgreSQL connection string
DATABASE_URL             — Database URL (Vercel format)
ADMIN_API_KEY            — Admin API authentication key
ADMIN_PASSWORD_HASH      — Bcrypt hash for admin login
ADMIN_JWT_SECRET         — JWT signing secret
BLOB_READ_WRITE_TOKEN    — Vercel Blob storage token
ANTHROPIC_API_KEY        — Anthropic API for AI features
RESEND_API_KEY           — Resend email service (backup)
SYNC_TOKEN               — Job sync authentication token
PUBLIC_GOOGLE_SITE_VERIFICATION — Google Search Console
```

---

## Path Aliases (tsconfig.json)

```typescript
@/*                    → src/*
@components/*          → src/components/*
@components/landing/*  → src/components/landing/*
```

---

## Hard Rules — Never Violate

### Code Quality

- Never use `any` in TypeScript — use `unknown` and narrow it
- Never commit with failing tests
- Always run `npm run build` before marking a task complete
- Always add error handling — no silent failures
- Prefer composition over inheritance
- Keep functions small and single-purpose

### UI / Visual

- Dark theme ONLY — never add light mode code under any circumstances
- All interactive touch targets minimum 44x44px (WCAG AAA)
- Never modify visual regression baselines unless CURRENT_TASK.md explicitly sets UPDATE_BASELINES: true
- Animations must be smooth — no flashing, no layout shift, no jank
- Test all responsive breakpoints: 320px, 375px, 414px, 768px, 1024px
- WCAG AAA contrast: minimum 7:1 ratio

### Content

- Never modify src/content/site.ts without explicit instruction
- Never change copy, stats values, or service descriptions without instruction
- Contact routing: fab@rmi-llc.net for all form submissions

### Data / Backend

- Never auto-correct data mismatches — always flag for human review
- Always validate inputs at API boundaries
- Never log sensitive data (passwords, tokens, PII)
- Always confirm before destructive database operations
- Never trust imported data — validate everything
- Database changes go in new migration files — never modify schema.sql directly

### Testing

- New UI components require visual regression tests
- New API endpoints require E2E tests
- Bug fixes require a test that would have caught the bug (write test first)
- Never delete or skip a test to make the suite pass

### Completion

- A task is ONLY complete when: build passes + tests pass + evidence is recorded
- Never mark a checklist item complete based on code written — only on verified output
- If verification fails, stop and report — never work around it
- Completion report must have real command output pasted in, not assumed

---

## Verification Gates

Every task must pass ALL of these before the completion report is written:

- [ ] `npm run build` — zero errors, zero warnings
- [ ] Relevant Playwright tests — zero failures
- [ ] No new TypeScript errors introduced
- [ ] Visual screenshots captured to docs/screenshots/current/
- [ ] Changelog entry written with evidence

---

## Git Conventions

- **Branch naming**: feature branches off main
- **Commit prefixes**: feat, fix, style, test, docs, chore, perf
- **Pre-commit**: run `npm run build` + `npm run test`
- **Merge**: manual merge to main only (no auto-merge)
- **Deploy**: Vercel auto-deploys from main

---

## Sub-Documents

| File                       | Contents                                          |
| -------------------------- | ------------------------------------------------- |
| docs/design-system.md      | Tailwind tokens, colors, spacing, animation rules |
| docs/architecture.md       | Full file structure, API contracts, DB schema     |
| docs/workflow.md           | Git practices, testing process, spec system       |
| docs/CURRENT_TASK.md       | Active task spec — read every session             |
| docs/NEXT_TASK.md          | Upcoming task spec                                |
| docs/CHANGELOG.md          | Append verified completions here                  |
| docs/templates/bug-fix.md  | Bug fix task template                             |
| docs/templates/feature.md  | Feature task template                             |
| docs/templates/ui-change.md       | UI change task template                    |
| docs/templates/new-component.md   | New component task template                |
| docs/templates/backend-change.md  | Backend change task template               |
| docs/screenshots/          | baseline/ and current/ visual comparison folders  |

---

## Current Project Status

> Claude Code may update the status line and date only. Never rewrite history above.

```
Priority 1 — Website Lead Generation:  COMPLETE (deployed Feb 17 2026)
Priority 2 — Social Media Hub:         IN PROGRESS
Priority 3 — Office Workflow Tools:    NOT STARTED
Priority 4 — Advanced Features:        NOT STARTED

Last updated: 2026-03-09 by Claude Code (CLAUDE.md comprehensive update)
```

---

## Workflow Summary

1. Graham generates a task spec in Claude.ai conversation
2. Hotkey writes spec to docs/CURRENT_TASK.md
3. Claude Code reads CLAUDE.md + CURRENT_TASK.md
4. Claude Code implements, verifies, screenshots, updates changelog
5. Graham reviews completion report and screenshots
6. Merge to main → Vercel auto-deploys
