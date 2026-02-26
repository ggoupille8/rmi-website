# SPRINT-1: High Impact Fixes

**Spec Version:** 1.0  
**Date:** February 26, 2026  
**Author:** Senior Developer Audit  
**Execution:** Claude Code autonomous — read this file, execute all tasks in order, verify each before marking complete.

---

## CONTEXT

This spec addresses the highest-priority issues identified during a mobile UI audit of the RMI landing page at `rmi-llc.net`. Each task includes the problem, the exact files to modify, the technical approach, and verification criteria. Do NOT change any content that isn't specified here. Minimal impact principle applies — touch only what's necessary.

**Primary domain is `rmi-llc.net`.** If any references to `resourcemechanicalinsulation.com` exist in code, canonical URLs, JSON-LD, meta tags, or sitemap config, they should be updated to `rmi-llc.net`. Scan for this as part of Task 6.

---

## TASK 1: Hero Image Overlay — Too Dark

### Problem
The hero section has a dark overlay that crushes the detail in the background photos. The images (outdoor rooftop pipes, dramatic skies, insulation work) are being muted so heavily that the subject matter — the actual insulation work RMI does — is barely visible. The hero is the first impression; it needs vibrancy.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`

### Approach
1. Locate the overlay element — likely an absolutely-positioned div with a dark background color/opacity, or a CSS gradient, or an `::after` pseudo-element on the hero container.
2. The current overlay is probably in the range of `bg-black/60` to `bg-black/70` (or equivalent rgba). It needs to come down.
3. **Replace** the uniform dark overlay with a **gradient overlay** that preserves text legibility at top and bottom while letting the middle of the image breathe:
   - Top: darker (for navbar/logo legibility) — approximately `rgba(0, 0, 0, 0.7)`
   - Middle: lighter — approximately `rgba(0, 0, 0, 0.3)` to `rgba(0, 0, 0, 0.35)`
   - Bottom: darker again (for stats legibility) — approximately `rgba(0, 0, 0, 0.65)`
4. Use a CSS `background: linear-gradient(to bottom, ...)` on the overlay element instead of a flat background-color/opacity.
5. If there are multiple hero images in a slideshow/carousel, ensure the overlay applies consistently across all slides.

### Verification
- Run `npm run build` — no errors
- Visually inspect the hero on mobile viewport (375px width) and desktop (1440px) — the middle portion of the hero image should show noticeably more detail than before
- Text (logo, tagline, stats) must still be clearly legible against all hero images
- If Playwright visual tests exist for the hero, update baselines

---

## TASK 2: Hero Dead Space Gap Below Stats

### Problem
There is a visible charcoal/dark dead zone between the stats row at the bottom of the hero and the start of the Services section. This appears to be either:
- Excess bottom padding on the hero container
- A min-height that's too large for the viewport
- Margin between hero and the next section
- Or a combination

On mobile (iPhone viewport), this gap is approximately 80-120px of empty dark space with no content — it looks unintentional and broken.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx` (hero container styles)
- Possibly `frontend/src/pages/index.astro` (if there's spacing between components)

### Approach
1. Inspect the hero container's height-related styles: look for `min-h-screen`, `min-h-[value]`, `h-screen`, explicit pixel heights, or padding-bottom values.
2. The hero should be sized to fit its content (logo + tagline + CTA + icons + stats) with reasonable padding, NOT forced to fill a minimum height that leaves dead space on taller-content viewports.
3. **If using `min-h-screen`:** Replace with a content-driven approach. Consider `min-h-[85vh]` or `min-h-[90vh]` as a starting point, or remove the min-height entirely and let content + padding determine the height.
4. **Check for bottom padding/margin:** If there's excessive `pb-` or `mb-` on the hero or top `pt-`/`mt-` on the Services section, reduce it. The gap between hero bottom and Services heading should be consistent with other section transitions on the page (likely 48-80px total, not 120+).
5. Also tighten the internal vertical spacing between the CTA button → phone/email icons → stats row. These three elements should feel like a cohesive unit at the bottom of the hero, not three separate floating elements with large gaps.

### Verification
- Run `npm run build` — no errors
- Check at viewports: 375px, 414px, 768px, 1024px, 1440px
- The transition from hero to Services should feel intentional, with no "empty dead zone"
- Hero content should not be cramped — there should still be breathing room, just not a void
- Stats should remain fully visible and not get cut off at the bottom edge

---

## TASK 3: Replace All 3 Project Cards

### Problem
The current "See Our Work" section has three generic projects. These are being replaced with three flagship projects that communicate scale, prestige, and long-term client relationships.

### Files
- `frontend/src/components/landing/` — whichever component renders the projects section (likely a dedicated component, or it may be inline in another file — search for "See Our Work" or "project-1" to find it)
- `frontend/src/content/site.ts` — if project content is defined here
- `frontend/public/images/projects/` — image files

### Part A: Image Handling
1. The old images (`project-1.jpg`, `project-2.jpg`, `project-3.jpg`) have already been overwritten with new photos by the owner.
2. **Rename the files** to meaningful names:
   - `project-1.jpg` → `henry-ford-hospital.jpg`
   - `project-2.jpg` → `michigan-central-station.jpg`
   - `project-3.jpg` → `ford-hub-dearborn.jpg`
3. **Convert to WebP** using `cwebp` or `sharp` (check what's available):
   ```bash
   # Example with cwebp (install if needed: apt-get install webp)
   cwebp -q 80 henry-ford-hospital.jpg -o henry-ford-hospital.webp
   cwebp -q 80 michigan-central-station.jpg -o michigan-central-station.webp
   cwebp -q 80 ford-hub-dearborn.jpg -o ford-hub-dearborn.webp
   ```
4. Keep the original JPGs as fallbacks.
5. Update the component to use `<picture>` elements with WebP source + JPG fallback, consistent with how hero images are handled.
6. Ensure proper `alt` text on each image (see content below).
7. Add `loading="lazy"` since these are below the fold.
8. Ensure explicit `width` and `height` attributes or aspect-ratio CSS to prevent CLS.

### Part B: Card Content

**Card 1: Henry Ford Hospital**
- **Title:** "Henry Ford Hospital — Detroit"
- **Description:** "Our team maintains a year-round presence across Henry Ford Hospital's Detroit campus, providing insulation services, material supply, and pipe support fabrication across multiple buildings. With crews available seven days a week and insulators who have spent the better part of their careers on-site, we deliver the continuity and institutional knowledge that complex healthcare facilities demand."
- **Tag:** "Ongoing Partnership"
- **Alt text:** "Mechanical insulation work at Henry Ford Hospital in Detroit"

**Card 2: Michigan Central Station**
- **Title:** "Michigan Central Station — Detroit"
- **Description:** "We were part of the subcontractor team on Ford Motor Company's landmark six-year restoration of Michigan Central Station — one of the most ambitious preservation projects in Detroit's history. Our crews contributed insulation work throughout the historic Beaux-Arts building, and we remain on-site today supporting the ongoing buildout of the hotel and additional spaces within the station."
- **Tag:** "Historic Restoration"
- **Alt text:** "Insulation work at Michigan Central Station in Detroit"

**Card 3: Ford World Headquarters (HUB)**
- **Title:** "Ford World Headquarters — Dearborn"
- **Description:** "From the ground up, we contributed to the construction of Ford's new Henry Ford II World Center in Dearborn — a state-of-the-art campus replacing the iconic Glass House. This multi-year, multi-million dollar project included insulation services and pipe supports from our fabrication team, helping build the next generation of Ford's global headquarters."
- **Tag:** "Ground-Up Construction"
- **Alt text:** "Insulation and pipe support fabrication at Ford World Headquarters in Dearborn"

### Part C: Component Updates
1. Update all image `src` paths from old filenames to new filenames.
2. Update titles, descriptions, tags, and alt text.
3. If project data is centralized in `site.ts`, update there. If it's hardcoded in the component, update in-place.
4. Remove any references to the old project names/descriptions ("Outdoor Mechanical Insulation — Mid-Michigan", "DDOT Coolidge Terminal", "On-Site Mechanical Insulation Installations").
5. Ensure the tags ("Ongoing Partnership", "Historic Restoration", "Ground-Up Construction") render with the existing tag styling (the blue-outlined pill badges currently used for "Pipe Insulation", "Commercial", "Industrial").

### Verification
- Run `npm run build` — no errors
- All three new project cards render with correct titles, descriptions, tags, and images
- Images load as WebP with JPG fallback
- Images have proper alt text
- No references to old project names remain in the codebase (search for "DDOT", "Coolidge", "Mid-Michigan", "On-Site Mechanical Insulation Installations")
- Cards display correctly at 375px, 768px, and 1440px viewports

---

## TASK 4: Move Social Media Links to Footer

### Problem
LinkedIn and Facebook icons are currently positioned between the last project card and the CTA banner image. They're floating in no-man's-land — visually disconnected from both sections. They need to move to the footer where users expect to find social links.

### Files
- Component rendering the social links (search for "linkedin", "facebook", or social icon imports in `frontend/src/components/landing/`)
- `frontend/src/components/landing/Footer.tsx`

### Approach
1. **Locate** the current social links — find the LinkedIn and Facebook icons in the component tree. They're likely in the projects section component or in a standalone element between sections.
2. **Remove** the social links from their current position entirely. Don't just hide them — remove the markup so there's no empty space left behind.
3. **Add** LinkedIn and Facebook icons to the Footer component. Place them in a new row **between** the Contact section (phone, email, address) and the copyright line. Center-aligned, with the same icon style/size currently used.
4. Use the same icon components/SVGs currently in use — don't introduce new dependencies.
5. Ensure the social links are actual `<a>` tags with:
   - `href` pointing to RMI's LinkedIn and Facebook pages (find the current URLs in the codebase)
   - `target="_blank"`
   - `rel="noopener noreferrer"`
   - `aria-label="Visit our LinkedIn page"` / `aria-label="Visit our Facebook page"`
6. Style consistently with the footer's existing aesthetic — likely gray or muted icons that brighten on hover.

### Verification
- Run `npm run build` — no errors
- Social icons no longer appear between projects and CTA
- Social icons appear in the footer in the specified position
- Links open in new tabs and point to correct URLs
- No empty/orphaned space where the social links used to be
- Check at 375px and 1440px viewports

---

## TASK 5: Hero Stats Row Tightening

### Problem
The vertical spacing between the "Request a Quote" CTA button, the phone/email icon row, and the stats bar at the bottom of the hero is too loose. These three elements feel like separate floating items instead of a cohesive hero bottom section.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`

### Approach
1. Locate the CTA button, phone/email icons, and stats row in the hero component.
2. Reduce the `gap`, `margin-top`, `margin-bottom`, or `space-y` values between these three elements. The exact current values will vary — reduce them by approximately 30-40%.
3. The goal is for these three to feel like ONE unit: `[Button] → [Icons] → [Stats]` with tight, intentional spacing (roughly 16-24px between each, not 40-60px).
4. Do NOT change the spacing above the CTA button (the space between the tagline and the button should remain as-is).

### Verification
- Run `npm run build` — no errors
- CTA → icons → stats feel like a cohesive bottom-of-hero group
- Nothing is cramped or overlapping
- Check at 375px and 768px viewports

---

## TASK 6: Domain Reference Audit

### Problem
The primary domain is `rmi-llc.net`. There may be references to `resourcemechanicalinsulation.com` in the codebase from an earlier configuration. Any such references need to be updated.

### Files
- `frontend/src/layouts/BaseLayout.astro` (meta tags, canonical URL, JSON-LD)
- `frontend/astro.config.mjs` (site URL for sitemap generation)
- `frontend/public/robots.txt`
- Any other files referencing a domain URL

### Approach
1. **Search the entire codebase** for `resourcemechanicalinsulation.com`:
   ```bash
   grep -r "resourcemechanicalinsulation" --include="*.ts" --include="*.tsx" --include="*.astro" --include="*.mjs" --include="*.json" --include="*.txt" --include="*.xml" frontend/ backend/
   ```
2. Replace ALL occurrences with `rmi-llc.net` (or `https://rmi-llc.net` / `https://www.rmi-llc.net` as appropriate — match the pattern, prefer `https://www.rmi-llc.net` for canonical if the site serves from www).
3. **Specific locations to check:**
   - `<link rel="canonical" href="...">` 
   - `og:url` meta tag
   - JSON-LD `@id`, `url`, `sameAs` fields
   - `astro.config.mjs` → `site:` property
   - Sitemap configuration
   - `robots.txt` → Sitemap URL
4. If no references exist, note that in the completion summary and move on.

### Verification
- Run `grep -r "resourcemechanicalinsulation" frontend/ backend/` — should return zero results
- Run `npm run build` — no errors
- Sitemap generates with correct domain

---

## EXECUTION ORDER

1. **Task 6** (Domain audit) — quick scan, low risk, do first
2. **Task 1** (Hero overlay) — visual change, isolated to one component
3. **Task 2** (Hero dead space) — related to hero, do while in that file
4. **Task 5** (Stats row tightening) — also in hero file, do in same pass
5. **Task 3** (Project cards) — largest task, multiple files
6. **Task 4** (Social links to footer) — depends on knowing where social links currently live

After all tasks: run full `npm run build`, note any test failures, update visual baselines if Playwright visual tests exist (`npm run test:visual:update`).

---

## GIT WORKFLOW

1. Create feature branch: `git checkout -b feat/sprint-1-ui-audit`
2. Make all changes
3. Commit with: `git add . && git commit -m "feat: Sprint 1 UI audit fixes — hero overlay, spacing, project cards, social links, domain refs"`
4. **Do NOT merge to main.** Leave the branch for Graham to review and merge manually via PR. This is a protected branch workflow — Graham merges as a safety gate.

---

## DEFINITION OF DONE

- [ ] All 6 tasks completed and individually verified
- [ ] `npm run build` passes with zero errors
- [ ] No references to `resourcemechanicalinsulation.com` in codebase
- [ ] Hero overlay uses gradient (dark-light-dark), hero images show more detail
- [ ] No dead space gap between hero and Services section
- [ ] Stats row / CTA / icons feel like one cohesive unit
- [ ] Three new project cards with correct titles, descriptions, tags, and WebP images
- [ ] Social links removed from between projects/CTA, added to footer
- [ ] Feature branch created, committed, NOT merged to main
- [ ] Summary of all changes written to `tasks/todo.md`
