# SPEC: Mobile UX Polish Round 3

**Spec Version:** 1.0
**Date:** March 4, 2026
**Author:** Senior Developer Audit (Chrome Claude)
**Execution:** Claude Code autonomous — read this file, execute all tasks in order, verify each before marking complete.

---

## CONTEXT

Rounds 1 and 2 are merged/queued. This round targets accessibility gaps, a performance issue in service modals, smooth scrolling UX, and a horizontal overflow guard that prevents sideways scrolling on real phones. These are the "invisible" issues that Lighthouse/PageSpeed don't always flag but that real users feel.

**DO NOT MODIFY:** Hero overlay gradient, hero slideshow timing, project card content text, analytics scripts, footer social icons, service card border styling, about card content text, or any desktop-only layout.

---

## TASK 1: Prevent Horizontal Overflow on Mobile

### Problem
Both `<html>` and `<body>` have `overflow-x: visible` (the browser default). The materials marquee ticker track is 8,161px wide — it's contained by its parent section's `overflow: hidden`, but if any other element bleeds even 1px beyond the viewport, the entire page becomes horizontally scrollable on real phones. This is a classic mobile bug that causes a horizontal "jiggle" or sideways scroll.

### Files
- `frontend/src/layouts/BaseLayout.astro` (global styles)

