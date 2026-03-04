# SPEC: Sprint 2 Performance & Polish

## CONTEXT

The Google Font self-hosting fix was committed to feat/spacing-and-layout-polish after it was already merged to main. That commit needs to get to main. Additionally, several performance and polish tasks remain incomplete on the live production site (verified via browser inspection on Mar 2, 2026).

**Branch:** `feat/sprint-2-perf`

---

## TASK 0: Get Google Font Fix to Main

### Problem
The self-hosted Russo One font commit landed on feat/spacing-and-layout-polish after that branch was already merged to main. Production still loads Google Fonts (3 external requests to googleapis/gstatic). The commit with the fix needs to reach main.

### Approach
Check git status. If the font commit exists locally but not on main, cherry-pick it onto the new branch or re-apply the change. The change involves:
- File: `frontend/public/fonts/russo-one-v16-latin-regular.woff2` (self-hosted font file)
- File: `frontend/src/styles/global.css` (@font-face declaration with font-display: swap)
- File: `frontend/src/layouts/BaseLayout.astro` (removed Google Fonts link and preconnect hints)

If the font file already exists locally, just make sure these changes are on the new branch. If not, redo: download Russo One woff2 from Google Fonts API, save to public/fonts/, add @font-face to global.css, remove the Google Fonts `<link>` and preconnect `<link>` tags from BaseLayout.astro head.

### Verification
- `npm run build` passes
- Built HTML has NO references to fonts.googleapis.com or fonts.gstatic.com
- @font-face rule exists in built CSS
- Font file exists in build output

---

## TASK 1: Hero Image Responsive srcset

### Problem
Hero slideshow images (hero-1 through hero-6 in frontend/public/images/hero/) are full 1920x1080 WebP files (~300-370KB each). Mobile devices download these full-size images unnecessarily. No srcset exists on the live site (verified). PageSpeed flags this as ~543 KiB potential savings.

### Files
- `frontend/public/images/hero/` (source images)
- `frontend/src/components/landing/HeroFullWidth.tsx` (img elements)
- New: build script or manual generation of resized images

### Approach
1. Install sharp as a dev dependency if not present: `npm install -D sharp`
2. Create a script (e.g., `frontend/scripts/resize-hero-images.ts` or a simple node script) that reads each hero-*.webp and generates:
   - `hero-{n}-960w.webp` (960px wide)
   - `hero-{n}-480w.webp` (480px wide)
   - Keep originals as the 1920w version
3. Run the script to generate the resized images in `frontend/public/images/hero/`
4. Update `HeroFullWidth.tsx` img elements to include srcset and sizes:
   ```html
   <img
     src="/images/hero/hero-1.webp"
     srcset="/images/hero/hero-1-480w.webp 480w, /images/hero/hero-1-960w.webp 960w, /images/hero/hero-1.webp 1920w"
     sizes="100vw"
     ...
   />
   ```
5. First hero image keeps `fetchpriority="high"` and `loading="eager"`. Others keep `loading="lazy"`.

### Verification
- `npm run build` passes
- Resized images exist in public/images/hero/
- Built HTML contains srcset attributes on hero images
- All hero images still display correctly

---

## TASK 2: Materials Marquee Fade Masks

### Problem
The scrolling materials marquee has fade masks on left/right edges. Need to verify they are wide enough (60-80px minimum) so text fades smoothly and does not get hard-clipped.

### Files
- `frontend/src/components/landing/MaterialsMarquee.tsx`

### Approach
Check the gradient/mask CSS on the marquee container. Look for a CSS mask-image, or pseudo-elements (::before/::after), or gradient overlays. The fade should be at least 60-80px wide on each side. If shorter, increase it. Common patterns:
- `mask-image: linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)`
- Pseudo-elements with `w-16` or `w-20` (64px/80px)

If already 60px+, skip this task. If less, increase to 80px.

### Verification
- `npm run build` passes
- Visual: text fades smoothly at edges, no hard clip

---

## TASK 3: Stat Label Consistency

