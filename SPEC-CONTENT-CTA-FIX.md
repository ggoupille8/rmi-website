# SPEC: Content Fixes & CTA Banner Redesign

**Spec Version:** 1.0
**Date:** March 4, 2026
**Author:** Senior Developer Audit (Chrome Claude)
**Execution:** Claude Code autonomous — read this file, execute all tasks in order, verify each before marking complete.

---

## CONTEXT

Owner review identified content inaccuracies, missing service modal images, and a CTA banner that looks bad. This spec combines text fixes, a service modal layout improvement for services without images, and a CTA banner visual redesign. All text changes are exact — use the provided before/after strings.

**DO NOT MODIFY:** Hero section, hero slideshow, navbar, footer, analytics, contact form logic, service card grid layout, or any files not explicitly listed.

---

## TASK 1: Service Modals — Hide Image Panel When No Images Exist

### Problem
"Plan & Specification / Bid Work" and "24/7 Emergency Response" reference image files that don't exist on the server (`plan-spec-1.jpg`, `plan-spec-2.jpg`, `emergency-response-1.jpg`, `emergency-response-2.jpg`). When a user opens these modals, they see a large black panel with a broken image icon and alt text where the slideshow should be. The modal layout is a 60/40 split with the broken image taking 60% of the space.

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. In the service data array (likely in `site.ts` or inline in `Services.tsx`), find the image arrays for "Plan & Specification / Bid Work" and "24/7 Emergency Response".
2. Set their image arrays to empty: `images: []`.
3. In the modal rendering logic, check if the selected service has images (`images.length > 0`). If it has no images:
   - Do NOT render the slideshow panel (the left/top panel with `flex-1` or `md:w-[60%]`).
   - Render only the text panel (icon, title, description, CTA button) at full width.
   - The modal should display as a centered content card without the two-panel split.
4. Also remove the broken image file references from the data — delete the placeholder `plan-spec-1.jpg`, `plan-spec-2.jpg`, `emergency-response-1.jpg`, `emergency-response-2.jpg` entries from the images arrays entirely.
5. The image counter ("1 / 2") and navigation arrows should also be hidden when there are no images.

### Verification
- `npm run build` passes.
- Opening "Plan & Specification / Bid Work" shows ONLY the text content (icon, title, description, CTA) — no black panel, no broken image, no slideshow arrows, no counter.
- Opening "24/7 Emergency Response" behaves the same way.
- Opening any service WITH images (e.g., "Pipe Insulation") still shows the normal two-panel layout with slideshow.
- The service data no longer references non-existent image files.

---

## TASK 2: Text Fix — "support systems" → "pipe supports"

### Problem
The Materials Marquee section subtitle says "accessories, and support systems" — should say "accessories, and pipe supports".

### Files
- `frontend/src/content/site.ts` (or wherever the marquee subtitle text is defined)
- If not in `site.ts`, check `frontend/src/components/landing/MaterialsMarquee.tsx`

### Before
```
accessories, and support systems
```

### After
```
accessories, and pipe supports
```

### Verification
- `npm run build` passes.
- The marquee subtitle reads "Insulation, jacketing, accessories, and pipe supports".

---

## TASK 3: Text Fix — "Proven Track Record" Card

### Problem
Two text changes needed in the "Proven Track Record" about card.

### Files
- `frontend/src/content/site.ts` (or `frontend/src/components/landing/About.tsx`)

### Change 1: "on spec" → "by design"

#### Before
```
on schedule, on spec, and on budget
```

#### After
```
on schedule, by design, and on budget
```

### Change 2: "General contractors and facility managers" → "Contractors and facility managers"

#### Before
```
General contractors and facility managers choose RMI
```

#### After
```
Contractors and facility managers choose RMI
```

### Verification
- `npm run build` passes.
- The Proven Track Record card reads: "...Contractors and facility managers choose RMI because we deliver on schedule, by design, and on budget."

---

## TASK 4: Text Fix — Henry Ford Project Description

### Problem
"pipe support fabrication across" should say "pipe supports across".

### Files
- `frontend/src/content/site.ts` (or `frontend/src/components/landing/ProjectShowcase.tsx`)

### Before
```
pipe support fabrication across multiple buildings
```

### After
```
pipe supports across multiple buildings
```

### Verification
- `npm run build` passes.
- The Henry Ford Hospital project card description reads "...material supply, and pipe supports across multiple buildings."

---

## TASK 5: Content Addition — "Union-Trained Workforce" Card

### Problem
The "Union-Trained Workforce" about card needs one more sentence of content.

