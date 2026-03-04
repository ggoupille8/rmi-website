# SPEC: Performance & Polish Batch

## CONTEXT

Production site at rmi-llc.net. Astro 4 + React 18 frontend in `frontend/`. This spec covers performance wins from PageSpeed audit (mobile score: 77) and remaining polish items verified against the live HTML source on Mar 2, 2026. Branch: `feat/perf-polish-batch`.

---

## TASK 1: Self-Host Google Font

### Problem
Google Fonts "Russo One" causes a 750ms render-blocking request on mobile. Three external requests to fonts.googleapis.com and fonts.gstatic.com.

### Files
- `frontend/src/layouts/BaseLayout.astro` (remove Google Fonts `<link>` tags and preconnect hints)
- `frontend/src/styles/global.css` (add @font-face)
- New: `frontend/public/fonts/` directory

### Approach
1. Download Russo One woff2 from Google Fonts API (or use: `https://fonts.gstatic.com/s/russoone/v16/Z9XUDmZRWg6M1LvRYsHOz8mJvLuL9A.woff2`)
2. Save to `frontend/public/fonts/russo-one-latin.woff2`
3. Add to global.css:
```css
@font-face {
  font-family: 'Russo One';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/russo-one-latin.woff2') format('woff2');
}
```
4. In BaseLayout.astro `<head>`, remove ALL lines referencing fonts.googleapis.com and fonts.gstatic.com (both preconnect and stylesheet links)

### Verification
- `npm run build` zero errors
- `grep -r "googleapis\|gstatic" frontend/dist/` returns nothing
- Font file in build output

---

## TASK 2: Hero Image Responsive srcset

### Problem
6 hero images (hero-1.webp through hero-6.webp) are 1920x1080 (~300-370KB each). Mobile downloads full-size. PageSpeed flags 543 KiB potential savings.

### Files
- `frontend/public/images/hero/` (source images)
- `frontend/src/components/landing/HeroFullWidth.tsx` (img elements)

### Approach
1. Install sharp as dev dependency: `npm install -D sharp`
2. Create script `frontend/scripts/resize-heroes.mjs`:
```js
import sharp from 'sharp';
import { readdirSync } from 'fs';
import { join } from 'path';

const dir = 'public/images/hero';
const files = readdirSync(dir).filter(f => f.match(/^hero-\d+\.webp$/));

for (const file of files) {
  const base = file.replace('.webp', '');
  const input = join(dir, file);
  await sharp(input).resize(960).webp({ quality: 80 }).toFile(join(dir, `${base}-960w.webp`));
  await sharp(input).resize(480).webp({ quality: 75 }).toFile(join(dir, `${base}-480w.webp`));
  console.log(`Resized: ${file}`);
}
```
3. Run: `cd frontend && node scripts/resize-heroes.mjs`
4. Update HeroFullWidth.tsx — wherever hero img elements are rendered, add srcset and sizes:
```tsx
srcSet={`/images/hero/${img}-480w.webp 480w, /images/hero/${img}-960w.webp 960w, /images/hero/${img}.webp 1920w`}
sizes="100vw"
```
5. First image keeps `fetchPriority="high"` and `loading="eager"`. Others keep `loading="lazy"`.

### Verification
- `npm run build` zero errors
- Resized images exist (12 new files: 6x 960w + 6x 480w)
- Built HTML contains srcset attributes

---

## TASK 3: Convert Project Images to WebP

### Problem
Project showcase images serve .jpg instead of .webp. The `<picture>` elements may not be working or the HTML is referencing .jpg directly. Live HTML shows: henry-ford-hospital.jpg, michigan-central-station.jpg, ford-hub-dearborn.jpg.

### Files
- `frontend/src/components/landing/ProjectShowcase.tsx`
- `frontend/src/content/site.ts` (if image paths defined here)

### Approach
1. Check if .webp versions already exist in `frontend/public/images/projects/`
2. If they exist, update ProjectShowcase.tsx to use `<picture>` with WebP source and JPG fallback, OR simply change the img src to .webp
3. If .webp versions don't exist, generate them from the .jpg files using sharp
4. Ensure the CTA banner image (`/images/cta/cta-project.jpeg`) also has a .webp version and is served as WebP

### Verification
- `npm run build` zero errors
- Built HTML references .webp for project images
- Images still display correctly

---

