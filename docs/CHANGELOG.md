# RMI Changelog
> Maintained by Claude Code. Append entries after each verified task completion.
> Never edit existing entries. Append only.

---

## Format

```
## [DATE] — [Task Type] — [Brief Title]
**Objective:** What was changed and why
**Files modified:** Exact list of files touched
**Build:** PASSED — [error/warning count]
**Tests:** PASSED — [X passing / 0 failing]
**Screenshots:** [Captured to docs/screenshots/current/ / Not applicable]
**Baseline update:** [yes — components: X, Y / no]
**Notes:** [none / describe anything unexpected]
```

---

## Log

## 2026-02-23 — Setup — Workflow system initialized
**Objective:** Created spec-driven development workflow, persistent context files, task templates, screenshot automation scripts, and AutoHotkey hotkeys per SETUP_SPEC.md
**Files modified:** CLAUDE.md, docs/design-system.md, docs/architecture.md, docs/workflow.md, docs/CURRENT_TASK.md, docs/CHANGELOG.md, docs/templates/ui-change.md, docs/templates/bug-fix.md, docs/templates/new-component.md, docs/templates/feature.md, docs/templates/backend-change.md, docs/screenshots/baseline/.gitkeep, docs/screenshots/current/.gitkeep, scripts/paste-task.ps1, scripts/open-task.ps1, scripts/screenshots.ps1, tests/screenshots.spec.ts, autohotkey/rmi-workflow.ahk, autohotkey/README.md
**Build:** PASSED — 0 errors, 0 warnings
**Tests:** PASSED — 32 E2E passing, 18 visual regression passing
**Screenshots:** Not applicable
**Baseline update:** no
**Notes:** Corrected all `frontend/` paths in spec to actual `src/` paths. Replaced Express/Prisma references with actual Astro API routes + @vercel/postgres. Pre-existing unit test failures in ContactForm.test.tsx (10 flaky tests) — unrelated to this change, no source code was modified.

## 2026-02-23 — UI Change — Visual polish pass (5 fixes)
**Objective:** Fix hero stats re-triggering on scroll, About card unequal heights, CTA banner button style mismatch, Services weak hover feedback, and undersized back-to-top link
**Files modified:** src/components/landing/HeroFullWidth.tsx, src/components/landing/About.tsx, src/components/landing/CTABanner.tsx, src/components/landing/Services.tsx, src/components/landing/Footer.tsx
**Build:** PASSED — 0 errors, 0 warnings
**Tests:** PASSED — 153 E2E passing, 18 visual regression passing
**Screenshots:** Not applicable
**Baseline update:** yes — components: Hero, About, Services, CTABanner, Footer (6 mobile snapshots re-generated across Chromium/Firefox/WebKit)
**Notes:** none

