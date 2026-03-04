# SPEC: Service Image Slideshows & Image Pipeline

## CONTEXT

Graham has added service photos to `public/images/services/` in subfolders organized by service type. These need to be:
1. Renamed to a consistent kebab-case format
2. Converted to WebP (with JPG fallbacks via `<picture>` elements)
3. Displayed in a **photo slideshow/carousel** inside each service modal when clicked
4. A new hero image has also been added to `public/images/hero/`

The current service modals show: icon → title → description → "Request a Quote" CTA. The upgraded modals will add a full-width image slideshow above the description, making them visually compelling showcases of RMI's actual work.

Some service folders are empty (24/7 Emergency Response, Plan & Specification Work). For these, the modal should gracefully show no slideshow — just the existing icon/title/description/CTA layout.

## IMPORTANT NOTES

- The project root is the repo root (NOT `frontend/`). Paths like `src/`, `public/`, `tests/` are at root level.
- The site is dark-mode only. All UI must work on dark backgrounds.
- Use `<picture>` elements with WebP + JPG fallback for all images (established pattern from hero/projects).
- Images should be lazy-loaded.
- Touch/swipe support is required for mobile slideshow navigation.

---

## TASK 1: Inventory & Rename Service Images

### Problem
Service images have inconsistent naming (likely from phone cameras — IMG_xxxx.jpg, etc.) and need standardized names.

### Files
- All files in `public/images/services/*/`

### Approach

1. **First, inventory every file** in each service subfolder. List them with sizes.

2. **Rename subfolders** to kebab-case if needed:
   - `24-7 Emergency Response` → `emergency-response`
   - `Duct Insulation` → `duct-insulation`
   - `Field-Applied Jacketing` → `field-applied-jacketing`
   - `Material Sales` → `material-sales`
   - `Pipe Insulation` → `pipe-insulation`
   - `Pipe Supports & Fabrication` → `pipe-supports`
   - `Plan & Specification Work` → `plan-spec`
   - `Removable Insulation Blankets` → `removable-blankets`
   - `Tanks, Vessels, & Equipment Insulation` → `tanks-vessels`

3. **Rename images** inside each folder to: `{service}-{N}.{ext}` where N is 1, 2, 3...
   - Example: `pipe-insulation-1.jpg`, `pipe-insulation-2.jpg`
   - Preserve original extensions for now (WebP conversion is Task 2)

### Verification
- All folders are kebab-case
- All images follow `{service}-{N}.{ext}` pattern
- No spaces or special characters in filenames
- Original image count matches renamed count (nothing lost)

---

## TASK 2: Convert All Images to WebP + Optimize

### Problem
Raw phone photos are likely 3-10MB each. Need WebP versions optimized for web (target: 200-400KB per image for modals, ~1200px wide max).

### Approach

1. **Install sharp** if not already available:
   ```bash
   npm install sharp --save-dev
   ```

2. **Create a one-time conversion script** at `scripts/convert-service-images.mjs`:
   ```javascript
   // For each image in public/images/services/*/
   // - Resize to max 1200px wide (maintain aspect ratio)
   // - Output WebP at quality 80
   // - Keep original JPG as fallback, also resized to 1200px wide at quality 85
   // - Log before/after sizes
   ```

3. **Run the script** and verify output.

4. **Delete originals** after confirming WebP + optimized JPG versions exist.

### What NOT to Change
- Do not touch `public/images/hero/`, `public/images/projects/`, `public/images/cta/`, or `public/images/logo/`

### Verification
- Every service image has both `.webp` and `.jpg` versions
- No image exceeds 500KB
- All images are ≤1200px wide
- Total `public/images/services/` size is reasonable (log total before/after)

---

## TASK 3: Process New Hero Image

### Problem
A new hero image was added to `public/images/hero/`. It needs the same WebP conversion and naming treatment as existing hero images.

### Approach