### Files
- `frontend/src/content/site.ts` (or `frontend/src/components/landing/About.tsx`)

### Current text
```
Proud to employ Local 25 insulators — OSHA 10/30-hour certified, CPR and first aid trained, and backed by years of hands-on field experience in commercial and industrial environments.
```

### New text (add one sentence at the end)
```
Proud to employ Local 25 insulators — OSHA 10/30-hour certified, CPR and first aid trained, and backed by years of hands-on field experience in commercial and industrial environments. Every crew member brings the skill and professionalism that comes from rigorous union apprenticeship training.
```

### Verification
- `npm run build` passes.
- The Union-Trained Workforce card shows the additional sentence.

---

## TASK 6: CTA Banner — Visual Redesign

### Problem
The CTA banner ("READY TO START YOUR INSULATION PROJECT?") uses a shared background image (`cta-project.jpeg`) that's a dark, cluttered industrial photo. With the `bg-black/70` overlay it looks muddy and unprofessional — Graham described it as "atrocious". The image competes with the text instead of supporting it.

The CTA banner and Contact form share the same background image via a wrapper div. The fix should improve the CTA banner's visual while preserving the Contact form's background (which works better because the form's white input fields provide contrast).

### Files
- `frontend/src/pages/index.astro` (the wrapper div with the shared bg image)
- `frontend/src/components/landing/CTABanner.tsx`

### Approach
**Option A (recommended): Remove the background image from the CTA banner and use a solid gradient instead.**

1. Separate the CTA banner from the shared background image wrapper. Currently, both `#cta-banner` and `#contact` sit inside a single wrapper div that has the background image. Split this so:
   - The CTA banner sits OUTSIDE the background image wrapper (or has its own styling).
   - The Contact form remains inside the background image wrapper.

2. Give the CTA banner a clean gradient background instead:
   ```
   bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900
   ```
   This creates a subtle dark gradient that matches the site's dark theme without the messy photo.

3. Add a thin blue accent line at the top of the CTA banner for visual separation from the Projects section above:
   ```
   border-t border-blue-500/30
   ```

4. Keep the CTA banner content (heading, subtext, button) exactly as-is. Keep the `min-h-[350px] md:min-h-[400px]` sizing.

5. The Contact form section should retain the current background image and overlay — only the CTA banner changes.

### Verification
- `npm run build` passes.
- The CTA banner section has a clean gradient background (no photo).
- The CTA banner text is clearly readable against the gradient.
- The Contact form section still has the project photo background with overlay.
- The transition between CTA banner and Contact form looks natural.

---

## EXECUTION ORDER

1. **Task 2** (marquee text fix) — single string change
2. **Task 3** (Proven Track Record text fixes) — two string changes
3. **Task 4** (Henry Ford text fix) — single string change
4. **Task 5** (Union-Trained sentence addition) — content addition
5. **Task 1** (service modal no-image layout) — component logic change
6. **Task 6** (CTA banner redesign) — layout/styling change

---

## GIT WORKFLOW

1. Ensure you're on `main` and up to date: `git checkout main && git pull origin main`
2. Create feature branch: `git checkout -b fix/content-cta-redesign`
3. Make all changes
4. Run `npm run build` — must pass with zero errors
5. Run tests: `npm run test` or `npx playwright test`
6. Update visual baselines if needed: `npm run test:visual:update`
7. Commit: `git add . && git commit -m "fix: content corrections, no-image modal layout, CTA banner gradient redesign"`
8. Push the branch: `git push origin fix/content-cta-redesign`
9. **Do NOT merge to main.** Leave for Graham to review.

---

## DEFINITION OF DONE

- [ ] "Plan & Spec" modal shows text-only layout (no image panel, no broken image, no arrows, no counter)
- [ ] "24/7 Emergency Response" modal shows text-only layout (same as above)
- [ ] All other service modals still show normal two-panel layout with images
- [ ] Marquee subtitle says "accessories, and pipe supports"
- [ ] Proven Track Record says "by design" not "on spec"
- [ ] Proven Track Record says "Contractors and facility managers" not "General contractors and facility managers"
- [ ] Henry Ford description says "pipe supports across" not "pipe support fabrication across"
- [ ] Union-Trained card has the additional sentence about apprenticeship training
- [ ] CTA banner has gradient background (no photo)
- [ ] Contact form still has photo background
- [ ] `npm run build` passes with zero errors
- [ ] Feature branch created, committed, pushed, NOT merged to main
- [ ] Summary written to `tasks/todo.md`
