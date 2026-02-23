# RMI Workflow System — Setup Spec

> **Claude Code Instructions:** Read this entire file before touching anything.
> Work autonomously until every checklist item is complete and verified.
> Do not mark anything complete without evidence. Update CHANGELOG.md when done.

---

## Objective

Build a complete spec-driven development workflow for the RMI project. This includes:

- Persistent context files Claude Code reads automatically every session
- Session-based task spec system with verification gates
- Screenshot automation for visual regression review
- AutoHotkey + PowerShell tooling for zero-friction spec delivery
- Spec templates for every task type

Work through every section in order. Do not skip ahead.

---

## Phase 1 — Audit Before Building

Before creating any files, run these commands and record the output. Use the real output to populate accurate values in the files you create. Never assume — always verify.

```powershell
# From project root: C:\Users\Graham Goupille\astro-project

# 1. Confirm project structure
Get-ChildItem -Depth 2

# 2. Confirm existing scripts
Get-ChildItem scripts\

# 3. Confirm frontend component paths
Get-ChildItem frontend\src\components\landing\

# 4. Confirm test structure
Get-ChildItem frontend\tests\

# 5. Confirm package.json scripts
Get-Content package.json | Select-String "scripts" -Context 0,20

# 6. Confirm Tailwind config exists
Test-Path frontend\tailwind.config.mjs

# 7. Check if docs\ folder already exists
Test-Path docs\
```

Record all output. Use real paths in everything you create below.

---

## Phase 2 — Create Folder Structure

```
docs/
├── templates/
│   ├── ui-change.md
│   ├── new-component.md
│   ├── bug-fix.md
│   ├── feature.md
│   └── backend-change.md
├── screenshots/
│   ├── baseline/
│   │   └── .gitkeep
│   └── current/
│       └── .gitkeep
├── design-system.md
├── architecture.md
├── workflow.md
├── CURRENT_TASK.md
└── CHANGELOG.md

scripts/
├── ports-free.ps1         (already exists — do not modify)
├── paste-task.ps1         (create new)
├── screenshots.ps1        (create new)
└── open-task.ps1          (create new)

CLAUDE.md                  (create at project root)
autohotkey/
└── rmi-workflow.ahk       (create new)
```

Create all folders and files. Use `New-Item -Force` to avoid errors if any already exist.

---

## Phase 3 — Create CLAUDE.md

Create at project root: `CLAUDE.md`

```markdown
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
| Styling    | Tailwind CSS (dark mode only)        |
| Testing    | Playwright (E2E + visual regression) |
| Backend    | Express + Node.js 20                 |
| ORM        | Prisma                               |
| Database   | PostgreSQL                           |
| Deployment | Vercel (auto-deploy from main)       |

---

## Critical File Map
```

frontend/src/content/site.ts — All text content (manual edits only)
frontend/src/layouts/BaseLayout.astro — SEO meta tags, JSON-LD schema
frontend/src/pages/index.astro — Landing page
frontend/src/pages/api/contact.ts — Contact form API endpoint
frontend/src/components/landing/Navbar.astro — Fixed header, mobile menu
frontend/src/components/landing/HeroFullWidth.tsx — Hero + animated stats
frontend/src/components/landing/Services.tsx — 9 service cards
frontend/src/components/landing/About.tsx — Why Choose RMI section
frontend/src/components/landing/ContactForm.tsx — Quote request form
frontend/src/components/landing/Footer.tsx — Footer + back to top
backend/prisma/schema.prisma — Database schema
backend/src/index.ts — Express server + API routes
frontend/tailwind.config.mjs — Design tokens (source of truth)

````

---

## Commands

```powershell
npm run dev:all                          # Start frontend + backend
npm run build                            # Production build (run before every commit)
npm run test                             # Full Playwright test suite
npm run test:visual:update               # Update visual regression baselines
npx playwright test [file]               # Run specific test file
powershell scripts/ports-free.ps1        # Free stuck ports 4321 + 5001
cd backend && npx prisma studio          # Database browser
cd backend && npx prisma migrate dev     # Run migrations
````

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

- Dark mode ONLY — never add light mode code under any circumstances
- All interactive touch targets minimum 44x44px (WCAG AAA)
- Never modify visual regression baselines unless CURRENT_TASK.md explicitly sets UPDATE_BASELINES: true
- Animations must be smooth — no flashing, no layout shift, no jank
- Test all responsive breakpoints: 320px, 375px, 414px, 768px, 1024px

### Content

- Never modify frontend/src/content/site.ts without explicit instruction
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

Last updated: [DATE] by Claude Code
```

