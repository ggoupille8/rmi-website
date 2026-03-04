# CLAUDE CODE PROMPT
# Save this file to your project root as SPEC-POLISH-R3.md, then paste:
#
# Read the file `SPEC-POLISH-R3.md` in the project root. This is a 4-task surgical fix spec. The marquee mask MUST use percentage-based stops — not pixel clamp. The previous two attempts used clamp() and both failed. Read the approach carefully. Execute in order, commit each separately, branch fix/polish-r3, do NOT merge to main.
#

# SPEC: Polish Round 3 — Surgical Fixes

## CONTEXT

Production verification of fix/polish-r2 on Feb 27, 2026. Most items confirmed working. Four issues remain:

### Confirmed WORKING in production:
- ✅ Form autocomplete (all 7 fields verified in DOM)
- ✅ Service card aria-label (9 buttons) + aria-haspopup="dialog"
- ✅ Navbar logo optimized (200x113, was 1920x1080)
- ✅ Focus-visible CSS rules present
- ✅ ErrorBoundary on React islands
- ✅ Hero image fetchpriority="high" + loading="eager"
- ✅ Project images loading and rendering correctly (all 3 cards)
- ✅ 233/233 E2E tests passing

### Still broken:
- ❌ Marquee mask still uses pixel clamp — text readable at edges
- ⚠️ Two images missing width/height attributes (rmi-logo-full.png, cta-project.jpeg)
- ⚠️ Hero logo in navbar uses `rmi-logo-mark-200.png` — good. But hero section uses `rmi-logo-full.png` (500x200, no width/height) — needs CLS fix

---

## TASK 1: Marquee Fade Mask — USE PERCENTAGE STOPS (4th and FINAL attempt)

### Problem
The previous THREE attempts all used pixel-based or clamp-based values:
- Attempt 1: `clamp(60px, 10vw, 120px)` → 120px, text visible
- Attempt 2: `clamp(100px, 20vw, 250px)` → 152px, text visible
- Attempt 3: Same clamp approach → 250px, text STILL visible

Material chip labels range from 100px ("Phenolic") to 380px ("Acoustic Control (Mass Loaded Vinyl, Lead-Free)"). No fixed pixel value will work because the longest chip will always overflow the fade zone.

### Why pixels keep failing
At 1094px viewport with 250px mask: the fade covers 23% of the width on each side. But the chip "Acoustic Control (Mass Loaded Vinyl, Lead-Free)" is ~380px — it overflows the fade zone by 130px of readable text.

### Files
- `frontend/src/components/landing/MaterialsMarquee.tsx`

### Approach — PERCENTAGE STOPS, NOT CLAMP

Find the inline style on the div wrapping `.service-ticker` (the one with `className="relative overflow-hidden"`). Replace the ENTIRE mask value with:

```tsx
style={{
  maskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 75%, transparent 100%)'
}}
```

**This is percentage-based.** 25% of viewport on each side fades to transparent. At ANY viewport width, the fade zone scales proportionally. At 375px mobile: 94px fade. At 1094px tablet: 274px fade. At 1440px desktop: 360px fade. The visible center is always 50% of the width — still plenty of chips visible.

**DO NOT use clamp(). DO NOT use pixel values. DO NOT use vw units. Use only percentage stops.**

### What NOT to Change
- Marquee scroll animation, speed, direction, or chip content
- The overflow-hidden on the container

### Verification
After build, open the page at any viewport width. Check the left and right edges of the marquee. If you can read ANY text at the very edge of the container, the fix is wrong. The text should be fully transparent by the time it reaches the boundary.

Verify the inline style contains ONLY percentage values like `25%` and `75%` — not `clamp`, not `px`, not `vw`.

### Commit
`fix: marquee fade mask with percentage stops (final)`

---

## TASK 2: Add width/height to Remaining Images Missing Dimensions