### Problem
Hero stats use different labels at different breakpoints. Mobile shows shortened versions like "PROJECTS / YR" and "OSHA Hours" while desktop shows "PROJECTS ANNUALLY" and "OSHA MAN-HOURS".

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`
- `frontend/src/content/site.ts` (may define stat data)

### Approach
Find where stat labels are defined. Look for conditional rendering based on breakpoint (e.g., hidden sm:block / sm:hidden patterns) or shortened label variants in the data. Make all labels use the full versions:
- "CLIENTS" (this one is fine)
- "PROJECTS ANNUALLY" (not "PROJECTS / YR")
- "OSHA MAN-HOURS" (not "OSHA Hours")

If the full labels overflow on mobile at 320-375px width, reduce the label text size (e.g., from text-xs to text-[10px]) rather than abbreviating.

### Verification
- `npm run build` passes
- Same label text at all breakpoints (check the rendered HTML)

---

## TASK 4: Delete Unused Components

### Problem
ValueProps.tsx and StatsBar.tsx in frontend/src/components/landing/ may be unused files from earlier development.

### Files
- `frontend/src/components/landing/ValueProps.tsx`
- `frontend/src/components/landing/StatsBar.tsx`

### Approach
1. Check if these files exist: `ls frontend/src/components/landing/ValueProps.tsx frontend/src/components/landing/StatsBar.tsx`
2. If they exist, grep the entire codebase for imports: `grep -r "ValueProps\|StatsBar" frontend/src/ --include="*.tsx" --include="*.astro" --include="*.ts"`
3. If NOT imported anywhere, delete them
4. If they DO NOT exist, skip this task entirely

### Verification
- `npm run build` passes
- No broken imports

---

## TASK 5: Defer Below-Fold JavaScript

### Problem
Components below the fold load their JavaScript immediately with client:load, increasing initial bundle size. PageSpeed reports ~58 KiB unused JS on initial load.

### Files
- `frontend/src/pages/index.astro`

### Approach
In index.astro, find all React island directives. Change below-fold components from `client:load` to `client:visible`:

**Keep as client:load (above the fold):**
- HeroFullWidth
- Services (partially visible on first scroll)

**Change to client:visible (below the fold):**
- About (if it uses client:load)
- MaterialsMarquee
- ProjectShowcase
- CTABanner
- ContactForm

Note: Some components may already be client:visible or may be Astro components (no client directive needed). Only change React islands that currently use client:load.

**Important:** The ContactForm MUST still work — test that changing to client:visible does not break form submission. If it causes issues, keep ContactForm as client:load.

### Verification
- `npm run build` passes
- Contact form still renders and is interactive when scrolled to
- No console errors
- Check built JS bundle sizes if possible

---

## EXECUTION ORDER

1. Task 0 — Google Font fix (get it on the branch)
2. Task 1 — Hero responsive images (biggest perf win)
3. Task 2 — Marquee fade masks (quick check)
4. Task 3 — Stat labels (quick fix)
5. Task 4 — Delete unused files (quick cleanup)
6. Task 5 — Defer below-fold JS (perf win)

---

## GIT WORKFLOW

```
Branch: feat/sprint-2-perf
Base: main (latest)

Commit each task separately:
  - "perf: self-host Russo One font, remove Google Fonts"
  - "perf: add responsive srcset to hero slideshow images"
  - "fix: widen materials marquee fade masks"
  - "fix: use consistent stat labels across all breakpoints"
  - "chore: delete unused ValueProps and StatsBar components"
  - "perf: defer below-fold component hydration with client:visible"

Do NOT merge to main. Push branch for review.
```

---

## DEFINITION OF DONE

- [ ] No Google Fonts external requests in built HTML
- [ ] Hero images have srcset with 480w, 960w, 1920w variants
- [ ] Materials marquee text fades smoothly at edges (60px+ masks)
- [ ] Stat labels identical at all breakpoints
- [ ] No unused component files (ValueProps, StatsBar)
- [ ] Below-fold components use client:visible
- [ ] `npm run build` passes with zero errors
- [ ] Contact form still works after client:visible change
- [ ] Write summary to tasks/todo.md
