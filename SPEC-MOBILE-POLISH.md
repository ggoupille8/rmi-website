# SPEC: Mobile Polish & Remaining Fixes

**Spec Version:** 1.0
**Date:** March 4, 2026
**Author:** Senior Developer Audit (Chrome Claude)
**Execution:** Claude Code autonomous — read this file, execute all tasks in order, verify each before marking complete.

---

## CONTEXT

The landing page at rmi-llc.net has been through 5 sprint cycles and is in strong shape at desktop. This spec addresses remaining issues found during the March 4 audit, focused on mobile polish, accessibility, and performance fixes. The Ford World Headquarters naming has already been corrected. Analytics (GA4 + Vercel) are active. All prior sprint work is merged and deployed.

**DO NOT MODIFY:** Hero overlay gradient, project card content, service card layout/tier styling, analytics scripts, contact form functionality, or any content copy unless explicitly specified below.

---

## TASK 1: Fix Hero Image Preload Link (Performance)

### Problem
The hero LCP preload link has `href=""` (empty string) in the deployed HTML. The `imagesrcset` attribute is correct (`/images/hero/hero-1-480w.webp 480w, /images/hero/hero-1-960w.webp 960w, /images/hero/hero-1.webp 1920w`) but the empty `href` means some browsers may not initiate the preload correctly.

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
1. Find the `<link rel="preload" as="image"` tag that has the hero `imagesrcset`.
2. Set `href="/images/hero/hero-1.webp"` as a fallback for browsers that don't support `imagesrcset` on preload links.
3. Verify the `imagesrcset` and `imagesizes` attributes remain intact.

### Verification
- `npm run build` passes.
- Grep the built HTML for `rel="preload"` — the hero preload link should have both a non-empty `href` AND the `imagesrcset` attribute.

---

## TASK 2: Add "Contact" to Footer Quick Links

### Problem
Footer Quick Links currently shows: Services, About, Projects, Request a Quote. There is no standalone "Contact" link. Users scrolling the footer expect to find a "Contact" entry.

### Files
- `frontend/src/components/landing/Footer.tsx`

### Approach
1. In the Quick Links list, add a "Contact" link with `href="#contact"` between "Projects" and "Request a Quote".
2. Match the existing link styling exactly.

### Verification
- Visual inspection: footer Quick Links shows 5 items (Services, About, Projects, Contact, Request a Quote).
- `npm run build` passes.

---

## TASK 3: Add favicon.ico Fallback

### Problem
The site only has `favicon.svg` and `apple-touch-icon.png`. Some browsers (particularly older ones and some bookmark/tab preview systems) still request `/favicon.ico`. Without it, the server returns a 404 for every page load.

### Files
- `frontend/public/` (new file: `favicon.ico`)
- `frontend/src/layouts/BaseLayout.astro` (add fallback link)

### Approach
1. Use ImageMagick or sharp to convert `frontend/public/apple-touch-icon.png` to a 32x32 `favicon.ico`:
   ```bash
   cd frontend/public
   npx sharp-cli --input apple-touch-icon.png --output favicon.ico resize 32 32
   ```
   If sharp-cli isn't available, use: `convert apple-touch-icon.png -resize 32x32 favicon.ico` (ImageMagick).
   If neither works, use Node.js with sharp:
   ```js
   const sharp = require('sharp');
   sharp('frontend/public/apple-touch-icon.png').resize(32, 32).toFile('frontend/public/favicon.ico');
   ```
2. In `BaseLayout.astro`, add a fallback link BEFORE the SVG favicon link:
   ```html
   <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="32x32" />
   ```

### Verification
- `favicon.ico` exists in `frontend/public/` and is approximately 32x32px.
- `npm run build` passes.
- The built HTML contains both the `.ico` and `.svg` favicon links.

---

## TASK 4: Add Preconnect for Google Analytics Domain

### Problem
Only one preconnect hint exists (`https://www.googletagmanager.com`). The GA4 script also loads resources from `https://www.google-analytics.com`. Adding a preconnect hint saves ~100-200ms on the analytics connection setup.

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
1. Find the existing `<link rel="preconnect" href="https://www.googletagmanager.com">`.
2. Add a second preconnect immediately after it:
   ```html
   <link rel="preconnect" href="https://www.google-analytics.com" />
   ```

### Verification
- `npm run build` passes.
- Grep built HTML for both preconnect domains.

---

## TASK 5: Logo in `<picture>` Element with WebP

### Problem
The navbar logo (`rmi-logo-mark-200.png`) is one of the last unoptimized images — it's served as PNG only, without a WebP option or `<picture>` element. It loads on every page and is in the critical rendering path.

### Files
- `frontend/public/images/logo/` (generate WebP version)
- `frontend/src/components/landing/Navbar.astro` (update to `<picture>`)

### Approach
1. Convert the logo to WebP:
   ```bash
   cd frontend/public/images/logo
   npx sharp-cli --input rmi-logo-mark-200.png --output rmi-logo-mark-200.webp
   ```
   Or use Node.js with sharp.
