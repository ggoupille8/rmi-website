# SPEC: Mobile UX Polish Round 2

**Spec Version:** 1.0
**Date:** March 4, 2026
**Author:** Senior Developer Audit (Chrome Claude)
**Execution:** Claude Code autonomous — read this file, execute all tasks in order, verify each before marking complete.

---

## CONTEXT

The prior spec (SPEC-MOBILE-POLISH.md) is merged and deployed. PageSpeed scores improved to 87/100/100/100. This spec targets real-device mobile UX issues identified via DOM-level audit of responsive classes and layout behavior at the 375px (iPhone) breakpoint. All changes target mobile only — desktop layout must remain unchanged.

**DO NOT MODIFY:** Hero overlay gradient, project card content text, analytics scripts, contact form API logic, footer social icons, service modal image content, or any desktop-only styles.

---

## TASK 1: Hero CTA Button — Full Width on Mobile

### Problem
The hero CTA button has `w-full sm:w-auto`, which means it takes full width on mobile. But it sits inside a `flex flex-col sm:flex-row` container alongside the phone/email icons. On mobile (flex-col), the button stretches full-width on one line, then the icons sit centered below it. The `w-full` makes the button unnaturally wide on a phone — it stretches the entire card width rather than looking like a tappable button.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`

### Approach
1. Find the Request a Quote link in the hero: it has classes `btn-primary w-full sm:w-auto h-12 px-6`.
2. Change `w-full` to `w-auto` so the button is auto-width on ALL viewports (the inner padding `px-6` and text content determine width).
3. The `flex flex-col sm:flex-row` container already centers items — the button will be centered and naturally sized on mobile.

### Verification
- `npm run build` passes.
- Grep for the hero CTA link — confirm it has `w-auto` not `w-full`.
- The button should NOT stretch full-width on mobile.

---

## TASK 2: Service Modal — Mobile Image Height Cap

### Problem
Service modals use `flex-col md:flex-row` layout, meaning on mobile the image stacks above the text vertically. The image container has no height constraint on mobile, so it can consume 50-70% of the modal viewport, pushing the service description and CTA button below the fold. Users on phones have to scroll inside the modal to see the service name and description.

The images have `object-cover md:object-contain` — on mobile they crop to fill, on desktop they show full images. This is correct behavior, but the image container needs a height cap on mobile so the text is always visible without scrolling.

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. Find the service modal's image/slideshow container — it's the left/top panel inside the `flex-col md:flex-row` layout.
2. Add a mobile height cap to the image container: `max-h-[40vh] md:max-h-none`. This limits the image to 40% of viewport height on mobile, ensuring the service title, description, and CTA button remain visible below it.
3. Ensure the `overflow-hidden` class is on the image container so cropped images don't bleed.
4. Do NOT change the `md:flex-row` desktop layout or the `md:object-contain` behavior.

### Verification
- `npm run build` passes.
- The modal image container has `max-h-[40vh] md:max-h-none` in its class list.
- On mobile viewports, the modal shows both the image AND the service description text without requiring a scroll.

---

## TASK 3: Project Cards — Mobile Spacing & Typography

### Problem
At 375px, project cards stack single column (`grid-cols-1 sm:grid-cols-2`). Each card has a 4:3 aspect ratio image followed by a title and description. The description text is `text-sm` (14px) which is the minimum. The card title is `text-lg` (18px) which is fine. However, the description `text-gray-400` on a `bg-neutral-900` background has low contrast. Also, the gap between cards is `gap-4` (16px) which may feel tight when stacked vertically with long description text.

### Files
- `frontend/src/components/landing/ProjectShowcase.tsx`

### Approach
1. Change the project card description color from `text-gray-400` to `text-neutral-300` for better contrast on dark backgrounds. Gray-400 is `#9ca3af` which has ~4.6:1 contrast on neutral-900 — neutral-300 is `#d4d4d4` which has ~9:1 contrast.
2. Increase the mobile gap: change `gap-4` to `gap-5 sm:gap-4 lg:gap-5`. This gives more breathing room between stacked cards on mobile (20px) while keeping desktop spacing unchanged.
3. Add a small bottom margin to the description to keep it from touching the card edge: verify the text container has at least `pb-4` padding.

### Verification
- `npm run build` passes.
- Project card descriptions use `text-neutral-300` not `text-gray-400`.
- Grid gap is `gap-5 sm:gap-4 lg:gap-5`.

---

## TASK 4: About Section Cards — Mobile Grid Improvement

