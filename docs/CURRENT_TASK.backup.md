# Current Task
Type: UI Change
Priority: Medium
Complexity: Medium
UPDATE_BASELINES: true
BASELINE_COMPONENTS: Hero, About, Services, CTABanner, Footer
Created: 2026-02-23

## Objective
Visual polish pass across 5 sections based on browser audit. No content changes —
layout, interaction, and consistency fixes only.

## Files
### Modify
- src/components/landing/HeroFullWidth.tsx
- src/components/landing/About.tsx
- src/components/landing/Services.tsx
- src/components/landing/CTABanner.tsx
- src/components/landing/Footer.tsx

### Never Touch
- src/content/site.ts
- tests/screenshots/baseline/ (will be updated via UPDATE_BASELINES flag)
- Any file not listed above

---

## Fix 1 — Hero stats counter animates repeatedly on scroll
**Problem:** Stats counter re-triggers every time the hero section re-enters the
viewport. Looks broken when user scrolls down and back up.
**Fix:** Use an IntersectionObserver with a "has animated" flag. Once the counter
completes its first animation, never trigger it again regardless of scroll position.

## Fix 2 — About cards uneven height
**Problem:** The 4 "Why Choose RMI" cards have different content lengths causing
unequal card heights and a visually unbalanced row.
**Fix:** Set all cards to equal height using CSS (flexbox stretch or min-height).
Text should align to the top within each card. Cards should visually match at the
bottom edge.

## Fix 3 — CTA banner button style inconsistency
**Problem:** The "Request a Quote" button on the blue CTA banner is white/outlined
while all other CTAs across the site use solid blue. Looks like a different design
system.
**Fix:** Update the CTA banner button to match the solid blue style used in the
navbar and hero.

## Fix 4 — Services rows lack hover feedback
**Problem:** Service items only have a left blue border. No visual response when
hovering — feels static and uninteractive.
**Fix:** Add a subtle hover state — a slight background fill (e.g. slightly lighter
dark background) and/or the left border brightening. Should feel responsive without
being distracting. Match the timing of other hover effects on the page.

## Fix 5 — "Back to top" footer link undersized
**Problem:** The back to top text in the footer is small and easy to miss.
**Fix:** Increase size slightly and ensure the arrow/icon is clearly visible.
Maintain existing functionality.

---

## Acceptance Criteria

- [ ] Implemented — [ ] Verified: Stats counter animates only once per page load
- [ ] Implemented — [ ] Verified: Stats counter does NOT re-trigger on scroll back
- [ ] Implemented — [ ] Verified: All 4 About cards are equal height at 1280px
- [ ] Implemented — [ ] Verified: All 4 About cards are equal height at 768px
- [ ] Implemented — [ ] Verified: CTA banner button matches solid blue style
- [ ] Implemented — [ ] Verified: Services rows show visible hover state
- [ ] Implemented — [ ] Verified: Back to top is larger and clearly visible
- [ ] Implemented — [ ] Verified: npm run build passes (0 errors)
- [ ] Implemented — [ ] Verified: npm run test passes
- [ ] Implemented — [ ] Verified: Visual baselines updated for all 5 components

## Test Requirements
### Run
- npm run build
- npm run test
- npm run test:visual:update

### Breakpoints to verify each fix at
320px, 375px, 768px, 1280px

## Constraints
- Dark mode only — no light mode additions
- Do not modify any copy, stats values, or service labels
- Match existing animation timing for hover effects
- Fixes must not affect each other — implement and verify independently
- Do not change overall layout or section structure

## Completion Report
[Claude Code fills in after verification]