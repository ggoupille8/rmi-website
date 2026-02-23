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

- src/components/landing/[ComponentName].tsx
- [additional files]

### Create

- [none unless new file needed]

### Delete

- [none unless cleanup]

### Never Touch

- schema.sql
- tests/visual/home.spec.ts-snapshots/
- src/content/site.ts
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

- Dark theme only — no light mode additions
- Match existing animation timing unless explicitly changing it
- Do not modify copy, stats, or service content
- Touch targets remain 44x44px minimum
- [Add task-specific constraints]

---

## Completion Report

[Claude Code fills in after verification]