### Problem
The About section uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`. On mobile, all 4 cards stack vertically. Each card contains an icon, title, and multi-sentence description. The cards are quite long on mobile because of the description text, making the section feel endless when scrolling.

A simple improvement: on mobile, use a 2-column grid (`grid-cols-2`) for the About cards. Each card's content is short enough (icon + title + 2-3 sentences) to fit in half-width at 375px. This cuts the vertical height of the section roughly in half on mobile.

### Files
- `frontend/src/components/landing/About.tsx`

### Approach
1. Change the About cards grid from `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` to `grid-cols-2 lg:grid-cols-4`.
2. Since cards are now 2-wide on all screen sizes up to lg, remove the `sm:grid-cols-2` (it's redundant with `grid-cols-2`).
3. Reduce the card description font size on mobile to prevent overflow: add `text-xs sm:text-sm` to the description paragraph (currently it may be `text-sm` at all sizes, which is tight at half-width on 375px).
4. Reduce card padding on mobile to fit the narrower width: change padding to `p-3 sm:p-4 lg:p-5` if not already responsive.
5. Ensure the card title text doesn't wrap excessively at half width — if titles like "SAFETY-FIRST CULTURE" wrap to 3 lines, consider reducing the title font size on mobile.

### Verification
- `npm run build` passes.
- About grid uses `grid-cols-2 lg:grid-cols-4`.
- Cards display 2-wide on 375px viewport without text overflow or broken layouts.
- Card description text is `text-xs sm:text-sm`.

---

## TASK 5: CTA Banner — Mobile Text Size

### Problem
The CTA banner heading "READY TO START YOUR INSULATION PROJECT?" is currently `text-xl sm:text-2xl lg:text-3xl`. On mobile, at 375px this heading wraps to 2-3 lines. The supporting text below it also wraps. Combined with the background image overlay, the text can feel cramped.

### Files
- `frontend/src/components/landing/CTABanner.tsx`

### Approach
1. Verify the CTA heading and subtext have adequate mobile sizes. If the heading is larger than `text-xl` on mobile, reduce it.
2. Add `px-6 sm:px-8` to the CTA text container to give horizontal breathing room on mobile (prevents text from touching screen edges).
3. If the CTA button inside the banner doesn't have `w-full sm:w-auto`, keep it as-is — the banner CTA should match the hero CTA pattern.

### Verification
- `npm run build` passes.
- CTA text container has `px-6` minimum horizontal padding on mobile.

---

## TASK 6: Navbar Logo — Mobile Size Optimization

### Problem  
The navbar logo image uses `h-12` (48px tall) at all viewports. The navbar itself is `h-12 sm:h-14`. On mobile, a 48px logo in a 48px navbar leaves zero vertical padding, making the logo feel jammed against the edges. The company name text "Resource Mechanical Insulation" next to the logo is also `hidden sm:block` or similar — on mobile only the logo mark shows.

### Files
- `frontend/src/components/landing/Navbar.astro`

### Approach
1. Check the navbar logo sizing. If it's `h-12` at all sizes, change to `h-10 sm:h-12` to give 4px breathing room on mobile (40px logo in 48px navbar).
2. Verify the company name text next to the logo is hidden on very small screens but visible at reasonable widths. The current behavior (`hidden sm:block` or similar) is fine.
3. This is a subtle change — only 8px difference — but it prevents the logo from visually touching the top/bottom of the navbar.

### Verification
- `npm run build` passes.
- Logo has `h-10 sm:h-12` class pattern.

---

## EXECUTION ORDER

1. **Task 1** (hero CTA width) — quick, single class change
2. **Task 6** (navbar logo) — quick, single class change
3. **Task 5** (CTA banner padding) — quick, padding adjustment
4. **Task 3** (project cards) — color + spacing changes
5. **Task 4** (about cards grid) — layout change, needs careful testing
6. **Task 2** (service modal height cap) — modal change, needs careful testing

---

## GIT WORKFLOW

1. Ensure you're on `main` and up to date: `git checkout main && git pull origin main`
2. Create feature branch: `git checkout -b fix/mobile-ux-round2`
3. Make all changes
4. Run `npm run build` — must pass with zero errors
5. Run tests: `npm run test` or `npx playwright test`
6. Update visual baselines if needed: `npm run test:visual:update`
7. Commit: `git add . && git commit -m "fix: mobile UX round 2 — CTA width, modal height cap, project contrast, about grid, navbar logo"`
8. Push the branch: `git push origin fix/mobile-ux-round2`
9. **Do NOT merge to main.** Leave for Graham to review.

---

## DEFINITION OF DONE

- [ ] Hero CTA button uses `w-auto` not `w-full` on mobile
- [ ] Service modal image container has `max-h-[40vh] md:max-h-none`
- [ ] Project card descriptions use `text-neutral-300`
- [ ] Project card grid gap is responsive (`gap-5 sm:gap-4 lg:gap-5`)
- [ ] About cards grid uses `grid-cols-2 lg:grid-cols-4`
- [ ] About card descriptions use `text-xs sm:text-sm`
- [ ] CTA banner text container has minimum `px-6` padding on mobile
- [ ] Navbar logo uses `h-10 sm:h-12`
- [ ] `npm run build` passes with zero errors
- [ ] Feature branch created, committed, pushed, NOT merged to main
- [ ] Summary written to `tasks/todo.md`
