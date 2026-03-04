# SPEC: UX Micro-Interactions & Polish

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

The site is functionally complete. This spec adds polish and micro-interactions that make the site feel more professional and responsive. These are the details that separate a "good" site from a great one.

**DO NOT MODIFY:** Any content text, SEO meta tags, structured data, analytics, or contact form API logic.

---

## TASK 1: Navbar Scroll Shadow Effect

### Problem
The navbar is fixed at the top with a solid dark background. When the user scrolls, there's no visual cue that the navbar is floating above page content. Adding a subtle shadow on scroll makes the navbar feel more grounded.

### Files
- `frontend/src/components/landing/Navbar.astro`

### Approach
1. Check if there's already a scroll listener or JS that adds/removes classes on the navbar based on scroll position. If so, add a shadow class to the "scrolled" state.
2. If not, add a small inline `<script>` at the bottom of the Navbar component:
   ```html
   <script>
     const nav = document.querySelector('nav');
     window.addEventListener('scroll', () => {
       nav.classList.toggle('shadow-lg', window.scrollY > 20);
       nav.classList.toggle('shadow-black/30', window.scrollY > 20);
     }, { passive: true });
   </script>
   ```
3. The shadow should be subtle: `shadow-lg shadow-black/30` (not harsh).
4. Use `{ passive: true }` on the scroll listener for performance.

### Verification
- `npm run build` passes.
- Scrolling down adds a shadow to the navbar.
- At the top of the page (scrollY = 0), no shadow is visible.

---

## TASK 2: Animated Stats Counter in Hero

### Problem
The hero stats (100+, 500+, 231K+) currently display as static text. Animating them to count up when they enter the viewport adds visual interest and draws attention to the numbers. This is a common pattern on professional landing pages.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`

### Approach
1. The hero is above the fold, so the animation should trigger on page load (not on scroll into view).
2. Create a `useCountUp` hook or use a simple animation approach:
   ```tsx
   function useCountUp(target: number, duration: number = 2000, suffix: string = '') {
     const [count, setCount] = useState(0);
     useEffect(() => {
       const start = Date.now();
       const step = () => {
         const elapsed = Date.now() - start;
         const progress = Math.min(elapsed / duration, 1);
         // Ease-out curve
         const eased = 1 - Math.pow(1 - progress, 3);
         setCount(Math.floor(eased * target));
         if (progress < 1) requestAnimationFrame(step);
       };
       requestAnimationFrame(step);
     }, [target, duration]);
     return count;
   }
   ```
3. Apply to each stat:
   - 100+ clients → count from 0 to 100, append "+"
   - 500+ projects → count from 0 to 500, append "+"
   - 231K+ hours → count from 0 to 231, append "K+"
4. Add a small delay (300ms) before starting the animation so the page feels settled first.
5. Use `requestAnimationFrame` for smooth 60fps animation.

### Verification
- `npm run build` passes.
- On page load, the three stat numbers animate upward from 0 to their target values.
- The animation completes in ~2 seconds with an ease-out curve.
- After animation completes, the numbers display the correct final values.

---

## TASK 3: Hero Slideshow Transition Indicator

### Problem
The hero has a multi-image slideshow but there's no visual indicator showing which image is active or that multiple images exist. Users may not realize the background is cycling. Adding small dot indicators at the bottom gives visual feedback.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`

### Approach
1. Below the stats row (or at the very bottom of the hero section), add a row of small dots:
   ```tsx
   <div className="flex justify-center gap-2 mt-2">
     {heroImages.map((_, idx) => (
       <button
         key={idx}
         onClick={() => setCurrentSlide(idx)}
         className={`w-2 h-2 rounded-full transition-all duration-300 ${
           idx === currentSlide ? 'bg-white w-4' : 'bg-white/40'
         }`}
         aria-label={`Go to slide ${idx + 1}`}
       />
     ))}
   </div>
   ```
2. The active dot should be wider (elongated pill shape: `w-4`) and fully white, while inactive dots are small circles with 40% opacity.
3. Clicking a dot should navigate to that slide.
4. Position the dots at the bottom of the hero, above the section border.

