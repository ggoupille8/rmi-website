# PARALLEL POLISH — March 8, 2026

## Audit Summary (Live Site — rmi-llc.net)

**Current PageSpeed (March 8, 2026):** Mobile 95 | Accessibility 100 | Best Practices 100 | SEO 100
**Core Web Vitals:** FCP 1.0s | LCP 2.9s | TBT 60ms | CLS 0 | SI 1.0s

### Issues Found

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| 1 | **CTA image has empty alt text** — `cta-project.jpeg` renders with `alt=""` — accessibility gap on a key conversion element | Medium | `CTABanner.tsx` |
| 2 | **rmi-logo-full.png has empty alt text** — Hero overlay logo has `alt=""` | Medium | `HeroFullWidth.tsx` |
| 3 | **About H2 renders duplicate visible text** — Inner HTML shows "Why Choose Resource Mechanical InsulationWhy Choose Resource Mechanical Insulation" in the rendered text (sr-only span + aria-hidden span concatenate in some screen readers/crawlers) | Medium | `About.tsx` |
| 4 | **Project card images serve JPG fallback, not WebP** — `<picture>` sources exist but `<img>` src points to `.jpg` files. Browser picks WebP from srcset, but crawlers/no-JS users get JPG. The 960w images lack a multi-resolution srcset (only single 960w breakpoint) | Low | `ProjectShowcase.tsx` |
| 5 | **Marquee has 120 DOM nodes for 22 unique items** — Duplicated 4–5x for infinite scroll effect. This is fine for animation but the `<noscript>` or raw HTML exposes all duplicates to crawlers, which can look like keyword stuffing | Low | `MaterialsMarquee.tsx` |
| 6 | **Section elements lack `id` attributes** — Only `cta-banner` has an ID on its `<section>`. The nav anchor targets (`#services`, `#about`, `#projects`, `#contact`) resolve to inner `<div>` elements rather than semantic `<section>` tags | Low | Multiple |
| 7 | **Footer nav links have 36px height** — Below 44px WCAG AAA touch target on mobile | Low | `Footer.tsx` |
| 8 | **Navbar mobile links at 32-36px height** — Below 44px touch target threshold | Low | `Navbar.astro` |
| 9 | **No `<noscript>` meaningful fallback** — Single noscript tag just says "enable JS" — no actual content fallback | Low | `index.astro` |
| 10 | **og:image is JPG** — `og-image.jpg` could be optimized or at minimum ensured it's high quality for social shares | Info | `BaseLayout.astro` |

### What's Already Good (Don't Touch)

- Hero slideshow with Ken Burns + crossfade + srcset — working great
- Contact form with validation, honeypot, glass styling — solid
- JSON-LD LocalBusiness schema — complete and correct
- Canonical URLs, meta description, og tags — all correct
- Phone 248-379-5156 — confirmed correct, consistent across site and JSON-LD
- Security headers via vercel.json — comprehensive
- Self-hosted Russo One font — no external font requests
- 599 DOM nodes total — lean and efficient
- CLS 0 — no layout shift issues

---

## FILE ISOLATION MAP

| Agent | Branch | Primary Files | Never Touch |
|-------|--------|--------------|-------------|
| **Agent 1** | `feat/project-showcase-polish` | `src/components/landing/ProjectShowcase.tsx` | All other components |
| **Agent 2** | `feat/about-section-cleanup` | `src/components/landing/About.tsx` | All other components |
| **Agent 3** | `feat/cta-banner-polish` | `src/components/landing/CTABanner.tsx` | All other components |
| **Agent 4** | `feat/footer-touch-targets` | `src/components/landing/Footer.tsx` | All other components |
| **Agent 5** | `feat/marquee-seo-fix` | `src/components/landing/MaterialsMarquee.tsx` | All other components |

**No file is touched by more than one agent. Safe for parallel merge.**

---

# AGENT 1: Project Showcase Polish

## Claude Code Prompt

```
Read the file SPEC-PROJECT-SHOWCASE-POLISH.md in the project root. Execute all tasks in order. Verify each task passes before moving to the next. Follow the git workflow at the bottom. Write a summary to tasks/todo.md when complete.
```

## Save as: `SPEC-PROJECT-SHOWCASE-POLISH.md`

````markdown
# SPEC: Project Showcase Polish

## CONTEXT
The Project Showcase section has 3 flagship project cards (Henry Ford Hospital, Michigan Central Station, Ford World HQ). Currently the `<img>` fallback src points to `.jpg` files. While the `<picture>` element has WebP sources, the fallback should also serve optimized formats. Additionally, the project cards could benefit from a subtle staggered entrance animation to add polish without changing content or layout.