---

## Workflow Summary

1. Graham generates a task spec in Claude.ai conversation
2. Hotkey writes spec to docs/CURRENT_TASK.md
3. Claude Code reads CLAUDE.md + CURRENT_TASK.md
4. Claude Code implements, verifies, screenshots, updates changelog
5. Graham reviews completion report and screenshots
6. Merge to main → Vercel auto-deploys

````

---

## Phase 4 — Create docs/design-system.md

**Before creating this file:** Read `frontend/tailwind.config.mjs` and extract the real values. Populate every field below with actual values from the config. Do not use placeholder values.

Create `docs/design-system.md`:

```markdown
# RMI Design System

> Source of truth: frontend/tailwind.config.mjs
> Dark mode only. WCAG AAA compliance required on all components.

---

## Color Palette
[Extract from tailwind.config.mjs — populate all custom colors with hex values]

## Typography
[Extract font families, sizes, weights, line heights from config]

## Spacing Scale
[Extract custom spacing values if any]

## Animation & Transitions
[Extract custom animations, keyframes, duration values]
Standard: [extract value] ease-in-out
Never use: instant transitions, opacity flash, layout-shifting animations

## Breakpoints
320px  — Mobile small
375px  — Mobile standard
414px  — Mobile large
768px  — Tablet
1024px — Desktop small
1280px — Desktop standard

## Component Patterns

### Cards
[Extract from existing About.tsx and Services.tsx — document padding, border-radius, hover effects]

### Buttons / CTAs
[Extract from existing CTABanner.tsx and contact form — document variants]

### Forms
[Extract from ContactForm.tsx — document input styles, validation states]

### Navigation
[Extract from Navbar.astro — document states: default, scrolled, mobile open]

## Animation Rules
- Stats counters: reserve space before animation starts (prevent CLS)
- Marquee: continuous scroll, pause on hover
- Page transitions: none (Astro MPA)
- Hover effects: [extract timing from existing components]

## Accessibility Standards
- Minimum contrast ratio: 7:1 (WCAG AAA)
- Focus indicators: visible on all interactive elements
- Touch targets: 44x44px minimum
- Screen reader: all images have alt text, all forms have labels
````

---

## Phase 5 — Create docs/architecture.md

**Before creating this file:** Run the audit commands from Phase 1 and use real output.

Create `docs/architecture.md`:

```markdown
# RMI Architecture

---

## Repository Structure

[Paste real output from Get-ChildItem -Depth 2 here]

## Frontend Architecture

### Astro Islands Pattern

Static by default. React islands ONLY for:

- HeroFullWidth.tsx (animated stats counter)
- ContactForm.tsx (form validation + submission)
- FloatingMobileCTA.tsx (mobile phone button)
- MaterialsMarquee.tsx (scroll animation)

### Page Structure

Single page application: frontend/src/pages/index.astro
Section order: Navbar → Hero → Services → About → Marquee → CTA → Contact → Footer

### API Routes (Astro)

frontend/src/pages/api/contact.ts — POST /api/contact

- Input validation
- Honeypot protection
- PostgreSQL storage via backend

## Backend Architecture

### Express Server

Port: 5001
Health check: GET /healthz → 200 OK

### API Endpoints

POST /api/contact — Contact form submission → PostgreSQL
GET /api/admin/contacts — View all submissions (no auth currently)

### Database Schema

[Read backend/prisma/schema.prisma and paste real schema here]

## Environment Variables

### Required for Production

DATABASE_URL — PostgreSQL connection string
POSTGRES_URL — Alias for database connection
SENDGRID_API_KEY — Email notifications (quota exceeded, non-critical)
SMTP_FROM — noreply@rmi-llc.net
SMTP_TO — fab@rmi-llc.net

### Contact Routing

Material sales inquiries → fab@rmi-llc.net
Pipe support inquiries → fab@rmi-llc.net
General contact form → fab@rmi-llc.net
Admin / interim → ggoupille8@gmail.com

## Deployment

Platform: Vercel
Trigger: Push to main branch → auto-deploy
Build command: npm run build (Astro static generation)
Production URL: https://resourcemechanicalinsulation.com
Legacy redirect: https://rmi-llc.net → production

## Known Issues (Non-Critical)

- SendGrid free tier quota exceeded — submissions save to DB, no email notification
- Unused components: ValueProps.tsx, StatsBar.tsx (safe to delete)
```

---

## Phase 6 — Create docs/workflow.md

Create `docs/workflow.md`:

```markdown
# RMI Development Workflow