### Approach
1. In the global CSS (either in `BaseLayout.astro`'s `<style>` tag or the Tailwind base layer), add:
   ```css
   html {
     overflow-x: hidden;
   }
   ```
2. Do NOT add `overflow-x: hidden` to `body` — only `html`. Adding it to both can cause scroll position issues on iOS Safari.
3. If there's already a global styles file or a Tailwind `@layer base` block, add it there instead.

### Verification
- `npm run build` passes.
- The built HTML's `<style>` output includes `overflow-x:hidden` on the `html` element.
- No horizontal scroll is possible when the page is viewed at any width.

---

## TASK 2: Smooth Scroll for Anchor Links

### Problem
Clicking navbar links (Services, About, Projects, Contact) or footer Quick Links causes an instant jump to the target section. There's no smooth scrolling — `scroll-behavior` is `auto` (the browser default). Smooth scrolling provides better orientation on mobile especially, where a sudden jump can be disorienting.

### Files
- `frontend/src/layouts/BaseLayout.astro` (global styles)

### Approach
1. Add `scroll-behavior: smooth` to the `html` element in global CSS:
   ```css
   html {
     scroll-behavior: smooth;
   }
   ```
   This can be combined with the `overflow-x: hidden` rule from Task 1.
2. Alternatively, add the Tailwind class `scroll-smooth` to the `<html>` tag in `BaseLayout.astro`.
3. The existing `scroll-mt-14` on all target sections (`#services`, `#about`, `#projects`, `#contact`) already accounts for the fixed navbar offset, so no additional changes needed.

### Verification
- `npm run build` passes.
- The `<html>` element has `scroll-behavior: smooth` applied (either via CSS rule or Tailwind `scroll-smooth` class).
- Clicking any anchor link (`#services`, `#about`, `#projects`, `#contact`) scrolls smoothly instead of jumping.

---

## TASK 3: Service Modal Close Button — Touch Target Size

### Problem
The service modal's close button (the X in the top-right corner) is `w-9 h-9` (36×36px). WCAG requires a minimum touch target of 44×44px. The Previous/Next slideshow buttons are already 44×44px (correct), but the close button is undersized. On a phone, users may have difficulty tapping the close button.

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. Find the close button in the service modal — it has classes including `w-9 h-9`.
2. Change `w-9 h-9` to `w-11 h-11` (44×44px) to meet WCAG touch target minimum.
3. Keep the button's position (`absolute top-3 right-3 z-30`), icon styling, and hover effects unchanged.
4. If increasing the size causes the button to overlap modal content, adjust `top-3 right-3` to `top-2 right-2` to keep it within the modal boundary.

### Verification
- `npm run build` passes.
- The modal close button has `w-11 h-11` in its class list.
- The close button renders at 44×44px minimum.

---

## TASK 4: Service Modal — aria-label for Accessibility

### Problem
The service modal's dialog element (`role="dialog"`) has no `aria-label` or `aria-labelledby` attribute. Screen readers announce the modal as an unnamed dialog, which makes navigation difficult for users with assistive technology.

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. The service modal renders with a dynamic service name (e.g., "Pipe Insulation", "Duct Insulation"). Add `aria-label` to the dialog element that includes the service name.
2. The pattern should be: `aria-label={`${selectedService.title} details`}` or `aria-labelledby` pointing to the service title heading inside the modal.
3. Using `aria-labelledby` is preferred over `aria-label` when a visible heading exists. Find the `<h3>` or heading inside the modal content panel and give it an `id` (e.g., `id="modal-service-title"`), then add `aria-labelledby="modal-service-title"` to the dialog.

### Verification
- `npm run build` passes.
- The modal dialog element has either `aria-label` or `aria-labelledby` attribute.
- The attribute value dynamically reflects the selected service name.

---

## TASK 5: Service Modal — Lazy Image Loading Fix

### Problem
The service modal loads all 21 slideshow images into the DOM simultaneously. Even though they have `loading="lazy"`, the browser loads ALL of them because they're positioned with `opacity` toggling (all images are at the same absolute position, just with opacity 0 or 1). The browser sees them as in-viewport because they share the same bounding box. This means opening any service modal downloads ~21 images at once — a significant mobile data and performance hit.

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. Instead of rendering all 21 images in the DOM and toggling opacity, only render the current image and optionally preload the next/previous one. This is a conditional rendering approach:
   - Track the current slide index (already done).
   - Only render 3 `<img>` tags at most: `currentIndex - 1`, `currentIndex`, and `currentIndex + 1`. Use conditional rendering (`{index >= currentIndex - 1 && index <= currentIndex + 1 && <img ... />}`).
   - This reduces initial image loads from 21 to 3 (current + neighbors for smooth swiping).
2. Keep the transition smooth: since the neighboring images are pre-rendered, swiping left/right remains instant. When the user advances, the window shifts and the new neighbor loads.
3. Alternative simpler approach if the above is too complex: instead of rendering all images, just change the `src` attribute on a single `<img>` element when the slide changes. This means only 1 image loads at a time. The tradeoff is a brief flash on slide change (no pre-loading of neighbors).
4. Choose the approach that minimizes code changes while ensuring no more than 3 images load at any given time.

### Verification
- `npm run build` passes.
- Opening a service modal loads at most 3 images (check the DOM — no more than 3 `<img>` tags inside the slideshow container).
- Navigating between slides still works smoothly (Previous/Next buttons).
- The image counter ("2 / 21") still shows the correct total count.

---

## TASK 6: Contact Form — Trap Focus Inside Modal-Like Sections

### Problem
When a user on mobile taps into the contact form and starts tabbing through fields, there's no focus trap — pressing Tab after the last form field moves focus to the footer links or other page elements. While the contact form isn't a modal (it's an in-page section), adding a visual focus indicator on the submit button and ensuring logical tab order improves mobile keyboard UX.

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
1. Verify that all form fields have a visible `focus:ring` or `focus-visible:ring` style. If not, add `focus-visible:ring-2 focus-visible:ring-accent-500` to all input, select, and textarea elements.
2. Verify the "Send Message" submit button has a clear focus style: `focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900`.
3. Ensure the form fields follow a logical tab order: First Name → Last Name → Email → Phone → Company → Service dropdown → Project Details textarea → Send Message button.
4. Do NOT implement an actual focus trap — this is a page section, not a modal. Just ensure all interactive elements have visible focus indicators and logical order.

### Verification
- `npm run build` passes.
- All form inputs have `focus-visible:ring` styles in their class lists.
- The submit button has a visible focus ring style.
- Tabbing through the form follows the logical field order.

---

## EXECUTION ORDER

1. **Task 1** (overflow-x hidden) — global CSS, quick addition
2. **Task 2** (smooth scroll) — global CSS, can combine with Task 1
3. **Task 3** (modal close button size) — single class change
4. **Task 4** (modal aria-label) — single attribute addition
5. **Task 6** (form focus styles) — class additions to existing elements
6. **Task 5** (modal lazy images) — most complex, render logic change

---

## GIT WORKFLOW

1. Ensure you're on `main` and up to date: `git checkout main && git pull origin main`
2. Create feature branch: `git checkout -b fix/mobile-ux-round3`
3. Make all changes
4. Run `npm run build` — must pass with zero errors
5. Run tests: `npm run test` or `npx playwright test`
6. Update visual baselines if needed: `npm run test:visual:update`
7. Commit: `git add . && git commit -m "fix: mobile UX round 3 — overflow guard, smooth scroll, modal a11y, lazy images, form focus"`
8. Push the branch: `git push origin fix/mobile-ux-round3`
9. **Do NOT merge to main.** Leave for Graham to review.

---

## DEFINITION OF DONE

- [ ] `html` element has `overflow-x: hidden` in global CSS
- [ ] `html` element has `scroll-behavior: smooth` (CSS rule or Tailwind class)
- [ ] Service modal close button is `w-11 h-11` (44×44px)
- [ ] Service modal dialog has `aria-label` or `aria-labelledby`
- [ ] Service modal renders at most 3 images at any time (not all 21)
- [ ] Image counter still shows correct total (e.g., "2 / 21")
- [ ] All contact form inputs have `focus-visible:ring` styles
- [ ] Submit button has visible focus ring
- [ ] `npm run build` passes with zero errors
- [ ] Feature branch created, committed, pushed, NOT merged to main
- [ ] Summary written to `tasks/todo.md`