### Verification
- `npm run build` passes.
- Dots appear at the bottom of the hero section.
- The active dot changes as the slideshow advances.
- Clicking a dot navigates to the corresponding slide.

---

## TASK 4: Project Cards — "View Details" Hover Overlay

### Problem
Project cards have hover effects (border highlight, slight lift, image zoom) but no clear call-to-action text appears on hover. Adding a subtle "View Details" text overlay on the image when hovering makes it clear the cards are interactive.

### Files
- `frontend/src/components/landing/ProjectShowcase.tsx`

### Approach
1. Currently project cards don't open a modal or link anywhere — they're display-only. Before adding a hover CTA, determine what it should do. Since there are no detail pages yet, make the overlay say "Coming Soon" with a subtle visual treatment, OR skip this task if project cards shouldn't appear clickable.
2. **Better alternative:** Add a subtle gradient overlay on hover that darkens the image slightly, with no text. This makes the hover zoom feel more intentional:
   ```tsx
   <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
   ```
3. This overlay div goes inside the image container, after the `<picture>` element.

### Verification
- `npm run build` passes.
- Hovering over a project card image shows a subtle darkening overlay.
- The overlay transitions smoothly (300ms).

---

## TASK 5: Contact Form — Success Animation

### Problem
When the contact form is submitted successfully, verify there's a clear success state with a visual indicator (checkmark animation, green confirmation, etc.) rather than just replacing the form with text.

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
1. Check the current success state rendering. If it already shows a success message, enhance it:
   - Add a checkmark icon (use an SVG circle-check or the existing icon library).
   - Add a `animate-in` CSS animation: scale from 0 to 1 with a slight bounce.
   - Use green accent color for the success state.
2. The success message should include:
   - A checkmark icon (animated)
   - "Thank you!" heading
   - "We'll get back to you within 48 hours." subtext
   - A "Send Another Message" button that resets the form
3. If no success state exists, create one that replaces the form fields after successful submission.

### Verification
- `npm run build` passes.
- Submitting the form (can test with a mock) shows an animated success state.
- The success state has a checkmark, thank you message, and reset button.

---

## TASK 6: Back-to-Top Button — Smooth Fade In/Out

### Problem
The "Back to top" button in the footer is always visible. It should fade in only after the user scrolls down past the first viewport, and fade out when near the top.

### Files
- `frontend/src/components/landing/Footer.tsx`

### Approach
1. Check if the back-to-top button already has show/hide logic. If so, ensure it uses opacity transitions.
2. If not, wrap the button with a scroll-aware visibility:
   - Start with `opacity-0 pointer-events-none`
   - After scrolling past `window.innerHeight`, add `opacity-100 pointer-events-auto`
   - Add `transition-opacity duration-300`
3. Since this is in an Astro component (or React), the scroll listener approach depends on the component type:
   - For React: use `useEffect` with scroll listener
   - For Astro: use inline `<script>` tag
4. Alternative: Move back-to-top from the footer into a floating fixed-position button (bottom-right) that appears on scroll. This is more discoverable than a footer link.

### Verification
- `npm run build` passes.
- Back-to-top button is hidden at the top of the page.
- Scrolling down past the hero makes it appear with a fade transition.
- Clicking it scrolls to top smoothly.

---

## EXECUTION ORDER
1. Task 1 (navbar shadow — quick)
2. Task 6 (back-to-top — quick)
3. Task 4 (project card overlay — quick)
4. Task 2 (stats counter — moderate)
5. Task 3 (slideshow dots — moderate)
6. Task 5 (form success — moderate)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b feat/ux-micro-interactions`
3. Make all changes, `npm run build`, `npm run test`
4. Update visual baselines if needed: `npm run test:visual:update`
5. `git add . && git commit -m "feat: UX polish — navbar shadow, stats counter, slideshow dots, project hover, form success, back-to-top"`
6. `git push origin feat/ux-micro-interactions`
7. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] Navbar gains shadow on scroll, no shadow at top
- [ ] Hero stats animate from 0 to target on page load
- [ ] Slideshow dots appear, active dot updates, clicking navigates
- [ ] Project card images darken slightly on hover
- [ ] Contact form has animated success state with checkmark
- [ ] Back-to-top button fades in/out based on scroll position
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