---

## Spec-Driven Development

Every task starts with a spec. No exceptions.

### Flow

1. Describe the change to Claude.ai in plain English
2. Claude.ai generates a filled CURRENT_TASK.md spec
3. Copy the spec output
4. Press hotkey (Win+T) → writes clipboard to docs/CURRENT_TASK.md
5. Open Claude Code → it reads CLAUDE.md + CURRENT_TASK.md automatically
6. Claude Code works until every checklist item is verified complete
7. Review completion report and screenshots
8. Merge to main

### Hotkeys

Win+T — Paste clipboard to docs/CURRENT_TASK.md
Win+O — Open docs/CURRENT_TASK.md in Notepad++
Win+S — Run screenshot capture script

---

## Git Practices
```

# Feature branch workflow

git checkout -b feat/description-of-change

# ... implement and test ...

git add .
git commit -m "feat: description of what changed and why"
git checkout main
git merge feat/description-of-change
git push origin main

````

### Commit Message Prefixes
feat:     New feature or enhancement
fix:      Bug fix
style:    Visual/CSS changes only
test:     Test additions or changes
docs:     Documentation only
chore:    Cleanup, dependency updates, file moves

### Rules
- Never commit directly to main without testing
- Never commit with failing build or tests
- Commit messages must be descriptive enough to understand without reading the diff
- One logical change per commit

---

## Testing Protocol

### Before Every Commit
1. `npm run build` — must pass with zero errors
2. `npm run test` — must pass with zero failures
3. Visual screenshots captured if UI changed
4. Contact form tested if backend changed

### After UI Changes
1. Run `npm run test:visual:update` to update baselines
2. Review baseline changes — confirm they match intent
3. Commit baseline updates separately with message `test: update visual baselines for [component]`

### Breakpoints to Verify
320px, 375px, 414px (mobile) — 768px (tablet) — 1024px, 1280px (desktop)
Test both portrait and landscape on mobile sizes.

---

## Screenshot Workflow

### Automated (Claude Code runs this)
```powershell
powershell scripts/screenshots.ps1
````

Captures: all breakpoints × all changed components
Saves to: docs/screenshots/current/
Compares against: docs/screenshots/baseline/

### Baseline Updates

Only update baselines when CURRENT_TASK.md contains:
UPDATE_BASELINES: true
BASELINE_COMPONENTS: [list of specific components]

Never update all baselines at once. Always component-specific.

### Human Review

Press Win+S to capture screenshots, then drag from docs/screenshots/current/ into Claude.ai for visual analysis.

---

## Spec Template Usage

When starting a new task, tell Claude.ai:
"Generate a CURRENT_TASK.md spec for: [plain English description]"

Claude.ai will use the appropriate template from docs/templates/ and output
a filled spec ready to paste. Use Win+T to write it to the file.

---

## CHANGELOG Format

Each entry written by Claude Code after task completion:

```
## [DATE] — [Task Type] — [Brief Title]
**Objective:** What was changed
**Files modified:** Exact list
**Build:** PASSED — [0 errors, 0 warnings]
**Tests:** PASSED — [X/X passing]
**Screenshots:** Captured to docs/screenshots/current/
**Notes:** Anything unexpected encountered
```

````

---

## Phase 7 — Create CURRENT_TASK.md Template

Create `docs/CURRENT_TASK.md` with the empty template:

```markdown
# Current Task
> This file is overwritten at the start of every session.
> Claude Code: Read CLAUDE.md first, then this file. Do not start until both are read.

---

## Task Header
Type:                [UI Change / Bug Fix / New Feature / Backend / New Component]
Priority:            [High / Medium / Low]
Complexity:          [Simple / Medium / Complex]
UPDATE_BASELINES:    false
BASELINE_COMPONENTS: none
Created:             [DATE]

---

## Objective
[Plain English description of what is changing and why. One paragraph.]

---

## Files

### Modify
-

### Create
-

### Delete
-

### Never Touch
- backend/prisma/schema.prisma (unless explicitly listed above)
- tests/screenshots/ (visual baselines — never modify directly)
- frontend/src/content/site.ts (content is manual only)
- Any file not listed in Modify/Create/Delete above

---

## Acceptance Criteria
Each item requires both boxes checked with evidence before task is complete.

- [ ] Implemented  — [ ] Verified:

- [ ] Implemented  — [ ] Verified:

- [ ] Implemented  — [ ] Verified:

- [ ] Implemented  — [ ] Verified: npm run build passes (0 errors)

- [ ] Implemented  — [ ] Verified: All relevant Playwright tests pass

---

## Test Requirements

### Run
- npm run build
- npm run test

### Write New Tests If
- New component created
- New user interaction added
- Bug fix with no existing test coverage (write test first, then fix)

---

## Constraints
[Task-specific guardrails. E.g. "Do not change hero copy", "Match existing 300ms timing"]

-

---

## Completion Report
> Claude Code fills this in AFTER verification. Never before.

Status: [ ] Complete — [ ] Incomplete (blocked)

**Build output:**
[paste npm run build result]

**Test output:**
[paste npm run test result]

**Screenshots captured:** [ ] Yes — [ ] No (not applicable)

**Files actually modified:**
-

**Unexpected issues:**
[none / describe]

**Changelog entry written:** [ ]
````

---

## Phase 8 — Create Spec Templates

### 8a. Create docs/templates/ui-change.md

```markdown
# Template: UI Change

