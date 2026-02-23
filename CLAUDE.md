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

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Framework  | Astro 4                              |
| UI         | React 18 (islands only)              |
| Language   | TypeScript (strict — no `any`)       |
| Styling    | Tailwind CSS (dark theme only)       |
| Testing    | Playwright (E2E + visual regression) |
| Unit Tests | Vitest                               |
| Backend    | Astro API routes (serverless)        |
| Database   | PostgreSQL via @vercel/postgres      |
| Email      | SendGrid (@sendgrid/mail)            |
| Deployment | Vercel (auto-deploy from main)       |

---

## Critical File Map
```
src/content/site.ts              — All text content (manual edits only)
src/layouts/BaseLayout.astro     — SEO meta tags, JSON-LD schema
src/pages/index.astro            — Landing page
src/pages/api/contact.ts         — Contact form API endpoint
src/pages/api/quote.ts           — Quote request API endpoint
src/pages/api/healthz.ts         — Health check endpoint
src/components/landing/Navbar.astro          — Fixed header, mobile menu
src/components/landing/HeroFullWidth.tsx     — Hero + animated stats
src/components/landing/Services.tsx          — 9 service cards with modal
src/components/landing/About.tsx             — Why Choose RMI section
src/components/landing/ContactForm.tsx       — Quote request form
src/components/landing/MaterialsMarquee.tsx  — Scrolling materials ticker
src/components/landing/CTABanner.tsx         — Call-to-action banner
src/components/landing/Footer.tsx            — Footer + back to top
src/components/landing/FloatingMobileCTA.tsx — Mobile floating contact button
schema.sql                       — Database schema (PostgreSQL)
tailwind.config.mjs              — Design tokens (source of truth)
src/styles/global.css            — CSS custom properties + keyframes
```

---

## Commands

```powershell
npm run dev                              # Start dev server (port 4321)
npm run dev:all                          # Free ports + start dev
npm run build                            # Production build (run before every commit)
npm run test                             # Unit tests + E2E tests
npm run test:visual                      # Visual regression tests
npm run test:visual:update               # Update visual regression baselines
npm run test:unit                        # Vitest unit tests only
npm run test:e2e                         # Playwright E2E (Chromium only)
npm run test:e2e:all                     # Playwright E2E (all browsers)
npx playwright test [file]               # Run specific test file
powershell scripts/ports-free.ps1        # Free stuck port 4321
powershell scripts/screenshots.ps1       # Capture screenshots at all breakpoints
npm run check-secrets                    # Scan for exposed secrets
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

## Sub-Documents

| File                  | Contents                                          |
| --------------------- | ------------------------------------------------- |
| docs/design-system.md | Tailwind tokens, colors, spacing, animation rules |
| docs/architecture.md  | Full file structure, API contracts, DB schema     |
| docs/workflow.md      | Git practices, testing process, this spec system  |
| docs/CURRENT_TASK.md  | Active task spec — read every session             |
| docs/CHANGELOG.md     | Append verified completions here                  |
| docs/templates/       | Spec templates for generating CURRENT_TASK.md     |
| docs/screenshots/     | baseline/ and current/ visual comparison folders  |

---

## Current Project Status

> Claude Code may update the status line and date only. Never rewrite history above.

```
Priority 1 — Website Lead Generation:  COMPLETE (deployed Feb 17 2026)
Priority 2 — Social Media Hub:         IN PROGRESS
Priority 3 — Office Workflow Tools:    NOT STARTED
Priority 4 — Advanced Features:        NOT STARTED

Last updated: 2026-02-23 by Claude Code (workflow system initialized)
```

---

## Workflow Summary

1. Graham generates a task spec in Claude.ai conversation
2. Hotkey writes spec to docs/CURRENT_TASK.md
3. Claude Code reads CLAUDE.md + CURRENT_TASK.md
4. Claude Code implements, verifies, screenshots, updates changelog
5. Graham reviews completion report and screenshots
6. Merge to main → Vercel auto-deploys