## TASK 4: Stat Label Consistency

### Problem
Hero stats render two label variants and toggle visibility by breakpoint. The HTML contains both "Projects AnnuallyProjects / Yr" and "OSHA Man-HoursOSHA Hours" with one hidden at each breakpoint. This is unnecessary complexity.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`

### Approach
1. Find the stat label rendering — look for conditional/responsive label elements (likely `hidden sm:block` / `sm:hidden` patterns)
2. Remove the short-label variants entirely
3. Use only: "CLIENTS", "PROJECTS ANNUALLY", "OSHA MAN-HOURS" at all breakpoints
4. If "PROJECTS ANNUALLY" overflows at 320px, reduce label font size (e.g., `text-[10px]`) rather than abbreviating

### Verification
- `npm run build` zero errors
- Only one label per stat in rendered HTML (no hidden duplicates)

---

## TASK 5: Defer Below-Fold JS

### Problem
All React islands may use client:load, forcing full JS download on page load. Below-fold components don't need immediate hydration.

### Files
- `frontend/src/pages/index.astro`

### Approach
1. Check current client directives on all React components in index.astro
2. Components that should stay `client:load` (above fold): HeroFullWidth
3. Change to `client:visible` (below fold): MaterialsMarquee, ProjectShowcase, CTABanner, ContactForm
4. Services and About — use `client:visible` if they're React islands
5. **Test that ContactForm still works** after changing to client:visible — it must hydrate and submit properly when scrolled into view

### Verification
- `npm run build` zero errors
- Contact form still submits (test with curl or check the component renders)
- Check that index.astro uses client:visible for below-fold components

---

## TASK 6: Add Preload for LCP Hero Image

### Problem
The hero background is the LCP element. Preloading it gives the browser an early hint to start downloading.

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
1. Add to `<head>` section:
```html
<link rel="preload" as="image" type="image/webp" href="/images/hero/hero-1.webp" fetchpriority="high" />
```
2. If Task 2 (srcset) is done, use the largest image path OR add imagesrcset/imagesizes to the preload:
```html
<link rel="preload" as="image" type="image/webp" 
  imagesrcset="/images/hero/hero-1-480w.webp 480w, /images/hero/hero-1-960w.webp 960w, /images/hero/hero-1.webp 1920w"
  imagesizes="100vw" fetchpriority="high" />
```
3. Verify the hero's first img has `fetchPriority="high"` and `loading="eager"` (NOT lazy)

### Verification
- `npm run build` zero errors
- Built HTML has preload link in head

---

## TASK 7: Delete Unused Components

### Problem
ValueProps.tsx and StatsBar.tsx may still exist as dead files.

### Files
- `frontend/src/components/landing/ValueProps.tsx`
- `frontend/src/components/landing/StatsBar.tsx`

### Approach
1. `ls frontend/src/components/landing/ValueProps.tsx frontend/src/components/landing/StatsBar.tsx 2>/dev/null`
2. If they exist: `grep -r "ValueProps\|StatsBar" frontend/src/ --include="*.tsx" --include="*.astro" --include="*.ts"`
3. If not imported → delete them
4. If they don't exist → skip, no commit needed

### Verification
- `npm run build` zero errors

---

## EXECUTION ORDER

1. Task 1 — Self-host font (removes render-blocking request)
2. Task 6 — Preload LCP image (quick head tag addition)
3. Task 2 — Hero responsive images (biggest bandwidth savings)
4. Task 3 — Project images to WebP
5. Task 4 — Stat label cleanup
6. Task 5 — Defer below-fold JS
7. Task 7 — Delete unused files

---

## GIT WORKFLOW

```
git checkout main && git pull
git checkout -b feat/perf-polish-batch

# Commit each task separately with descriptive messages
# Do NOT merge to main
# Push branch when all tasks complete:
git push -u origin feat/perf-polish-batch
```

---

## DEFINITION OF DONE

- [ ] Zero Google Fonts external requests in built HTML
- [ ] Hero images have srcset (480w, 960w, 1920w)
- [ ] Project images served as WebP
- [ ] Single stat label per stat (no hidden duplicates)
- [ ] Below-fold components use client:visible
- [ ] LCP image preloaded in head
- [ ] Unused component files deleted
- [ ] `npm run build` passes with zero errors
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Contact form still functional after client:visible change
- [ ] Summary written to tasks/todo.md