> Copy this to docs/CURRENT_TASK.md. Fill in all [BRACKETS]. Remove unused sections.

---

## Task Header

Type: UI Change
Priority: [High / Medium / Low]
Complexity: [Simple / Medium / Complex]
UPDATE_BASELINES: [true / false]
BASELINE_COMPONENTS: [list components if UPDATE_BASELINES is true]
Created: [DATE]

---

## Objective

[What visual change is being made. Include: which component, what the problem is,
what the correct behavior should be, which devices/browsers are affected.]

---

## Files

### Modify

- frontend/src/components/landing/[ComponentName].tsx
- [additional files]

### Create

- [none unless new file needed]

### Delete

- [none unless cleanup]

### Never Touch

- backend/prisma/schema.prisma
- tests/screenshots/
- frontend/src/content/site.ts
- Any file not listed above

---

## Acceptance Criteria

- [ ] Implemented — [ ] Verified: [Specific visual behavior at mobile 375px]
- [ ] Implemented — [ ] Verified: [Specific visual behavior at desktop 1280px]
- [ ] Implemented — [ ] Verified: No layout shift (CLS = 0)
- [ ] Implemented — [ ] Verified: Animation smooth, no flash or jank
- [ ] Implemented — [ ] Verified: WCAG AAA contrast maintained
- [ ] Implemented — [ ] Verified: npm run build passes
- [ ] Implemented — [ ] Verified: Visual regression tests pass (or baselines updated per above)

---

## Test Requirements

### Run

- npm run build
- npx playwright test tests/mobile-audit.spec.ts
- npx playwright test tests/visual/ (relevant spec)
- powershell scripts/screenshots.ps1

### Breakpoints to Verify

320px, 375px, 414px, 768px, 1024px, 1280px
Portrait AND landscape for mobile sizes.

---

## Constraints

- Dark mode only — no light mode additions
- Match existing animation timing unless explicitly changing it
- Do not modify copy, stats, or service content
- Touch targets remain 44x44px minimum
- [Add task-specific constraints]

---

## Completion Report

[Claude Code fills in after verification]
```

### 8b. Create docs/templates/bug-fix.md

```markdown
# Template: Bug Fix

> Copy to docs/CURRENT_TASK.md. Fill in all [BRACKETS].

---

## Task Header

Type: Bug Fix
Priority: [High / Medium / Low]
Complexity: [Simple / Medium / Complex]
UPDATE_BASELINES: false
BASELINE_COMPONENTS: none
Created: [DATE]

---

## Bug Report

**Symptom:** [What the user sees / experiences]
**Expected behavior:** [What should happen]
**Affected:** [Browsers, devices, viewport sizes]
**Reproduction steps:**

1.
2.
3.

---

## Files

### Modify

- [files to fix]

### Never Touch

- backend/prisma/schema.prisma
- tests/screenshots/
- frontend/src/content/site.ts
- Any file not listed above

---

## Test First

> Write a failing test that reproduces the bug BEFORE fixing it.
> The fix is only valid when this test passes.

Test file to create/modify: [path]
Test description: [what the test should verify]

---

## Acceptance Criteria

- [ ] Implemented — [ ] Verified: Failing test written and confirmed failing
- [ ] Implemented — [ ] Verified: Bug is fixed — test now passes
- [ ] Implemented — [ ] Verified: Regression — existing tests still pass
- [ ] Implemented — [ ] Verified: Fix verified on affected browsers/devices
- [ ] Implemented — [ ] Verified: npm run build passes

---

## Constraints

- Fix the specific bug — do not refactor surrounding code
- Do not change behavior of anything not mentioned in this spec
- [Add any specific constraints]