**PageSpeed is at 95 mobile / 100 accessibility — do NOT regress these scores.**

## FILES
- `src/components/landing/ProjectShowcase.tsx` (ONLY file to modify)

## DO NOT TOUCH
- Any other component file
- Image files in `public/images/` — do NOT create, delete, or rename image files
- Content text, card layout, or color scheme
- The `<picture>` / `<source>` WebP setup — it's already working

## TASK 1: Add Intersection Observer Scroll Animations to Project Cards

### Problem
The 3 project cards appear statically. A subtle staggered fade-up on scroll would add professional polish matching the rest of the site's interactive feel (About cards have hover lift, CTA has gradient animation, etc.).

### Approach
1. Add a React `useRef` + `useEffect` with IntersectionObserver (threshold: 0.15)
2. Each card gets `opacity-0 translate-y-6` as initial state via Tailwind classes
3. When card enters viewport, add `opacity-100 translate-y-0 transition-all duration-700 ease-out`
4. Stagger: first card delay-0, second delay-150, third delay-300 (use inline `transitionDelay` style)
5. Use `once: true` pattern — observe, trigger, then unobserve
6. Ensure the cards are visible by default if JS fails — add a `<noscript><style>` block or use a `js-loaded` class pattern so cards aren't permanently hidden without JS

### Verification
- `npm run build` passes with zero errors
- Cards animate in on scroll (verify by checking the IntersectionObserver logic is correct)
- Cards remain fully visible after animation completes
- No CLS introduced (initial state should reserve space via the card container dimensions)

## TASK 2: Add Accessible Project Card Link Structure

### Problem
Each project card is currently presentational — there's no clickable link or interactive element. While there aren't dedicated project pages yet, adding an anchor wrapper with `aria-label` prepares for future service pages and improves the semantic structure.

### Approach
1. Wrap each card's heading (H3) in an anchor tag: `<a href="#contact" aria-label="Learn more about [Project Name] — Request a Quote">`
2. This links to the contact form, which is the current conversion action
3. Add `group` class to the card container and `group-hover:text-blue-400 transition-colors` to the H3 link for a subtle hover color shift
4. Ensure the link is keyboard-focusable with a visible focus ring: `focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2 rounded`

### Verification
- Tab through the page — each project card heading is focusable
- Focus ring is visible on keyboard navigation
- Hover changes heading color subtly
- Click navigates to #contact section
- Screen reader announces "Learn more about Henry Ford Hospital — Request a Quote" (etc.)
- `npm run build` passes

## GIT WORKFLOW
```
git checkout -b feat/project-showcase-polish
# Make changes
git add -A
git commit -m "feat: add scroll animations and accessible links to project cards"
# Do NOT merge to main — Graham will merge
```

## DEFINITION OF DONE
- [ ] Cards animate in on scroll with stagger
- [ ] Cards visible without JS
- [ ] Each card heading links to #contact with aria-label
- [ ] Focus ring visible on keyboard nav
- [ ] `npm run build` passes with zero errors
- [ ] No changes to any other files
````

---

# AGENT 2: About Section Cleanup

## Claude Code Prompt

```
Read the file SPEC-ABOUT-CLEANUP.md in the project root. Execute all tasks in order. Verify each task passes before moving to the next. Follow the git workflow at the bottom. Write a summary to tasks/todo.md when complete.
```

## Save as: `SPEC-ABOUT-CLEANUP.md`

````markdown
# SPEC: About Section Cleanup