2. Also convert `rmi-logo-full.png` to WebP (it's preloaded in the head):
   ```bash
   npx sharp-cli --input rmi-logo-full.png --output rmi-logo-full.webp
   ```
3. In `Navbar.astro`, wrap the logo `<img>` in a `<picture>` element:
   ```html
   <picture>
     <source srcset="/images/logo/rmi-logo-mark-200.webp" type="image/webp" />
     <img
       id="navbar-logo"
       src="/images/logo/rmi-logo-mark-200.png"
       alt="Resource Mechanical Insulation logo"
       class="h-12 w-auto brightness-0 invert"
     />
   </picture>
   ```
4. Update the logo preload link in `BaseLayout.astro` to use the WebP version:
   ```html
   <link rel="preload" as="image" type="image/webp" href="/images/logo/rmi-logo-mark-200.webp" />
   ```

### Verification
- Both `.webp` logo files exist in `frontend/public/images/logo/`.
- `npm run build` passes.
- The navbar logo renders correctly (visually unchanged).

---

## TASK 6: Service Card Touch Targets on Mobile

### Problem
At 375px viewport, each service card is a clickable element (cursor-pointer, opens modal). The cards have `min-h-[56px]` which meets the 44px minimum, but the card text at mobile is `text-sm` (14px). On real devices, the small text combined with the full-width card can make it unclear that cards are tappable. The chevron arrow (">") on the right side is the only visual affordance.

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. Add a subtle hover/active state that works on touch: add `active:bg-neutral-700/50` to each service card's class list so tapping gives immediate visual feedback.
2. Ensure the chevron arrow has `aria-hidden="true"` (it's decorative — the card itself is the interactive element).
3. Add `role="button"` and `tabIndex={0}` to each card if not already present, plus a keyboard handler for Enter/Space to open the modal.

### Verification
- `npm run build` passes.
- Each service card has `active:bg-neutral-700/50` in its class list.
- Cards are keyboard-accessible (role="button", tabIndex={0}).

---

## TASK 7: Materials Marquee Accessibility

### Problem
The materials marquee has two visual ticker tracks (decorative, auto-scrolling) AND one sr-only accessible list. Screen readers currently read the material list 3 times because the visual ticker tracks aren't hidden from assistive technology.

### Files
- `frontend/src/components/landing/MaterialsMarquee.tsx`

### Approach
1. Add `aria-hidden="true"` to the container wrapping the two visual ticker tracks (the animated rows).
2. Verify the sr-only accessible list does NOT have `aria-hidden`.
3. Add `role="region"` and `aria-label="Materials we work with"` to the section element.

### Verification
- `npm run build` passes.
- The visual ticker containers have `aria-hidden="true"`.
- The sr-only list does NOT have `aria-hidden`.

---

## TASK 8: Contact Form Mobile Grid Stacking

### Problem
At desktop, the contact form shows Name/Company and Email/Phone in 2-column grids. On mobile, these already stack to single column via `grid-cols-1 sm:grid-cols-2`. However, verify the form inputs have sufficient height (minimum 48px touch target) and that labels are clearly associated with inputs.

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
1. Verify each `<input>` and `<select>` has `min-h-[48px]` or equivalent padding that results in at least 48px height.
2. Verify each input has an associated `<label>` with matching `htmlFor`/`id` attributes.
3. If any input is missing `min-h-[48px]`, add it. If any label association is broken, fix it.
4. This is a VERIFICATION task — only make changes if issues are found.

### Verification
- All form inputs render at >= 48px height at 375px viewport.
- All labels have correct `htmlFor` pointing to matching input `id`.
- `npm run build` passes.

---

## EXECUTION ORDER

1. **Task 1** (hero preload) — performance, no dependencies
2. **Task 4** (preconnect) — performance, same file as Task 1, do together
3. **Task 3** (favicon) — performance, independent
4. **Task 5** (logo WebP) — performance, independent
5. **Task 2** (footer contact link) — UI, independent
6. **Task 6** (service card touch) — accessibility, independent
7. **Task 7** (marquee accessibility) — accessibility, independent
8. **Task 8** (form verification) — verification pass, do last

---

## GIT WORKFLOW

1. Ensure you're on `main` and it's up to date: `git checkout main && git pull origin main`
2. Create feature branch: `git checkout -b fix/mobile-polish-march4`
3. Make all changes
4. Run `npm run build` — must pass with zero errors
5. Run tests if available: `npm run test` or `npx playwright test`
6. Update visual baselines if needed: `npm run test:visual:update`
7. Commit: `git add . && git commit -m "fix: mobile polish — preload, favicon, logo WebP, footer link, touch targets, a11y"`
8. **Do NOT merge to main.** Push branch and leave for Graham to review.

---

## DEFINITION OF DONE

- [ ] Hero preload link has non-empty `href="/images/hero/hero-1.webp"`
- [ ] Footer Quick Links includes "Contact" (5 items total)
- [ ] `favicon.ico` exists at 32x32
- [ ] Preconnect to `google-analytics.com` added
- [ ] Logo images converted to WebP with `<picture>` fallback
- [ ] Service cards have `active:` touch feedback and keyboard accessibility
- [ ] Marquee visual tracks have `aria-hidden="true"`
- [ ] Contact form inputs verified at >= 48px height
- [ ] `npm run build` passes with zero errors
- [ ] Feature branch created, committed, NOT merged to main
- [ ] Summary written to `tasks/todo.md`