---

## Completion Report

[Claude Code fills in after verification]
```

### 8c. Create docs/templates/new-component.md

```markdown
# Template: New Component

> Copy to docs/CURRENT_TASK.md. Fill in all [BRACKETS].

---

## Task Header

Type: New Component
Priority: [High / Medium / Low]
Complexity: [Simple / Medium / Complex]
UPDATE_BASELINES: true
BASELINE_COMPONENTS: [ComponentName]
Created: [DATE]

---

## Objective

[What this component does, where it appears on the page, what problem it solves.]

---

## Component Specification

**Name:** [ComponentName].tsx
**Location:** frontend/src/components/landing/
**Type:** [Astro component / React island]
**Use React island if:** component requires interactivity or animation

**Props:**

- [propName]: [type] — [description]

**States:**

- Default: [describe]
- Hover: [describe]
- Mobile: [describe]
- [other states]

**Content source:** frontend/src/content/site.ts (add new content there)

---

## Files

### Create

- frontend/src/components/landing/[ComponentName].tsx
- tests/visual/[component-name].spec.ts

### Modify

- frontend/src/pages/index.astro (add component to page)
- frontend/src/content/site.ts (add content if needed)

### Never Touch

- backend/prisma/schema.prisma
- tests/screenshots/
- Other existing components (unless integration requires it)

---

## Acceptance Criteria

- [ ] Implemented — [ ] Verified: Component renders correctly at all breakpoints
- [ ] Implemented — [ ] Verified: Matches design system (colors, spacing, typography)
- [ ] Implemented — [ ] Verified: WCAG AAA compliant (contrast, touch targets, alt text)
- [ ] Implemented — [ ] Verified: Keyboard navigable
- [ ] Implemented — [ ] Verified: Visual regression test created and passing
- [ ] Implemented — [ ] Verified: npm run build passes
- [ ] Implemented — [ ] Verified: No TypeScript errors

---

## Test Requirements

### Run

- npm run build
- npx playwright test tests/visual/[component-name].spec.ts
- npx playwright test tests/mobile-audit.spec.ts
- powershell scripts/screenshots.ps1

---

## Constraints

- Follow existing component patterns (see About.tsx or Services.tsx as reference)
- Dark mode only
- Use Tailwind classes only — no inline styles
- Content in site.ts, not hardcoded in component
- [Add task-specific constraints]

---

## Completion Report

[Claude Code fills in after verification]
```

### 8d. Create docs/templates/feature.md

```markdown
# Template: New Feature

> Copy to docs/CURRENT_TASK.md. Fill in all [BRACKETS].

---

## Task Header

Type: New Feature
Priority: [High / Medium / Low]
Complexity: [Simple / Medium / Complex]
UPDATE_BASELINES: [true / false]
BASELINE_COMPONENTS: [list if true]
Created: [DATE]

---

## Objective

[What this feature does, who uses it, what problem it solves. 1-2 paragraphs.]

---

## User Story

As a [user type], I want to [action] so that [outcome].

---

## Scope

**In scope:**

- [what will be built]

**Out of scope:**

- [what will NOT be built in this task]

---

## Files

### Create

-

### Modify

-

### Never Touch

- backend/prisma/schema.prisma (unless schema change is in scope above)
- tests/screenshots/
- frontend/src/content/site.ts (unless content change is in scope)

---

## Acceptance Criteria

- [ ] Implemented — [ ] Verified: [Core feature works end-to-end]
- [ ] Implemented — [ ] Verified: [Error states handled gracefully]
- [ ] Implemented — [ ] Verified: [Mobile layout correct]
- [ ] Implemented — [ ] Verified: [Accessibility requirements met]
- [ ] Implemented — [ ] Verified: npm run build passes
- [ ] Implemented — [ ] Verified: E2E test written and passing

---

## Test Requirements

### Run

- npm run build
- npm run test

### Write

- E2E test covering the happy path
- E2E test covering the main error state
- Visual regression test if UI is involved

---

## Constraints

- Build the simplest working version first
- No scope creep — implement only what is listed above
- [Add task-specific constraints]

---

## Completion Report