## CONTEXT
The About section ("Why Choose RMI") has a heading implementation issue: the rendered text in the DOM concatenates the sr-only span and the aria-hidden span, causing "Why Choose Resource Mechanical InsulationWhy Choose Resource Mechanical Insulation" to appear in some contexts (Google's crawler, text extraction tools, copy-paste). The H2 uses a complex sr-only + aria-hidden + responsive span pattern that can be simplified.

Additionally, the 4 About cards (Safety, Emergency, Track Record, Union) could benefit from the same IntersectionObserver scroll animation pattern as the rest of the page for consistency.

**Do NOT change any card content, colors (blue/red/amber/emerald), or layout.**

## FILES
- `src/components/landing/About.tsx` (ONLY file to modify)

## DO NOT TOUCH
- Card content text
- Card color scheme (blue=Safety, red=Emergency, amber=Track Record, emerald=Union)
- Card hover lift behavior
- Any other component file

## TASK 1: Fix the H2 Duplicate Text Rendering

### Problem
The current H2 innerHTML structure creates duplicate text content:
```html
<span class="sr-only">Why Choose Resource Mechanical Insulation</span>
<span aria-hidden="true">Why Choose <span class="hidden sm:inline">Resource Mechanical Insulation</span><span class="sm:hidden">RMI</span></span>
```
This causes crawlers and text extraction to see the heading text twice.

### Approach
Simplify to a clean, single implementation:
```jsx
<h2 className="...existing classes...">
  Why Choose{' '}
  <span className="hidden sm:inline">Resource Mechanical Insulation</span>
  <span className="sm:hidden">RMI</span>
</h2>
```
This gives screen readers "Why Choose RMI" on mobile and "Why Choose Resource Mechanical Insulation" on desktop. No duplication, no sr-only needed.

Preserve ALL existing Tailwind classes on the H2 element itself (text size, color, font, spacing, etc.).

### Verification
- View page source or run `document.querySelector('#about h2').textContent` — should NOT contain duplicate text
- At mobile: heading shows "Why Choose RMI"
- At desktop: heading shows "Why Choose Resource Mechanical Insulation"
- `npm run build` passes
- Grep for `sr-only` in About.tsx — it should no longer appear in the H2

## TASK 2: Add Scroll-Triggered Entrance Animations to About Cards

### Problem
The About cards appear statically on page load. Adding a staggered reveal animation on scroll will match the interactive polish of other sections.

### Approach
1. Add IntersectionObserver (threshold: 0.1) watching the card grid container
2. When the grid enters viewport, animate each card in sequence:
   - Initial state: `opacity-0 translate-y-4` (via a state variable, NOT Tailwind `invisible` which would break layout)
   - Animate to: `opacity-100 translate-y-0`
   - Stagger: 0ms, 100ms, 200ms, 300ms (use inline `transitionDelay`)
   - Duration: `duration-600 ease-out`
3. Use `useState` for a `isVisible` boolean, set once via IntersectionObserver
4. Add `transition-all` to each card alongside existing hover classes
5. Ensure cards are visible by default if IntersectionObserver is not supported (add a check)
6. Do NOT change the existing hover:lift behavior — the animation classes should complement, not replace

### Verification
- Cards animate in when scrolled into view
- Existing hover lift still works after animation
- Cards remain visible after animation completes
- No CLS (cards should occupy their full space even when opacity-0)
- `npm run build` passes

## GIT WORKFLOW
```
git checkout -b feat/about-section-cleanup
git add -A
git commit -m "fix: clean up About H2 duplicate text and add scroll animations"
# Do NOT merge to main
```

## DEFINITION OF DONE
- [ ] H2 text no longer duplicated in DOM
- [ ] Responsive text works (RMI on mobile, full name on desktop)
- [ ] Cards animate in on scroll with stagger
- [ ] Hover lift preserved
- [ ] `npm run build` passes
- [ ] No changes to any other files
````

---

# AGENT 3: CTA Banner Polish

## Claude Code Prompt

```
Read the file SPEC-CTA-POLISH.md in the project root. Execute all tasks in order. Verify each task passes before moving to the next. Follow the git workflow at the bottom. Write a summary to tasks/todo.md when complete.
```

## Save as: `SPEC-CTA-POLISH.md`

````markdown
# SPEC: CTA Banner Polish

## CONTEXT
The CTA banner ("Ready to Start Your Insulation Project?") is the primary conversion driver between the project showcase and the contact form. The CTA image currently has an empty alt attribute (`alt=""`), which is an accessibility gap on a key conversion element. The banner also could benefit from a subtle entrance animation to draw the eye as the user scrolls past the projects section.

**Current PageSpeed: 95/100/100/100. Do NOT regress.**

## FILES
- `src/components/landing/CTABanner.tsx` (ONLY file to modify)

## DO NOT TOUCH
- The animated gradient background, dot pattern overlay, or button glow — these are working well
- The image source or picture element setup (WebP with JPEG fallback is correct)
- Any other component file
- The heading text or CTA button text

## TASK 1: Fix CTA Image Alt Text

### Problem
The CTA image renders with `alt=""`. This is a decorative image marker, but the image actually shows an insulation project in progress and contributes to the section's messaging. It should have descriptive alt text.

### Approach
1. Find the `<img>` element inside the CTA banner's `<picture>` element
2. Change `alt=""` to `alt="Commercial insulation project in progress"`
3. Small fix, high impact for accessibility.

### Verification
- Inspect the CTA image — alt should not be empty
- `npm run build` passes

## TASK 2: Add Scroll-Triggered Reveal to CTA Banner

### Problem
The CTA banner appears statically. A subtle scale-up + fade-in on scroll would create a moment of emphasis right before the contact form.

### Approach
1. Add IntersectionObserver (threshold: 0.2) on the banner's outermost container
2. Initial state: `opacity-0 scale-[0.97]` (very subtle — NOT a dramatic zoom, just a slight expand)
3. Animate to: `opacity-100 scale-100`
4. Duration: `duration-700 ease-out`
5. Use `useState` + `useRef` + `useEffect` pattern
6. `once: true` — trigger once, then unobserve
7. Ensure the banner is visible without JS (check for IntersectionObserver support)

### Verification
- Banner fades in with subtle scale on scroll
- Animation is smooth, not jarring
- Existing gradient animation still running after reveal
- Button glow and hover effects still work
- `npm run build` passes
- No CLS (banner reserves its full height even at opacity-0)

## GIT WORKFLOW
```
git checkout -b feat/cta-banner-polish
git add -A
git commit -m "fix: CTA image alt text and add scroll reveal animation"
# Do NOT merge to main
```

## DEFINITION OF DONE
- [ ] CTA image has descriptive alt text
- [ ] Banner animates in on scroll
- [ ] Existing effects (gradient, glow, dot pattern) preserved
- [ ] `npm run build` passes
- [ ] No changes to any other files
````

---

# AGENT 4: Footer Touch Target Fix

## Claude Code Prompt

```
Read the file SPEC-FOOTER-TOUCH-TARGETS.md in the project root. Execute all tasks in order. Verify each task passes before moving to the next. Follow the git workflow at the bottom. Write a summary to tasks/todo.md when complete.
```

## Save as: `SPEC-FOOTER-TOUCH-TARGETS.md`

````markdown
# SPEC: Footer Touch Target Fix

## CONTEXT
The footer's quick links and contact links render at 36px height on mobile, below the 44px WCAG AAA minimum touch target. This is the only remaining touch target issue on the entire site (hero dots were fixed previously). The fix is straightforward padding adjustment.

**Accessibility score is currently 100. Keep it there.**

## FILES
- `src/components/landing/Footer.tsx` (ONLY file to modify)

## DO NOT TOUCH
- Footer content (text, links, phone number, email, address)
- Footer layout structure (3-column on desktop, stacked on mobile)
- Social media icons (these already have scale+bg hover effects)
- Copyright line
- Any other component file
- The phone number is 248-379-5156 — this is CORRECT, do not change it

## TASK 1: Increase Quick Link Touch Targets to 44px

### Problem
Footer quick links (Services, About, Projects, Contact, Request a Quote) have 36px height on mobile.

### Approach
1. Find the quick link `<a>` elements in the footer
2. Add `min-h-[44px] inline-flex items-center` to ensure 44px minimum touch target height
3. This should be applied only to the link elements, not the container — preserving the existing spacing and hover translate effect
4. Test: At 375px viewport, each link should have a bounding box height >= 44px

### Verification
- At 375px viewport: all quick links have `getBoundingClientRect().height >= 44`
- Existing hover translate effect still works
- Desktop layout unaffected
- `npm run build` passes

## TASK 2: Increase Contact Link Touch Targets to 44px

### Problem
Footer contact links (phone, email, address) also render at 36px on mobile.

### Approach
1. Find the contact `<a>` elements (tel:, mailto:, maps link)
2. Add `min-h-[44px] inline-flex items-center` to each
3. Preserve existing icon + text layout within each link

### Verification
- At 375px viewport: phone, email, and address links have height >= 44
- Icons still align properly with text
- `npm run build` passes

## TASK 3: Add aria-label to Address Link

### Problem
The address link points to Google Maps but the click destination isn't obvious to screen readers.

### Approach
1. Find the `<a>` element linking to Google Maps
2. Add `aria-label="View our location on Google Maps — 11677 Wayne Road, Suite 112, Romulus, MI 48174"`
3. Do NOT change the visible text

### Verification
- The maps link has an aria-label attribute
- `npm run build` passes

## GIT WORKFLOW
```
git checkout -b feat/footer-touch-targets
git add -A
git commit -m "fix: increase footer link touch targets to 44px WCAG AAA"
# Do NOT merge to main
```

## DEFINITION OF DONE
- [ ] All footer links meet 44px minimum touch target on mobile
- [ ] Address link has descriptive aria-label
- [ ] Existing hover effects preserved
- [ ] Desktop layout unaffected
- [ ] `npm run build` passes
- [ ] No changes to any other files
````

---

# AGENT 5: Materials Marquee SEO Cleanup

## Claude Code Prompt

```
Read the file SPEC-MARQUEE-SEO.md in the project root. Execute all tasks in order. Verify each task passes before moving to the next. Follow the git workflow at the bottom. Write a summary to tasks/todo.md when complete.
```

## Save as: `SPEC-MARQUEE-SEO.md`

````markdown
# SPEC: Materials Marquee SEO Cleanup

## CONTEXT
The Materials Marquee section displays 22 unique material names in an infinite scroll animation. To achieve the seamless loop, the items are duplicated 4-5x in the DOM, resulting in 120 DOM nodes. While this is standard for CSS marquee animations, the duplicate content is exposed to crawlers as raw text, which can appear as keyword stuffing.

The fix is to add a clean accessible list and hide the visual duplicates from assistive technology.

## FILES
- `src/components/landing/MaterialsMarquee.tsx` (ONLY file to modify)

## DO NOT TOUCH
- The marquee animation behavior (speed, direction, fade masks)
- The chip/tag styling
- The gradient background
- The list of materials
- The overflow-hidden containment
- Any other component file

## TASK 1: Add a Visually-Hidden Accessible List and Hide Marquee Duplicates

### Problem
Multiple copies of the material list are rendered for the infinite scroll effect. All copies are visible to screen readers, causing the same 22 items to be announced 4-5 times. Crawlers see the same text repeated.

### Approach
1. Before the marquee animation container, add a visually-hidden `<ul>` with all unique materials as `<li>` items
2. Style the `<ul>` with `sr-only` (Tailwind's screen-reader-only class): `className="sr-only"`
3. Add `aria-label="Materials we work with"` to the `<ul>`
4. Add `aria-hidden="true"` to the ENTIRE visual marquee animation container (since the sr-only list now provides the accessible content)

This is the cleanest approach:
- The sr-only `<ul>` provides clean, semantic, non-duplicated content to screen readers
- The entire visual marquee gets `aria-hidden="true"` since it's purely decorative animation of duplicate content
- Result: screen readers get a clean list, visual users get the animated marquee

### Verification
- The sr-only list is present in the DOM with all material names
- The sr-only list is not visible on screen at any viewport width
- The visual marquee container has `aria-hidden="true"`
- Visual marquee animation unchanged — test at both mobile (375px) and desktop (1280px)
- `npm run build` passes

## TASK 2: Add Section aria-label

### Problem
The materials section wrapper doesn't have a descriptive aria-label.

### Approach
1. Add `aria-label="Materials and products we install"` to the outermost section/container element of the marquee component

### Verification
- Section has the aria-label
- `npm run build` passes

## GIT WORKFLOW
```
git checkout -b feat/marquee-seo-fix
git add -A
git commit -m "fix: add accessible list for marquee materials, hide duplicates from AT"
# Do NOT merge to main
```

## DEFINITION OF DONE
- [ ] Screen readers encounter materials list exactly once (22 items)
- [ ] Visual marquee animation unchanged
- [ ] No duplicate content exposed to crawlers via accessible tree
- [ ] Section has descriptive aria-label
- [ ] `npm run build` passes
- [ ] No changes to any other files
````

---

## MERGE ORDER

After all 5 agents complete, merge branches to `main` in this order:

1. `feat/about-section-cleanup` — H2 fix is most important for SEO
2. `feat/cta-banner-polish` — Alt text fix for accessibility
3. `feat/footer-touch-targets` — Touch target WCAG compliance
4. `feat/marquee-seo-fix` — Duplicate content cleanup
5. `feat/project-showcase-polish` — Visual enhancement (lowest priority)

Each merge is to a different file, so order doesn't technically matter for conflicts — but this prioritizes correctness fixes over visual enhancements.

## POST-MERGE VERIFICATION

After all 5 branches are merged:
1. `npm run build` must pass clean
2. Deploy triggers automatically on push to main
3. Verify live at rmi-llc.net:
   - About H2: no duplicate text
   - CTA image: has alt text
   - Footer links: 44px touch targets on mobile
   - Marquee: single accessible list
   - Project cards: animate on scroll, headings link to #contact
4. Re-run PageSpeed — should maintain 95+ / 100 / 100 / 100
