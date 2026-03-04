# SPEC: Mobile Navigation Menu Polish

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

The mobile hamburger menu works but lacks the polish and transitions that make it feel native. This spec adds entrance/exit animations, backdrop blur, and proper focus trapping to make the mobile nav feel premium.

**DO NOT MODIFY:** Desktop nav layout, navbar logo, service modals, any content text, analytics, or SEO.

---

## TASK 1: Mobile Menu Slide-In Animation

### Files
- `frontend/src/components/landing/Navbar.astro`

### Approach
1. Currently the mobile menu toggles between `hidden` and visible. Replace the hard show/hide with a slide-in from the right:
   - Default state: `translate-x-full opacity-0`
   - Open state: `translate-x-0 opacity-100`
   - Add `transition-all duration-300 ease-out` for smooth animation.
2. Instead of using `hidden` class (which prevents transitions), use `invisible pointer-events-none` for the closed state and `visible pointer-events-auto` for the open state, combined with the transform.
3. Keep the existing backdrop overlay (the semi-transparent background behind the menu). If there isn't one, add one: a full-screen `fixed inset-0 bg-black/60 backdrop-blur-sm` that fades in when the menu opens.
4. The backdrop should close the menu when tapped (click handler on the overlay).

### Verification
- `npm run build` passes.
- Opening the mobile menu slides in from the right with a smooth 300ms animation.
- Closing slides it back out.
- Tapping the backdrop overlay closes the menu.
- Desktop nav is unaffected.

---

## TASK 2: Mobile Menu — Active Section Highlight

### Files
- `frontend/src/components/landing/Navbar.astro`

### Approach
1. When the mobile menu is open, highlight the link corresponding to the currently visible section. Use the Intersection Observer API to detect which section is in view.
2. If the desktop nav already has active section highlighting (check for any existing `IntersectionObserver` code), reuse the same logic for the mobile menu links.
3. The active link should have a visual indicator — a left blue border or a different text color:
   ```css
   /* Active link */
   text-blue-400 font-semibold
   /* Inactive link */
   text-neutral-300
   ```
4. If implementing from scratch, observe all sections (`#services`, `#about`, `#projects`, `#contact`) and update the active link based on which section has the most visibility.

### Verification
- `npm run build` passes.
- When scrolled to the Services section and opening the mobile menu, "Services" is highlighted.
- The highlight updates as the user scrolls and reopens the menu.

---

## TASK 3: Mobile Menu — Close on Link Click

### Files
- `frontend/src/components/landing/Navbar.astro`

### Approach
1. When a user taps a navigation link in the mobile menu (e.g., "Services"), the menu should close automatically as the page scrolls to the target section.
2. Check if this already works. If the menu stays open after clicking a link, add a click handler to each mobile nav link:
   ```javascript
   document.querySelectorAll('.mobile-nav-link').forEach(link => {
     link.addEventListener('click', () => {
       // Close the mobile menu
       toggleMenu(false);
     });
   });
   ```
3. The smooth scroll to the section should still work (scroll-smooth is already on html).

### Verification
- `npm run build` passes.
- Clicking any link in the mobile menu closes it and scrolls to the target section.
- The scroll animation is smooth.

---

## TASK 4: Mobile Menu — Trap Focus

### Files
- `frontend/src/components/landing/Navbar.astro`

### Approach
1. When the mobile menu is open, Tab key should cycle through only the menu links and the close button — not escape to elements behind the menu.
2. Implement a simple focus trap:
   - On open: find all focusable elements inside the menu panel.
   - On Tab at the last element: move focus to the first element.
   - On Shift+Tab at the first element: move focus to the last element.
3. On close: return focus to the hamburger button.
4. Also handle the Escape key — pressing Escape should close the menu.

### Verification
- `npm run build` passes.
- With the mobile menu open, Tab cycles only through menu items.
- Pressing Escape closes the menu.
- Focus returns to the hamburger button after closing.

---

## TASK 5: Mobile Menu — Prevent Body Scroll

### Files
- `frontend/src/components/landing/Navbar.astro`

### Approach
1. When the mobile menu is open, the page behind it should not scroll. Add `overflow-hidden` to the `<body>` when the menu opens, and remove it when it closes:
   ```javascript
   function openMenu() {
     document.body.classList.add('overflow-hidden');
     // ... show menu
   }
   function closeMenu() {
     document.body.classList.remove('overflow-hidden');
     // ... hide menu
   }
   ```
2. On iOS Safari, `overflow-hidden` on body alone may not be sufficient. Also add `-webkit-overflow-scrolling: auto` or use `position: fixed` on the body with stored scroll position if needed.

### Verification
- `npm run build` passes.
- With the mobile menu open, scrolling the page behind is impossible.
- After closing the menu, normal scrolling resumes from the same position.

---

## EXECUTION ORDER
1. Task 5 (body scroll lock — quick)
2. Task 3 (close on link click — quick)
3. Task 1 (slide animation — moderate)
4. Task 4 (focus trap — moderate)
5. Task 2 (active highlight — moderate)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b feat/mobile-nav-polish`
3. Make all changes, `npm run build`, `npm run test`
4. Update visual baselines if needed: `npm run test:visual:update`
5. `git add . && git commit -m "feat: mobile nav — slide animation, focus trap, scroll lock, active highlight"`
6. `git push origin feat/mobile-nav-polish`
7. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] Mobile menu slides in/out with 300ms animation
- [ ] Backdrop overlay appears and closes menu on tap
- [ ] Active section is highlighted in mobile menu
- [ ] Clicking a link closes the menu and scrolls to section
- [ ] Focus is trapped inside the open menu
- [ ] Escape closes the menu
- [ ] Body scroll is locked while menu is open
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