[Claude Code fills in after verification]
```

### 8e. Create docs/templates/backend-change.md

````markdown
# Template: Backend Change

> Copy to docs/CURRENT_TASK.md. Fill in all [BRACKETS].

---

## Task Header

Type: Backend Change
Priority: [High / Medium / Low]
Complexity: [Simple / Medium / Complex]
UPDATE_BASELINES: false
BASELINE_COMPONENTS: none
Created: [DATE]

---

## Objective

[What is changing in the backend. API endpoint, database schema, business logic.]

---

## Change Type

- [ ] New API endpoint
- [ ] Modify existing endpoint
- [ ] Database schema change (requires migration)
- [ ] Business logic change
- [ ] Dependency update

---

## Files

### Modify

- backend/src/index.ts
- [other backend files]

### Schema Changes (if applicable)

> If schema changes, list the exact change and migration name.
> Migration name: [descriptive-name]
> Change: [add column X to table Y / create table Z / etc]

### Never Touch

- frontend/src/ (backend task — no frontend changes)
- tests/screenshots/
- Any file not listed above

---

## API Specification (if new/modified endpoint)

**Method:** [GET / POST / PUT / DELETE]
**Path:** /api/[path]
**Auth required:** [yes / no]

**Request body:**

```json
{
  "field": "type"
}
```
````

**Success response (200):**

```json
{
  "field": "value"
}
```

**Error responses:**

- 400: [validation failure description]
- 500: [server error description]

---

## Data Validation Rules

- [Every input field and its validation rule]
- Never trust incoming data — validate everything
- Flag mismatches — never auto-correct

---

## Acceptance Criteria

- [ ] Implemented — [ ] Verified: Endpoint returns correct response for valid input
- [ ] Implemented — [ ] Verified: Endpoint returns correct error for invalid input
- [ ] Implemented — [ ] Verified: Input validation covers all fields
- [ ] Implemented — [ ] Verified: No sensitive data logged
- [ ] Implemented — [ ] Verified: Health check still passes: GET /healthz → 200
- [ ] Implemented — [ ] Verified: npm run build passes
- [ ] Implemented — [ ] Verified: E2E test written and passing

---

## Constraints

- Never auto-correct data mismatches — flag for human review
- Always validate at API boundary before touching database
- Never log request bodies containing user data
- [Add task-specific constraints]

---

## Completion Report

[Claude Code fills in after verification]

````

---

## Phase 9 — Create CHANGELOG.md

Create `docs/CHANGELOG.md`:

```markdown
# RMI Changelog
> Maintained by Claude Code. Append entries after each verified task completion.
> Never edit existing entries. Append only.

---

## Format

````

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

