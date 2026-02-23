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

- schema.sql
- tests/visual/home.spec.ts-snapshots/
- src/content/site.ts
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