1. Check `public/images/hero/` for any new files that aren't already in the established `hero-{N}.webp` / `hero-{N}.jpg` naming pattern.
2. Rename the new image to the next sequential number (e.g., if hero-1 through hero-5 exist, name it hero-6).
3. Convert to WebP + optimized JPG using the same approach as Task 2 (but for hero images, target max 1920px wide since they're full-viewport background images).
4. Update `src/components/landing/HeroFullWidth.tsx` to include the new image in the slideshow array.

### Verification
- New hero image follows `hero-{N}.webp` / `hero-{N}.jpg` naming
- Both WebP and JPG versions exist
- Image is included in the hero slideshow rotation
- `npm run build` passes

---

## TASK 4: Add Service Image Data to Site Content

### Problem
The service modal component needs to know which images belong to each service. This data should live in `src/content/site.ts` alongside the existing service definitions.

### Files
- `src/content/site.ts`

### Approach

1. Add an `images` array to each service definition in `site.ts`. Each entry should be an object with `src` (the base filename without extension — the component will handle WebP/JPG paths) and `alt` text.

   Example structure:
   ```typescript
   {
     id: 'pipe-insulation',
     title: 'Pipe Insulation',
     icon: '...', 
     description: '...',
     images: [
       { src: 'pipe-insulation/pipe-insulation-1', alt: 'Insulated pipe run in mechanical room' },
       { src: 'pipe-insulation/pipe-insulation-2', alt: 'Completed pipe insulation installation' },
       // ...
     ]
   }
   ```

2. For services with no images (emergency-response, plan-spec), set `images: []`.

3. Write **descriptive alt text** for each image based on what the photo shows. If you can't determine the content from the filename alone, use generic but accurate alt text like "RMI crew installing [service type]" or "[Service type] installation by Resource Mechanical Insulation".

### Verification
- Every service has an `images` array (even if empty)
- Alt text is present for every image
- Image `src` paths match the actual file paths from Task 1
- TypeScript compiles without errors

---

## TASK 5: Build Service Modal Image Slideshow Component

### Problem
Service modals currently show icon → title → description → CTA. Need to add an image slideshow above the description for services that have photos.

### Files
- `src/components/landing/Services.tsx` (the modal is in this file)
- Possibly a new `src/components/landing/ImageSlideshow.tsx` if extracted

### Approach

**Slideshow design requirements:**
- Full-width within the modal, positioned **above** the text description
- Aspect ratio: 16:9 container with `object-fit: cover`
- Navigation: left/right arrow buttons overlaid on the image (semi-transparent dark bg, white chevron icons)
- Dot indicators below the image showing current position
- **Touch/swipe support** on mobile (use touch event handlers — no external carousel library)
- Auto-advance every 5 seconds, pause on hover/touch
- Smooth crossfade or slide transition (CSS transitions, not JS animation libraries)
- Uses `<picture>` elements with WebP + JPG fallback
- All images lazy-loaded except the first one in each slideshow
- If a service has 0 images, the slideshow section is not rendered at all (modal falls back to current layout)
- If a service has exactly 1 image, show it without arrows or dots

**Modal layout (top to bottom):**
1. Image slideshow (full-width, 16:9 aspect ratio) — only if images exist
2. Icon + Title (centered)
3. Description text
4. "Request a Quote" CTA button

**Responsive behavior:**
- Desktop: modal max-width ~600px, image fills full width
- Mobile: modal is nearly full-screen, image fills full width
- Arrows: 44x44px touch targets minimum, positioned at left/right edges
- Dots: centered below image, 12px diameter, 44px touch target area each

### What NOT to Change
- Service card grid layout on the main page (just the cards themselves)
- Existing service data structure (only add `images` array, don't remove anything)
- Modal open/close behavior, backdrop, escape key handling
- "Request a Quote" CTA functionality

### Verification
- Click each service card → modal opens with slideshow (if images exist)
- Arrow navigation works (left/right)
- Dot navigation works (click any dot)
- Auto-advance works (wait 5 seconds)
- Swipe works on mobile viewport (test at 375px)
- Services without images show clean modal (no empty slideshow container)
- `<picture>` elements used in the DOM (inspect with dev tools)
- All images have alt text
- `npm run build` passes
- All existing tests pass

---

## TASK 6: Build & Test Verification

### Approach
1. `npm run build` — must pass with zero errors
2. `npm run test` — all tests must pass
3. If visual regression tests fail (expected — modal layout changed), update baselines: `npm run test:visual:update`
4. Manually verify by running `npm run dev` and:
   - Click every service card
   - Verify slideshow appears for services with images
   - Verify clean modal for services without images
   - Test at both desktop (1280px) and mobile (375px) widths
   - Verify arrow, dot, and swipe navigation

---

## EXECUTION ORDER

1. **Task 1** — Inventory & rename (foundation for everything)
2. **Task 2** — WebP conversion & optimization
3. **Task 3** — Hero image processing
4. **Task 4** — Add image data to site.ts
5. **Task 5** — Build slideshow component + modal integration
6. **Task 6** — Full verification

**Build checkpoint after Task 3** — run `npm run build` to confirm image changes don't break anything before touching components.

**Build checkpoint after Task 5** — full build + test suite.

## GIT WORKFLOW

- **Branch:** `feat/service-image-slideshows`
- **Commit strategy:** One commit per task for clean history:
  - `chore: rename and organize service images`
  - `perf: convert service images to WebP with optimization`
  - `perf: add and optimize new hero image`
  - `feat: add service image data to site content`
  - `feat: add image slideshow to service modals`
  - `test: update visual baselines for modal changes`
- **Merge policy:** Do NOT merge to main. Push feature branch only.

## DEFINITION OF DONE

- [ ] All service image folders renamed to kebab-case
- [ ] All images renamed to `{service}-{N}` pattern
- [ ] WebP + JPG versions of every service image (≤500KB, ≤1200px wide)
- [ ] New hero image processed and added to hero slideshow
- [ ] `site.ts` updated with image arrays for all 9 services
- [ ] Slideshow component built with arrow, dot, and swipe navigation
- [ ] Modals display slideshow above description text
- [ ] Services without images show clean modal (no empty slideshow)
- [ ] Auto-advance works (5s interval, pause on hover)
- [ ] Touch/swipe works at mobile viewport
- [ ] All `<picture>` elements use WebP + JPG fallback
- [ ] `npm run build` passes
- [ ] `npm run test` passes (baselines updated if needed)
- [ ] All changes on `feat/service-image-slideshows` branch, NOT merged to main
- [ ] Summary written to `tasks/todo.md`

## SELF-CORRECTION LOOP

If any task fails verification:
1. STOP and diagnose the root cause
2. Fix the issue
3. Re-run verification for that task AND all previous tasks
4. Only proceed to the next task after all prior tasks verify clean

If `npm run build` fails at any checkpoint:
1. Read the full error output
2. Fix TypeScript/import/path issues
3. Re-run build
4. Do NOT proceed until build is green

## CLAUDE CODE PROMPT

```
Read the file `SPEC-SERVICE-SLIDESHOWS.md` in the project root directory. This is a detailed spec for processing service images, converting to WebP, adding a new hero image, and building image slideshow carousels in the service modals. Execute all 6 tasks in order with build checkpoints after Tasks 3 and 5. Follow the git workflow (one commit per task, feature branch, do NOT merge to main). Write a summary to `tasks/todo.md` when complete.
```