## [SETUP DATE] — Setup — Workflow system initialized
**Objective:** Created spec-driven development workflow, context files, templates, scripts, and AutoHotkey hotkeys
**Files modified:** CLAUDE.md, docs/*, autohotkey/rmi-workflow.ahk, scripts/paste-task.ps1, scripts/screenshots.ps1, scripts/open-task.ps1
**Build:** PASSED
**Tests:** PASSED
**Screenshots:** Not applicable
**Baseline update:** no
**Notes:** [add any issues encountered during setup]
```

---

## Phase 10 — Create PowerShell Scripts

### 10a. Create scripts/paste-task.ps1

```powershell
# paste-task.ps1
# Writes clipboard content to docs/CURRENT_TASK.md
# Usage: powershell scripts/paste-task.ps1
# Hotkey: Win+T (configured in autohotkey/rmi-workflow.ahk)

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetFile = Join-Path $projectRoot "docs\CURRENT_TASK.md"

$clipboardContent = Get-Clipboard -Raw

if ([string]::IsNullOrWhiteSpace($clipboardContent)) {
    Write-Host "ERROR: Clipboard is empty. Copy the spec from Claude.ai first." -ForegroundColor Red
    exit 1
}

# Backup existing task before overwriting
$backupFile = Join-Path $projectRoot "docs\CURRENT_TASK.backup.md"
if (Test-Path $targetFile) {
    Copy-Item $targetFile $backupFile -Force
    Write-Host "Backed up previous task to docs/CURRENT_TASK.backup.md" -ForegroundColor Yellow
}

$clipboardContent | Out-File $targetFile -Encoding UTF8 -NoNewline

Write-Host "SUCCESS: docs/CURRENT_TASK.md updated" -ForegroundColor Green
Write-Host "Lines written: $($clipboardContent.Split("`n").Count)" -ForegroundColor Cyan
Write-Host "Claude Code prompt: 'Read docs/CURRENT_TASK.md and implement everything in it. Work until complete.'" -ForegroundColor Cyan
```

### 10b. Create scripts/open-task.ps1

```powershell
# open-task.ps1
# Opens docs/CURRENT_TASK.md in Notepad++
# Usage: powershell scripts/open-task.ps1
# Hotkey: Win+O (configured in autohotkey/rmi-workflow.ahk)

$projectRoot = Split-Path -Parent $PSScriptRoot
$targetFile = Join-Path $projectRoot "docs\CURRENT_TASK.md"

$notepadPlusPlusPath = "C:\Program Files\Notepad++\notepad++.exe"
$notepadPlusPlusPathX86 = "C:\Program Files (x86)\Notepad++\notepad++.exe"

if (Test-Path $notepadPlusPlusPath) {
    Start-Process $notepadPlusPlusPath $targetFile
} elseif (Test-Path $notepadPlusPlusPathX86) {
    Start-Process $notepadPlusPlusPathX86 $targetFile
} else {
    # Fall back to default app
    Write-Host "Notepad++ not found — opening with default app" -ForegroundColor Yellow
    Start-Process $targetFile
}
```

### 10c. Create scripts/screenshots.ps1

```powershell
# screenshots.ps1
# Captures screenshots at all breakpoints for visual review
# Usage: powershell scripts/screenshots.ps1
# Hotkey: Win+S (configured in autohotkey/rmi-workflow.ahk)
# Output: docs/screenshots/current/

$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot "docs\screenshots\current"

# Clear current screenshots
if (Test-Path $outputDir) {
    Remove-Item "$outputDir\*" -Force -Recurse
}
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Write-Host "Capturing screenshots at all breakpoints..." -ForegroundColor Cyan

# Run Playwright screenshot script
$env:SCREENSHOT_OUTPUT = $outputDir
npx playwright test tests/screenshots.spec.ts --reporter=list 2>&1

if ($LASTEXITCODE -eq 0) {
    $count = (Get-ChildItem $outputDir -Filter "*.png").Count
    Write-Host "SUCCESS: $count screenshots saved to docs/screenshots/current/" -ForegroundColor Green
    Write-Host "Open folder to review or drag into Claude.ai for analysis" -ForegroundColor Cyan
    # Open the folder in Explorer for easy drag-to-Claude
    Start-Process explorer.exe $outputDir
} else {
    Write-Host "WARNING: Screenshot capture had errors. Check Playwright output above." -ForegroundColor Yellow
}
```

---

## Phase 11 — Create Playwright Screenshot Spec

Create `frontend/tests/screenshots.spec.ts`:

```typescript
import { test } from "@playwright/test";
import path from "path";
import fs from "fs";

const breakpoints = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile-414", width: 414, height: 736 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

const sections = [
  { name: "navbar", selector: "nav" },
  { name: "hero", selector: "#hero, section:first-of-type" },
  { name: "services", selector: "#services" },
  { name: "about", selector: "#about" },
  { name: "marquee", selector: "#materials, .marquee" },
  { name: "cta", selector: "#cta" },
  { name: "contact", selector: "#contact" },
  { name: "footer", selector: "footer" },
];

const outputDir = process.env.SCREENSHOT_OUTPUT || "docs/screenshots/current";

test.beforeAll(() => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
});

for (const bp of breakpoints) {
  test(`full-page ${bp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.goto("http://localhost:4321");
    await page.waitForLoadState("networkidle");
    // Wait for animations to settle
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(outputDir, `full-page-${bp.name}.png`),
      fullPage: true,
    });
  });

  for (const section of sections) {
    test(`${section.name} ${bp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto("http://localhost:4321");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      const el = page.locator(section.selector).first();
      const exists = await el.count();
      if (exists > 0) {
        await el.screenshot({
          path: path.join(outputDir, `${section.name}-${bp.name}.png`),
        });
      }
    });
  }
}
```

---

## Phase 12 — Create AutoHotkey Script

Create `autohotkey/rmi-workflow.ahk`:

```ahk
; RMI Workflow Hotkeys
; Requires AutoHotkey v2 — https://www.autohotkey.com
; To activate: double-click this file or add to Windows startup
;
; Hotkeys:
;   Win+T — Paste clipboard to docs/CURRENT_TASK.md
;   Win+O — Open docs/CURRENT_TASK.md in Notepad++
;   Win+S — Capture screenshots for visual review

#Requires AutoHotkey v2.0

; ─── Configuration ───────────────────────────────────────────────
; Update this path if your project is in a different location
ProjectRoot := "C:\Users\Graham Goupille\astro-project"
; ─────────────────────────────────────────────────────────────────

; Win+T — Paste clipboard to CURRENT_TASK.md
#t:: {
    script := ProjectRoot . "\scripts\paste-task.ps1"
    Run('powershell.exe -ExecutionPolicy Bypass -File "' . script . '"',, "Hide")
    TrayTip("RMI Workflow", "CURRENT_TASK.md updated from clipboard", 2)
}

; Win+O — Open CURRENT_TASK.md in Notepad++
#o:: {
    script := ProjectRoot . "\scripts\open-task.ps1"
    Run('powershell.exe -ExecutionPolicy Bypass -File "' . script . '"',, "Hide")
}

; Win+S — Capture screenshots
#s:: {
    script := ProjectRoot . "\scripts\screenshots.ps1"
    Run('powershell.exe -ExecutionPolicy Bypass -File "' . script . '"',, "Hide")
    TrayTip("RMI Workflow", "Capturing screenshots...", 2)
}
```

---

## Phase 13 — Create AutoHotkey Startup Instructions

Create `autohotkey/README.md`:

```markdown
# AutoHotkey Setup

## Installation

1. Download AutoHotkey v2: https://www.autohotkey.com
2. Install with default settings
3. Double-click `autohotkey/rmi-workflow.ahk` to activate hotkeys

## Run on Windows Startup (Recommended)

1. Press Win+R, type `shell:startup`, press Enter
2. Create a shortcut to `rmi-workflow.ahk` in that folder
3. Hotkeys will activate automatically on login

## Hotkeys

| Hotkey | Action                                          |
| ------ | ----------------------------------------------- |
| Win+T  | Paste clipboard → docs/CURRENT_TASK.md          |
| Win+O  | Open CURRENT_TASK.md in Notepad++               |
| Win+S  | Capture screenshots → docs/screenshots/current/ |

## Workflow

1. Generate spec in Claude.ai conversation
2. Copy the code block
3. Press Win+T (writes to CURRENT_TASK.md)
4. Open Claude Code
5. Paste: "Read docs/CURRENT_TASK.md and implement everything in it. Work until complete."
6. When done, press Win+S to capture screenshots
7. Drag screenshots from the opened folder into Claude.ai for review
```

---

## Phase 14 — Final Verification

Run every check below. Do not mark setup complete until all pass.

```powershell
# From project root

# 1. All docs files created
Test-Path docs\CLAUDE.md                    # Should output: False (CLAUDE.md is at root)
Test-Path CLAUDE.md                         # Should output: True
Test-Path docs\design-system.md             # Should output: True
Test-Path docs\architecture.md              # Should output: True
Test-Path docs\workflow.md                  # Should output: True
Test-Path docs\CURRENT_TASK.md              # Should output: True
Test-Path docs\CHANGELOG.md                 # Should output: True

# 2. All templates created
Test-Path docs\templates\ui-change.md       # Should output: True
Test-Path docs\templates\bug-fix.md         # Should output: True
Test-Path docs\templates\new-component.md   # Should output: True
Test-Path docs\templates\feature.md         # Should output: True
Test-Path docs\templates\backend-change.md  # Should output: True

# 3. All scripts created
Test-Path scripts\paste-task.ps1            # Should output: True
Test-Path scripts\open-task.ps1             # Should output: True
Test-Path scripts\screenshots.ps1           # Should output: True

# 4. AutoHotkey files created
Test-Path autohotkey\rmi-workflow.ahk       # Should output: True
Test-Path autohotkey\README.md              # Should output: True

# 5. Screenshot test created
Test-Path frontend\tests\screenshots.spec.ts # Should output: True

# 6. Screenshot folders created
Test-Path docs\screenshots\baseline         # Should output: True
Test-Path docs\screenshots\current          # Should output: True

# 7. Build still passes
npm run build

# 8. Tests still pass
npm run test
```

All checks must output the expected result. If any fail, fix before writing changelog entry.

---

## Phase 15 — Update Changelog and Status

After all Phase 14 checks pass:

1. Append a completion entry to `docs/CHANGELOG.md` with today's date, files created, and verified build/test output
2. Update the `Current Project Status` block in `CLAUDE.md` with today's date

---

## Done

When Claude Code completes this spec, Graham will have:

- A persistent context system Claude Code reads every session
- A spec-driven workflow with verification gates
- 5 task templates covering every change type
- Screenshot automation with Explorer integration
- Win+T / Win+O / Win+S hotkeys ready to activate
- A changelog that self-maintains with evidence

**Final message to Graham:** Setup complete. Install AutoHotkey v2 from autohotkey.com and Notepad++ from notepad-plus-plus.org, then double-click `autohotkey/rmi-workflow.ahk` to activate your hotkeys. Your Claude Code prompt for every future task is: _"Read docs/CURRENT_TASK.md and implement everything in it. Work until complete."_
