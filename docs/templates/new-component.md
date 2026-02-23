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
**Location:** src/components/landing/
**Type:** [Astro component / React island]
**Use React island if:** component requires interactivity or animation

**Props:**

- [propName]: [type] — [description]

**States:**

- Default: [describe]
- Hover: [describe]
- Mobile: [describe]
- [other states]

**Content source:** src/content/site.ts (add new content there)

---

## Files

### Create

- src/components/landing/[ComponentName].tsx
- tests/visual/[component-name].spec.ts

### Modify

- src/pages/index.astro (add component to page)
- src/content/site.ts (add content if needed)

### Never Touch

- schema.sql
- tests/visual/home.spec.ts-snapshots/
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
- Dark theme only
- Use Tailwind classes only — no inline styles
- Content in site.ts, not hardcoded in component
- [Add task-specific constraints]

---

## Completion Report

[Claude Code fills in after verification]
