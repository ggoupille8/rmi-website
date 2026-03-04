# SPEC: Service Modal UX Improvements

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

Service modals work but can be improved with swipe gestures for mobile, keyboard navigation, better entrance animation, and preloading the next service when browsing.

**DO NOT MODIFY:** Service card grid layout, service content text, hero section, footer, analytics, or SEO.

---

## TASK 1: Swipe Gesture Support for Image Slideshow

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. Add touch swipe support to the image slideshow panel in service modals.
2. Track `touchstart` and `touchend` events on the image container:
   ```tsx
   const [touchStart, setTouchStart] = useState(0);
   const [touchEnd, setTouchEnd] = useState(0);
   
   const handleTouchStart = (e: TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
   const handleTouchMove = (e: TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
   const handleTouchEnd = () => {
     if (touchStart - touchEnd > 75) nextImage(); // swipe left
     if (touchEnd - touchStart > 75) prevImage(); // swipe right
   };
   ```
3. Add these handlers to the image container div (not the entire modal, so text scrolling still works).
4. Minimum swipe distance: 75px to prevent accidental triggers.

### Verification
- `npm run build` passes.
- On mobile (or with touch simulation), swiping left advances to the next image.
- Swiping right goes to the previous image.
- Swipes shorter than 75px are ignored.
- Arrow buttons still work alongside swipe.

---

## TASK 2: Modal Entrance/Exit Animation

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. Currently the modal appears instantly. Add a fade + scale animation:
   - Overlay: fade from `opacity-0` to `opacity-100` over 200ms.
   - Dialog: scale from `scale-95 opacity-0` to `scale-100 opacity-100` over 300ms with ease-out.
   - On close: reverse the animation, then unmount.
2. Use React state to manage the animation lifecycle:
   ```tsx
   const [isClosing, setIsClosing] = useState(false);
   
   const closeModal = () => {
     setIsClosing(true);
     setTimeout(() => {
       setSelectedService(null);
       setIsClosing(false);
     }, 200);
   };
   ```
3. Apply animation classes based on `isClosing` state.

### Verification
- `npm run build` passes.
- Opening a modal shows a smooth fade + scale-up animation.
- Closing shows a reverse animation before the modal disappears.
- The animation doesn't cause layout jank.

---

## TASK 3: Keyboard Navigation Between Services

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. When a service modal is open, pressing the left/right arrow keys should navigate to the previous/next service (not just the previous/next image).
2. Add a `keydown` listener when the modal is open:
   ```tsx
   useEffect(() => {
     if (!selectedService) return;
     const handleKey = (e: KeyboardEvent) => {
       if (e.key === 'ArrowLeft') prevImage();
       if (e.key === 'ArrowRight') nextImage();
       if (e.key === 'Escape') closeModal();
     };
     window.addEventListener('keydown', handleKey);
     return () => window.removeEventListener('keydown', handleKey);
   }, [selectedService, currentImageIndex]);
   ```
3. Left/Right arrows control the image slideshow within the current service.
4. Escape closes the modal (verify this already works).

### Verification
- `npm run build` passes.
- Arrow keys navigate images in the slideshow.
- Escape closes the modal.
- Keyboard navigation doesn't interfere with text input in other components.

---

## TASK 4: Modal — Lock Body Scroll

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. When a service modal is open, the page behind it should not scroll:
   ```tsx
   useEffect(() => {
     if (selectedService) {
       document.body.style.overflow = 'hidden';
     } else {
       document.body.style.overflow = '';
     }
     return () => { document.body.style.overflow = ''; };
   }, [selectedService]);
   ```
2. This prevents the background content from scrolling while the user is interacting with the modal.

### Verification
- `npm run build` passes.
- With a service modal open, the background page does not scroll.
- After closing the modal, scrolling works normally.

---

## TASK 5: Image Slideshow — Preload Adjacent Images

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. The R3 spec changed the slideshow to only render current ± 1 images. Verify this is working correctly.
2. Additionally, add `<link rel="prefetch">` for the image 2 positions ahead so it's cached by the time the user swipes to it:
   ```tsx
   useEffect(() => {
     if (selectedService?.images?.length > 0) {
       const prefetchIdx = (currentImageIndex + 2) % selectedService.images.length;
       const link = document.createElement('link');
       link.rel = 'prefetch';
       link.href = selectedService.images[prefetchIdx].src;
       document.head.appendChild(link);
       return () => link.remove();
     }
   }, [currentImageIndex, selectedService]);
   ```
3. This ensures smoother slideshow navigation — current and adjacent images are rendered in DOM, the one 2 ahead is prefetched.

### Verification
- `npm run build` passes.
- Only 3 images max are in the DOM at any time.
- A prefetch link for the image 2 positions ahead exists in `<head>`.
- Navigating through images feels smooth with no loading flicker.

---

## TASK 6: Modal — Focus Trap

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. When the modal is open, Tab should cycle through only the modal's interactive elements: close button, previous arrow, next arrow, and Request a Quote button.
2. Implement the same focus trap pattern as the mobile nav:
   ```tsx
   useEffect(() => {
     if (!selectedService) return;
     const modal = modalRef.current;
     const focusable = modal?.querySelectorAll('button, a, [tabindex="0"]');
     if (!focusable?.length) return;
     
     const first = focusable[0];
     const last = focusable[focusable.length - 1];
     
     const trapFocus = (e: KeyboardEvent) => {
       if (e.key !== 'Tab') return;
       if (e.shiftKey && document.activeElement === first) {
         e.preventDefault();
         last.focus();
       } else if (!e.shiftKey && document.activeElement === last) {
         e.preventDefault();
         first.focus();
       }
     };
     
     window.addEventListener('keydown', trapFocus);
     first.focus();
     return () => window.removeEventListener('keydown', trapFocus);
   }, [selectedService]);
   ```
3. On modal open, focus moves to the close button.
4. On modal close, focus returns to the service card that was clicked.

### Verification
- `npm run build` passes.
- Tab cycles through only modal elements.
- Focus starts on the close button.
- Closing returns focus to the triggering card.

---

## EXECUTION ORDER
1. Task 4 (body scroll lock — quick)
2. Task 3 (keyboard nav — moderate)
3. Task 6 (focus trap — moderate)
4. Task 2 (entrance animation — moderate)
5. Task 1 (swipe gestures — moderate)
6. Task 5 (prefetch — small)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b feat/modal-ux-improvements`
3. Make all changes, `npm run build`, `npm run test`
4. Update visual baselines if needed: `npm run test:visual:update`
5. `git add . && git commit -m "feat: service modal — swipe, animation, keyboard nav, focus trap, scroll lock"`
6. `git push origin feat/modal-ux-improvements`
7. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] Swipe left/right navigates slideshow images on touch devices
- [ ] Modal opens with fade + scale animation
- [ ] Modal closes with reverse animation
- [ ] Arrow keys navigate images, Escape closes modal
- [ ] Body scroll locked while modal open
- [ ] Adjacent image prefetched
- [ ] Focus trapped inside modal
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
