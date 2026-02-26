# SPRINT-2: UI Audit Polish

**Spec Version:** 1.0  
**Date:** February 26, 2026  
**Author:** Senior Developer Audit  
**Execution:** Claude Code autonomous — read this file, execute all tasks in order, verify each before marking complete.

---

## CONTEXT

This is the second sprint from the February 26 mobile UI audit of `rmi-llc.net`. Sprint 1 (hero overlay, dead space, project cards, social links, domain refs) is complete and merged. This sprint addresses the remaining medium-priority polish items. Do NOT change any content that isn't specified here. Minimal impact principle applies.

**Important:** Do NOT modify the hero section, project cards, or social link placement — those were handled in Sprint 1 and should not be touched.

---

## TASK 1: Service Cards — Tiered Layout with Color Variation

### Problem
All 9 service cards are visually identical — same size, same blue left-border accent, same weight. On mobile it's a long monotonous scroll where nothing stands out. There's no visual signal about which services are most important.

### Files
- `frontend/src/components/landing/Services.tsx`
- `frontend/src/content/site.ts` (if service data/categories are defined here)
- Possibly `frontend/tailwind.config.mjs` (if custom colors are needed)

### Approach

**Three tiers with distinct accent colors:**

**Tier 1 — Core Services (blue accent, `#3B82F6` / `blue-500`):**
1. Pipe Insulation
2. Duct Insulation
3. Tanks, Vessels, & Equipment Insulation
4. Removable Insulation Blankets

**Tier 2 — Specialty Services (amber/orange accent, `#F59E0B` / `amber-500`):**
5. Field-Applied Jacketing
6. Pipe Supports & Fabrication
7. Plan & Specification / Bid Work

**Tier 3 — Additional Services (emerald accent, `#10B981` / `emerald-500`):**
8. Material Sales
9. 24/7 Emergency Response

**Implementation details:**

1. **Categorize each service** — Add a `tier` or `category` property to the service data (either in the component or in `site.ts`). Values: `"core"`, `"specialty"`, `"additional"`.

2. **Left border color by tier:**
   - Core: `border-l-blue-500` (keep current blue)
   - Specialty: `border-l-amber-500`
   - Additional: `border-l-emerald-500`

3. **Size differentiation:**
   - Core cards: Add slightly more vertical padding than current — `py-5` instead of `py-4` (or equivalent). These should feel subtly weightier.
   - Specialty cards: Keep current sizing.
   - Additional cards: Slightly reduce vertical padding — `py-3` instead of `py-4`. These should feel compact.

4. **Subtle tier labels:** Add a small, muted label above each tier group (not on each card). Text like "Core Services", "Specialty", "Additional" in a very small, uppercase, muted gray font (`text-xs text-gray-500 uppercase tracking-wider`). Add a small margin-top between tier groups (`mt-6` or similar) to create visual breathing room between the tiers.

5. **Icon colors should match tier accent colors:**
   - Core service icons: blue (keep current)
   - Specialty icons: amber/orange
   - Additional icons: emerald/green

6. **Do NOT change:**
   - Service titles (keep exact current text)
   - Service order within each tier (maintain the order listed above)
   - Card background color (keep current dark background)
   - Icon shapes/SVGs (only change their color)
   - Overall section title, subtitle, or blue divider line

### Verification
- Run `npm run build` — no errors
- All 9 service cards render with correct tier grouping
- Left border colors differ by tier (blue, amber, emerald)
- Icon colors match their tier accent
- Tier labels appear above each group in muted text
- Visual spacing between tier groups is noticeable but not jarring
- Check at 375px and 1440px viewports
- Cards remain accessible (proper contrast ratios on accent colors against dark background)

---

## TASK 2: Add "Projects" to Navbar and Footer Quick Links

### Problem
The "See Our Work" project section has no corresponding nav link. Prospects looking for project examples can't jump there from the navigation.

### Files
- `frontend/src/components/landing/Navbar.astro`
- `frontend/src/components/landing/Footer.tsx`

### Approach

