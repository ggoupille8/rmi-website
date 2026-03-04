# SPEC: Performance & LCP Optimization

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

Mobile PageSpeed is 87 with LCP at 3.4s (target: <2.5s for green). The hero image is the LCP element. This spec targets the remaining LCP gap through image optimization, critical CSS inlining, and resource hint tuning. Desktop is already at 95.

**DO NOT MODIFY:** Any content text, layout structure, service modals, contact form logic, or analytics.

---

## TASK 1: Generate Responsive Hero Image Srcsets

### Problem
Hero images currently serve the full-resolution image to all devices. At 375px mobile, a 1920px-wide image is downloaded when a 480px version would suffice. The preload hint already has `imagesrcset` with 480w/960w/1920w breakpoints, but verify the actual `<source>` elements in the slideshow match.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`
- Possibly image generation script

### Approach
1. Verify that all hero `<picture>` elements have `<source>` with `srcset` containing 480w, 960w, and 1920w variants.
2. Verify the `sizes` attribute is `"100vw"` (since the hero is full-width).
3. If the responsive srcset images don't exist on disk (`hero-1-480w.webp`, `hero-1-960w.webp`), create a build script that generates them from the source images using `sharp`:
   ```bash
   npm install sharp --save-dev
   ```
   Then create `scripts/generate-hero-images.js` that reads each hero image and outputs 480w, 960w, and 1920w WebP variants.
4. Run the script to generate all variant images.
5. Update the hero component to use the responsive srcsets.

### Verification
- `npm run build` passes.
- Each hero image `<source>` has `srcset` with 480w, 960w, 1920w variants.
- The variant image files exist in `frontend/public/images/hero/`.
- The preload `<link>` in the `<head>` has matching `imagesrcset` values.

---

## TASK 2: Inline Critical CSS

### Problem
The browser must download the full CSS file before rendering the above-fold content. Inlining the critical CSS (styles needed for the hero section) eliminates this render-blocking step.

### Files
- `frontend/astro.config.mjs`

### Approach
1. Check if Astro's built-in CSS inlining is already enabled. In Astro 4, CSS is typically inlined in `<head>` by default for small stylesheets.
2. If the site uses an external CSS file (check the `<link rel="stylesheet">` tags), verify its size. If it's under 50KB, Astro likely already inlines it.
3. If there IS a render-blocking external stylesheet, enable Astro's `inlineStylesheets: 'auto'` option in `astro.config.mjs`:
   ```js
   export default defineConfig({
     build: {
       inlineStylesheets: 'auto' // inlines stylesheets under 4KB
     }
   });
   ```
4. Alternatively, if the stylesheet is large, set `inlineStylesheets: 'always'` to inline everything (since this is a single-page site, total CSS should be manageable).

### Verification
- `npm run build` passes.
- View the built HTML source — CSS should be inlined in `<style>` tags, not loaded via `<link rel="stylesheet">`.
- No render-blocking CSS resources in the `<head>`.

---

## TASK 3: Optimize CTA/Contact Background Image

### Problem
The shared CTA/Contact background image (`cta-project.jpeg`) is a 3024×4032 portrait photo. On desktop it renders at ~1536×800 at most. The image is likely several hundred KB more than needed. Generate a properly sized variant.

### Files
- `frontend/public/images/cta/`
- Image processing script

### Approach
1. Check the current file size of `cta-project.jpeg` and `cta-project.webp`.
2. If either is over 200KB, generate optimized versions:
   - WebP at 1920px wide, quality 75: `cta-project-1920w.webp`
   - WebP at 960px wide, quality 75: `cta-project-960w.webp` (for mobile)
3. Update the `<picture>` element that serves this image to use responsive srcset:
   ```html
   <source srcset="/images/cta/cta-project-960w.webp 960w, /images/cta/cta-project-1920w.webp 1920w" 
           sizes="100vw" type="image/webp">
   ```
4. Add `loading="lazy"` (should already be present since it's below the fold).

### Verification
- `npm run build` passes.
- Optimized image variants exist and are smaller than the originals.
- The `<picture>` element uses responsive srcset.

---

## TASK 4: Add Resource Hints for Google Fonts (if any)

### Problem
Check if the site loads any external fonts. If Google Fonts or any external font CDN is used, ensure proper preconnect hints exist. If fonts are self-hosted (which they should be per earlier sprint), verify they use `font-display: swap` to prevent FOIT (Flash of Invisible Text).

### Files
- `frontend/src/layouts/BaseLayout.astro`
- `frontend/src/styles/` or wherever fonts are defined

### Approach
1. Check for any `@font-face` declarations in the CSS. Verify they include `font-display: swap`.
2. Check for any external font loading (`<link>` to fonts.googleapis.com or similar). If found, add preconnect.
3. If fonts are self-hosted, verify the font files are in the `public/fonts/` directory and served with proper cache headers (Vercel handles this automatically for static assets).

### Verification
- `npm run build` passes.
- All `@font-face` declarations include `font-display: swap`.
- No external font requests without preconnect hints.

---

## TASK 5: Add Explicit Width/Height to All Images

### Problem
Images without explicit `width` and `height` attributes cause layout shift (CLS) as the browser doesn't know their dimensions until loaded. Check all `<img>` tags and ensure they have width/height set.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`
- `frontend/src/components/landing/ProjectShowcase.tsx`
- `frontend/src/components/landing/Services.tsx` (modal images)
- Any other component with `<img>` tags

### Approach
1. Find all `<img>` tags across components.
2. For images with known dimensions, add explicit `width` and `height` attributes.
3. For responsive images that use CSS sizing (like `object-cover` with `w-full`), the width/height attributes should match the intrinsic image dimensions (or an appropriate aspect ratio) — the CSS will still control display size, but the browser uses the attributes to reserve space.
4. Hero images: `width={1920} height={1280}` (or actual dimensions).
5. Project images: `width={800} height={600}` (4:3 aspect ratio).
6. The CTA background: `width={3024} height={4032}` (actual dimensions from the audit).

### Verification
- `npm run build` passes.
- All `<img>` tags have explicit `width` and `height` attributes.
- CLS score remains low (≤0.01).

---

## EXECUTION ORDER
1. Task 4 (font check — quick audit)
2. Task 5 (width/height — attribute additions)
3. Task 2 (inline CSS — config change)
4. Task 3 (CTA image optimization)
5. Task 1 (hero srcsets — most complex)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b fix/perf-lcp-optimization`
3. Make all changes, `npm run build`, `npm run test`
4. Update visual baselines if needed: `npm run test:visual:update`
5. `git add . && git commit -m "perf: LCP optimization — responsive hero images, inline CSS, image dimensions"`
6. `git push origin fix/perf-lcp-optimization`
7. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] Hero images have responsive srcset with 480w/960w/1920w variants
- [ ] Hero variant image files exist on disk
- [ ] CSS is inlined (no render-blocking stylesheet)
- [ ] CTA background image has optimized responsive variants
- [ ] All @font-face have font-display: swap
- [ ] All <img> tags have width and height attributes
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