### Problem
Two images lack explicit width/height attributes, causing potential CLS (Cumulative Layout Shift):
1. `rmi-logo-full.png` (the RMI logo in the hero section, 500x200 natural)
2. `cta-project.jpeg` (the CTA banner background, 3024x natural)

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx` (contains rmi-logo-full.png)
- `frontend/src/components/landing/CTABanner.tsx` (contains cta-project.jpeg)

### Approach
1. Find the `<img>` tag for `rmi-logo-full.png` in HeroFullWidth.tsx. Add `width={500}` and `height={200}` (its natural dimensions). These set the aspect ratio for the browser to reserve space.
2. Find the `<img>` tag for `cta-project.jpeg` in CTABanner.tsx. Check its natural dimensions first:
   ```bash
   identify frontend/public/images/cta/cta-project.jpeg
   # or
   node -e "const sharp = require('sharp'); sharp('frontend/public/images/cta/cta-project.jpeg').metadata().then(m => console.log(m.width, m.height))"
   ```
   Add the matching `width` and `height` attributes.
3. Both images likely use `object-fit: cover` so the dimensions won't affect visual rendering — they only reserve aspect-ratio space for CLS prevention.

### What NOT to Change
- Do not change image visual appearance, sizing, or positioning.
- Do not change object-fit or other CSS properties.

### Verification
```js
[...document.querySelectorAll('img')].filter(i => !i.getAttribute('width') && !i.getAttribute('height')).map(i => i.src?.split('/').pop())
// Expected: [] (empty array — all images have dimensions)
```

### Commit
`perf: add width/height to remaining images for CLS prevention`

---

## TASK 3: Fix 2 Firefox Visual Regression Flakes

### Problem
2 of 18 visual regression tests are flaking on Firefox. These are likely timing-related (animation state captured at different frames). Stabilize them.

### Files
- `frontend/tests/visual/` (whichever test files are flaking)

### Approach
1. Run the visual tests to identify which 2 are flaking: `npx playwright test tests/visual/ --project=firefox`
2. Common causes of Firefox flakes:
   - Hero slideshow captured mid-transition → add `await page.waitForTimeout(1000)` before screenshot
   - Marquee animation position varies → pause the animation before screenshot:
     ```ts
     await page.evaluate(() => {
       document.querySelectorAll('.service-ticker__track').forEach(el => {
         (el as HTMLElement).style.animationPlayState = 'paused';
       });
     });
     ```
   - Font rendering differences → increase threshold in `expect(screenshot).toMatchSnapshot({ threshold: 0.3 })`
3. If the flakes are truly non-deterministic (animation timing), the most robust fix is to pause all animations before taking the screenshot.
4. Update baselines after fixing: `npm run test:visual:update`

### What NOT to Change
- Do not delete visual regression tests.
- Do not increase threshold above 0.35 (defeats the purpose of visual testing).

### Verification
- Run `npx playwright test tests/visual/ --project=firefox` three times in a row
- All 18 should pass all 3 times

### Commit
`test: stabilize Firefox visual regression tests`

---

## TASK 4: Add Google Analytics Script (GA4)

### Problem
The GA4 measurement ID is G-7CW99VN6T3 but the tracking script has never been added to the site. The site has been live for 10 days with zero analytics data being collected.

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
Add the Google Analytics 4 gtag.js snippet to the `<head>` of BaseLayout.astro, AFTER the existing meta tags but BEFORE any other scripts:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-7CW99VN6T3"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-7CW99VN6T3');
</script>
```

Also add a preconnect hint for the Google Analytics domain (if not already present):
```html
<link rel="preconnect" href="https://www.googletagmanager.com" />
```

### What NOT to Change
- Do not add Google Tag Manager (GTM) — this is GA4 only.
- Do not add any cookie consent banner (not required for GA4 in the US for B2B sites).
- Do not add the analytics ID to environment variables — it's a public measurement ID, not a secret.

### Verification
1. `npm run build` passes
2. View page source — the gtag.js script tag is present in `<head>`
3. Open browser DevTools Network tab — `gtag/js?id=G-7CW99VN6T3` loads successfully
4. Open browser Console — no errors from GA script

### Commit
`feat: add Google Analytics 4 tracking (G-7CW99VN6T3)`

---

## EXECUTION ORDER

1. **Task 1** — Marquee percentage mask (CSS, must get right this time)
2. **Task 2** — Image width/height (HTML attrs, quick)
3. **Task 4** — GA4 script (HTML, quick)
4. **Task 3** — Firefox test flakes (test investigation)

---

## GIT WORKFLOW

```bash
git checkout main
git pull origin main
git checkout -b fix/polish-r3

# Commit each task separately
git push origin fix/polish-r3

# Do NOT merge to main
```

---

## CRITICAL NOTES

1. **MARQUEE: USE PERCENTAGES.** The value must be `transparent 0%, black 25%, black 75%, transparent 100%`. If the committed code contains `clamp(`, `px`, or `vw` in the mask-image value, the task has failed. Check the actual committed code before marking done.

2. **Verify changes in the DOM, not just source.** Build the project and check the rendered HTML to confirm attributes are present.

---

## DEFINITION OF DONE

- [ ] Marquee mask uses PERCENTAGE stops (25%/75%) — zero pixel or clamp values
- [ ] Zero images missing width/height attributes
- [ ] GA4 script present in page `<head>`
- [ ] Firefox visual tests pass 3x in a row
- [ ] `npm run build` — zero errors
- [ ] All on `fix/polish-r3` branch
- [ ] NOT merged to main
