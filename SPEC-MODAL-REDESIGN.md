# SPEC: Service Modal Layout Redesign — Side-by-Side

## CONTEXT

The service modal slideshows from the previous sprint are working but the layout needs improvement:

1. **Images are over-cropped** — The 16:9 `object-fit: cover` container cuts off too much of the vertical content in industrial photos
2. **Modal is too narrow** — Current ~600px max-width doesn't give the images enough room
3. **Stacked layout wastes space** — Image on top + text below makes the modal very tall and the image area small
4. **Too many dots** — Some services have 15-20+ photos, and the dot indicators are crammed together

**The fix:** Redesign to a **side-by-side layout** on desktop with a much wider modal, and show more of each photo.

## IMPORTANT NOTES

- Only modify the modal layout — do NOT touch the service cards grid, image data, or image files
- Dark-mode only site
- Keep all existing functionality: arrows, dots, swipe, auto-advance, close on backdrop/escape
- The ImageSlideshow component can be modified but the slideshow logic should stay the same

---

## TASK 1: Redesign Modal to Side-by-Side Layout

### Files
- `src/components/landing/Services.tsx` (modal markup + styles)
- `src/components/landing/ImageSlideshow.tsx` (slideshow component)

### Desktop Layout (≥768px)

The modal should use a **horizontal two-panel layout**:

```
┌──────────────────────────────────────────────────────┐
│                          │                           │
│                          │    [Icon]                  │
│                          │    SERVICE TITLE           │
│      [Large Image]       │    ─────────               │
│      with arrows         │    Description text        │
│                          │    that can scroll if      │
│                          │    needed...               │
│      ● ● ● ● ●          │                           │
│                          │    [Request a Quote]       │
│          [X]             │                           │
└──────────────────────────────────────────────────────┘
```

**Specifications:**

- **Modal max-width: 1000px** (up from ~600px)
- **Modal max-height: 85vh** to stay within viewport
- **Left panel: 60% width** — the image area
  - Image uses `object-fit: contain` on a dark/black background so the full photo is visible with no cropping
  - Minimum height: 400px, natural aspect ratio preserved
  - Left/right arrow navigation overlaid on image edges
  - Dot indicators centered below the image (inside the left panel)
  - Close button (X) positioned at top-right of the image panel (not the whole modal)
- **Right panel: 40% width** — text content
  - Vertically centered content: icon, title, horizontal rule, description, CTA button
  - Content should be scrollable if it overflows (unlikely but safe)
  - Padding: comfortable spacing (~24-32px)
- **Divider:** Subtle vertical border or gap between panels

**For services with many photos (>8 dots):**
- Show only the current dot and its nearest neighbors (e.g., show 7 dots max with `...` or fade at edges)
- OR: Replace dots with a simple "3 / 20" counter text (cleaner for large sets)

I'd recommend the counter approach: **"3 / 20"** centered below the image. Simpler, works at any count.

### Mobile Layout (<768px)

- **Stack vertically** (same as current behavior)
- Modal becomes nearly full-screen
- Image on top with `object-fit: contain` (not cover) — show the full photo
- Image area: 50-60vh max height
- Photo counter "3 / 20" below image
- Text content below
- CTA button at bottom

### What NOT to Change

- Service card grid on the page
- Image file paths or data in `site.ts`
- Slideshow auto-advance, swipe, arrow key behavior
- Modal open/close logic, backdrop click, escape key
- Services without images (keep existing text-only modal)

### Verification

- Click every service card with images → modal opens in side-by-side layout
- Image is NOT cropped — full photo visible on dark background
- Arrow navigation works
- Counter shows "1 / N" format
- Close button works
- Backdrop click closes modal
- Escape key closes modal
- At 375px mobile width: modal stacks vertically, image is full-width
- Services without images (24/7 Emergency Response, Plan & Spec): text-only modal, no empty image panel
- `npm run build` passes
- `npm run test` passes (update visual baselines if needed)

---

## EXECUTION ORDER

1. Modify modal container to flexbox horizontal layout at ≥768px
2. Update image panel to use `object-fit: contain` with dark background
3. Replace dot indicators with "N / Total" counter
4. Style the right text panel with centered content
5. Add mobile breakpoint to stack vertically
6. Handle no-image services (right panel goes full-width, no left panel)
7. Build + test verification

## GIT WORKFLOW

- **Branch:** `feat/modal-side-by-side`
- **Commit message:** `feat: redesign service modals to side-by-side layout with larger images`
- **Merge policy:** Do NOT merge to main. Push feature branch only.

## DEFINITION OF DONE

- [ ] Desktop: modal is ~1000px wide with image left (60%) and text right (40%)
- [ ] Images use `object-fit: contain` — no cropping
- [ ] Dark background behind images (black or very dark gray)
- [ ] Photo counter "N / Total" replaces dots
- [ ] Mobile: vertical stack with full photo visible
- [ ] No-image services: clean text-only modal
- [ ] All existing functionality preserved (arrows, swipe, auto-advance, close)
- [ ] `npm run build` passes
- [ ] `npm run test` passes (baselines updated if needed)
- [ ] Changes on `feat/modal-side-by-side` branch, NOT merged to main

## CLAUDE CODE PROMPT

```
Read the file `SPEC-MODAL-REDESIGN.md` in the project root directory. This is a spec to redesign the service modals from a stacked vertical layout to a side-by-side layout — large image on the left (60%), text/CTA on the right (40%). The modal should be wider (~1000px), images should use object-fit: contain (no cropping), and dots should be replaced with a "3 / 20" counter. Execute all changes, verify build and tests pass, and follow the git workflow (feature branch, do NOT merge to main). Write a summary to `tasks/todo.md` when complete.
```
