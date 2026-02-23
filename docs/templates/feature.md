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

- schema.sql (unless schema change is in scope above)
- tests/visual/home.spec.ts-snapshots/
- src/content/site.ts (unless content change is in scope)

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