**Navbar:**
1. Add a new nav link "Projects" (or "Our Work") between "About" and "Contact" in both the desktop nav and mobile menu.
2. The link should be an anchor: `href="#projects"` (verify the actual section ID used by ProjectShowcase — it may be `projects`, `our-work`, or `see-our-work`; search the codebase for the section's `id` attribute).
3. Match the styling of existing nav links exactly.
4. On mobile hamburger menu, add it in the same position (between About and Contact).

**Footer Quick Links:**
1. Add "Projects" link in the Quick Links section, between "About" and "Request a Quote".
2. Same anchor href as the navbar link.
3. Match existing link styling.

### Verification
- Run `npm run build` — no errors
- "Projects" appears in desktop navbar between About and Contact
- "Projects" appears in mobile hamburger menu between About and Contact
- "Projects" appears in footer Quick Links between About and Request a Quote
- Clicking the link smooth-scrolls to the project showcase section
- Check at 375px and 1440px viewports

---

## TASK 3: CTA Banner Image — Retain Full Content

### Problem
The CTA banner background image (the white piping/insulation photo) gets cropped hard on the sides at narrower viewports, losing the subject matter and context.

### Files
- `frontend/src/components/landing/CTABanner.tsx`

### Approach
1. Locate the CTA banner's background image element. It's likely using `object-cover` which crops to fill the container.
2. The goal is to show more of the image content while still looking good as a background. Options (try in order of preference):
   - **Option A:** Change `object-cover` to `object-contain` with a dark background behind it. This preserves the full image but may leave dark bars.
   - **Option B:** Keep `object-cover` but adjust `object-position` to center on the most important part of the image (e.g., `object-center` or `object-[center_60%]`).
   - **Option C:** Set a max-aspect-ratio on the container so it doesn't become so narrow that excessive cropping occurs. E.g., `aspect-[16/9]` or `min-h-[300px]` on mobile.
3. Option B or C is likely the best approach — pure `object-contain` tends to look awkward for banner backgrounds.
4. Test across viewports to find the sweet spot where the insulation work is visible without the section looking broken.

### Verification
- Run `npm run build` — no errors
- CTA banner image shows more meaningful content at 375px viewport than before
- Image still looks professional and intentional as a background (not stretched, not awkwardly letterboxed)
- CTA text ("Ready to Start Your Insulation Project?") remains legible over the image
- Check at 375px, 768px, and 1440px viewports

---

## TASK 4: Global Floating Phone FAB Positioning Fix

### Problem
The floating phone FAB (call button) overlaps content at multiple scroll positions — observed overlapping the About section cards, Emergency Response card text, and footer address line.

### Files
- `frontend/src/components/landing/FloatingMobileCTA.tsx`
- Possibly the global layout or index page if the FAB is positioned there

### Approach
1. The FAB is likely positioned with `fixed bottom-X right-X` classes. The issue is that it overlaps text content when scrolled to certain positions.
2. **Preferred fix:** Add `bottom` padding/margin to the FAB to raise it above the footer area, and ensure content areas have enough right-side padding that the FAB doesn't clip text.
3. **Specific adjustments:**
   - Increase the FAB's `bottom` position slightly — try `bottom-20` or `bottom-24` instead of the current value, so it sits higher and avoids the footer.
   - Add a `scroll-padding-bottom` or `pb-` adjustment to sections where overlap is worst (About cards, footer) — approximately 80px of extra right-side breathing room on the last line of card content.
   - **OR** the cleaner fix: ensure the FAB has a `z-50` and add `pr-16` or `mr-16` to card content containers so text wraps before reaching the FAB's horizontal position. This prevents overlap regardless of scroll position.
4. **Do NOT** hide the FAB or change its functionality. It should remain a fixed, always-visible phone button on mobile.
5. **Desktop consideration:** The FAB should likely only appear on mobile viewports (below `md:` breakpoint). If it already has this behavior, leave it. If it shows on desktop too, add `md:hidden`.

### Verification
- Run `npm run build` — no errors
- Scroll through the entire page on 375px viewport — FAB should not overlap any text content
- FAB remains visible and functional at all scroll positions
- FAB is not visible on desktop viewports (1440px) — confirm it's mobile-only
- Phone link in FAB still works (tappable, correct `tel:` href)

---

## TASK 5: "Why Choose RMI" Intro Content Deduplication

### Problem
The section intro paragraph and the "Safety-First Culture" card say almost the same thing — "231K+ safe man-hours, zero lost-time incidents" appears in both the intro and the first card. This is redundant within one scroll on mobile.

### Files
- `frontend/src/components/landing/About.tsx`
- `frontend/src/content/site.ts` (if About content is defined here)

### Approach
1. **Rewrite the section intro** to set the hook without repeating the Safety-First card's stats. The intro should be broader — the "why" — and the cards should provide the evidence.
2. **New intro text:** "Built on safety, reliability, and deep expertise. Here's what sets us apart."
3. Keep the Safety-First Culture card content unchanged — it already does a good job expanding on the safety record with specific details.
4. **Also rewrite the "Proven Track Record" card** to be more specific and less redundant with the hero stats:
   - **Current:** "500+ commercial and industrial insulation projects completed annually across Michigan and surrounding states, serving power plants, manufacturing facilities, hospitals, and more."
   - **New:** "From hospitals and manufacturing plants to landmark restorations and ground-up campus builds — our work speaks for itself. Year after year, general contractors and facility managers trust RMI to deliver on schedule and on spec."
5. **Do NOT change:**
   - Section title ("Why Choose RMI")
   - Safety-First Culture card (title or content)
   - Emergency Response card (title or content)
   - Union-Trained Workforce card (title or content)
   - Card layout, icons, or styling

### Verification
- Run `npm run build` — no errors
- Section intro no longer repeats "231K+ safe man-hours" or "zero lost-time incidents"
- "Proven Track Record" card content is updated
- Other cards remain unchanged
- Check at 375px viewport — intro and Safety-First card should feel like two distinct pieces of information, not a repeat

---

## TASK 6: Materials Marquee Edge Clipping Fix

### Problem
The left and right edges of the scrolling materials marquee clip text mid-word (visible: "Fiber..." and "nolic..." cut off). The fade-out gradient mask isn't wide enough to hide partial words.

### Files
- `frontend/src/components/landing/MaterialsMarquee.tsx`

### Approach
1. Locate the gradient fade masks on the left and right edges of the marquee. These are typically implemented as:
   - Pseudo-elements (`::before` / `::after`) with gradient backgrounds
   - Absolutely-positioned divs with gradient backgrounds
   - CSS `mask-image` property with linear gradients
2. **Increase the width of the fade masks.** The current mask width is likely around `40-60px` or `w-8`/`w-12`. Increase to approximately `80-100px` or `w-16`/`w-20`.
3. The gradient should go from the section's background color (fully opaque) to transparent. This ensures partial words are fully hidden before the visible area begins.
4. If using CSS `mask-image`, increase the gradient stop percentages (e.g., from `5%` to `10%` on each side).
5. **Do NOT change:**
   - Marquee content (material names)
   - Scroll speed or direction
   - Section title or subtitle
   - Overall section padding or background color

### Verification
- Run `npm run build` — no errors
- No partial/clipped words visible at either edge of the marquee at any point during the scroll animation
- The fade effect looks smooth and intentional
- Check at 375px and 1440px viewports

---

## TASK 7: "PROJECTS ANNUALLY" Label Line-Wrap Fix

### Problem
In the hero stats row, the middle stat label "PROJECTS ANNUALLY" wraps to two lines while "CLIENTS" and "OSHA HOURS" remain single-line. This breaks the visual alignment of the three stats.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`

### Approach
1. Locate the stats labels in the hero component.
2. **Option A (preferred):** Shorten the label to "PROJECTS / YR" or "ANNUAL PROJECTS" — something that fits on one line at the smallest mobile viewport (375px).
3. **Option B:** Add `whitespace-nowrap` to all stat labels and let the container handle sizing. If this causes overflow, reduce the font size of all stat labels slightly (they should all be the same size).
4. **Option C:** Increase the stat container width for the middle stat slightly so "PROJECTS ANNUALLY" fits on one line.
5. Whichever option is used, all three stat labels must remain visually aligned — same font size, same baseline, single line each.

### Verification
- Run `npm run build` — no errors
- All three stat labels display on a single line at 375px viewport
- Labels are visually aligned (same size, same baseline)
- Stat numbers (100+, 500+, 231K+) are not affected

---

## TASK 8: Footer Service Area Text Update

### Problem
Footer currently says "Serving Michigan from Romulus, MI." The actual service area extends beyond Michigan into surrounding Midwest states.

### Files
- `frontend/src/components/landing/Footer.tsx`
- `frontend/src/content/site.ts` (if footer content is centralized here)

### Approach
1. Find the text "Serving Michigan from Romulus, MI" (or similar).
2. Replace with: "Serving Michigan and the Midwest."
3. This is a one-line text change. Do not modify any other footer content, layout, or styling.

### Verification
- Run `npm run build` — no errors
- Footer displays "Serving Michigan and the Midwest."
- No other footer content changed

---

## EXECUTION ORDER

1. **Task 1** (Service cards tiered layout) — largest task, do first while context is fresh
2. **Task 2** (Add Projects to nav) — quick change, high visibility
3. **Task 5** (About section content dedup) — content change, isolated
4. **Task 7** (Stats label wrap fix) — quick fix in hero
5. **Task 6** (Marquee edge clipping) — quick CSS fix
6. **Task 3** (CTA banner image) — may require some trial and error
7. **Task 4** (FAB positioning) — may need testing at multiple scroll positions
8. **Task 8** (Footer text) — trivial, do last

After all tasks: run full `npm run build`, update visual baselines if Playwright visual tests exist (`npm run test:visual:update`), run any functional tests.

---

## GIT WORKFLOW

1. Create feature branch: `git checkout -b feat/sprint-2-ui-polish`
2. Make all changes
3. Commit with: `git add . && git commit -m "feat: Sprint 2 UI polish — service card tiers, nav projects link, content dedup, FAB fix, marquee, CTA image"`
4. **Do NOT merge to main.** Leave the branch for Graham to review and merge manually.

---

## DEFINITION OF DONE

- [ ] All 8 tasks completed and individually verified
- [ ] `npm run build` passes with zero errors
- [ ] Service cards show 3 tiers with distinct accent colors and tier labels
- [ ] "Projects" link in navbar (desktop + mobile) and footer quick links
- [ ] About section intro no longer repeats Safety-First card content
- [ ] "Proven Track Record" card rewritten with stronger content
- [ ] All hero stat labels display single-line at 375px
- [ ] Materials marquee has no clipped text at edges
- [ ] CTA banner image shows more content on mobile
- [ ] Floating FAB doesn't overlap any text content
- [ ] Footer says "Serving Michigan and the Midwest"
- [ ] Feature branch created, committed, NOT merged to main
- [ ] Summary of all changes written to `tasks/todo.md`
