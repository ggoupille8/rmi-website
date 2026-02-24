# Current Task
Type: Bug Fix + UI Polish
Priority: High
Complexity: Medium
UPDATE_BASELINES: true
BASELINE_COMPONENTS: Navbar, Hero, Services, Footer
Created: 2026-02-23

## Objective
Fix 2 functional bugs and 6 visual polish issues found during live review.
Work through each fix independently. Verify each before moving on.

## Files
### May Modify
- src/components/landing/HeroFullWidth.tsx
- src/components/landing/Navbar.astro
- src/components/landing/Services.tsx
- src/components/landing/Footer.tsx

### Never Touch
- src/content/site.ts
- src/components/landing/ContactForm.tsx
- src/components/landing/About.tsx
- src/components/landing/MaterialsMarquee.tsx

---

## BUG 1 — "Back to top" button in footer does nothing
**Problem:** Clicking "Back to top ↑" in the footer does not scroll the page
to the top.
**Fix:** Find the back-to-top button in Footer.tsx. Ensure it has an onClick
handler that calls `window.scrollTo({ top: 0, behavior: 'smooth' })`. If it's
an anchor tag pointing to `#`, replace with a proper button with the scroll
handler. Verify it works by checking the element type and handler in the DOM.

## BUG 2 — "Request a Quote" inside service cards does nothing
**Problem:** The "Request a Quote" link/button visible inside each service card
does not navigate to the contact form or do anything when clicked.
**Fix:** Find the element in Services.tsx. It should scroll smoothly to the
`#contact` section: `document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })`.
If it's an anchor tag, set `href="#contact"`. Verify the scroll-margin-top on
#contact is set (it is — 56px) so it lands correctly below the navbar.

## POLISH 1 — Hero slideshow transition is too fast and flashy
**Problem:** When the background image transitions between slides, the crossfade
is too quick and jarring — almost a flash rather than a smooth dissolve.
**Fix:** Find the slideshow transition logic in HeroFullWidth.tsx. 
- Increase the crossfade/transition duration to at least 1000-1500ms (currently
  likely 300-500ms)
- Increase the time each slide is displayed — minimum 5-6 seconds per slide
- The transition should be a smooth opacity crossfade with no visible flash
- If using CSS transitions, use `transition: opacity 1.2s ease-in-out`
- Ensure the outgoing slide fades out fully before or as the new one fades in
  (not a hard cut)

## POLISH 2 — Hero subtitle text needs to be bolder and more readable
**Problem:** "Commercial & Industrial Insulation Experts" subtitle is hard to
read directly against the photo background now that the overlay card is removed.
The current font weight is too thin.
**Fix:** In HeroFullWidth.tsx, find the subtitle element. Change from current
weight (likely font-normal or font-light) to font-semibold or font-bold.
Also increase text-shadow intensity on this element specifically — the shadow
needs to be stronger than the logo above it since the text is smaller and harder
to read. Example: `textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,1)'`

## POLISH 3 — RMI logo drop shadow needs to be larger/more offset
**Problem:** The black shadow logo behind the white RMI logo is too subtle —
needs to be slightly larger and more offset to create better separation and
visual depth. Currently the black-on-white separation is too tight.
**Fix:** In HeroFullWidth.tsx, find the drop-shadow or duplicate logo element.
Increase the shadow spread and/or offset. If using CSS filter drop-shadow,
increase the blur radius and offset values. Target: clearly visible black
outline/shadow that frames the white logo without looking heavy.
Example: `filter: drop-shadow(3px 3px 6px rgba(0,0,0,1)) drop-shadow(-1px -1px 4px rgba(0,0,0,0.8))`

## POLISH 4 — Hero stats need tighter, more transparent containers
**Problem:** The stat number/label groupings take up too much vertical space
on the hero, covering too much of the background photo. The pill/container
backgrounds (if any remain) need to be more transparent or removed.
**Fix:** In HeroFullWidth.tsx, find the stats container:
- Reduce vertical padding on each stat item — they should be compact
- If any background remains on stat containers, reduce opacity to max 15%
  or remove entirely (rely on text-shadow for readability)
- Reduce the gap between the 3 stats horizontally
- The overall stats bar should take up minimal vertical space — just the
  numbers and labels, nothing more

## POLISH 5 — Navbar bottom edge needs more definition
**Problem:** The navbar border/separator at the bottom is too subtle — the
transition between navbar and page content isn't crisp enough.
**Fix:** In Navbar.astro, find the bottom border class. Increase from current
subtle border to a more visible edge:
- Use `border-b border-neutral-600` or `border-b-2 border-neutral-700`
- Or add a subtle box-shadow: `shadow: 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.4)`
- The navbar should feel anchored and solid, clearly separated from content

## POLISH 6 — "Request a Quote" navbar button needs subtle downward anchor on scroll
**Problem:** The "Request a Quote" button in the navbar jumps or feels
unanchored when the page transitions between scrolled and non-scrolled states.
It needs to feel slightly anchored/settled — not floating.
**Fix:** In Navbar.astro, check the scrolled state styling on the CTA button.
Ensure the button has a consistent vertical position and padding that doesn't
shift when the navbar transitions between transparent-on-hero and solid-on-scroll
states. If the navbar height changes on scroll, lock it to a fixed height so
content doesn't shift. Add `transition: all 200ms ease` to the button if not
already present so any size changes animate smoothly rather than jumping.

---

## Acceptance Criteria

- [ ] Implemented — [ ] Verified: "Back to top" scrolls to page top smoothly
- [ ] Implemented — [ ] Verified: Service card "Request a Quote" scrolls to #contact
- [ ] Implemented — [ ] Verified: Hero slideshow transition is slow crossfade (1.2s+)
- [ ] Implemented — [ ] Verified: Each slide displays for 5+ seconds before transitioning
- [ ] Implemented — [ ] Verified: Subtitle text is bold and clearly readable against photo
- [ ] Implemented — [ ] Verified: Text shadow on subtitle is strong enough at all slides
- [ ] Implemented — [ ] Verified: RMI logo drop shadow is larger and more visible
- [ ] Implemented — [ ] Verified: Stats are compact and take minimal vertical space
- [ ] Implemented — [ ] Verified: Navbar bottom border is clearly visible and crisp
- [ ] Implemented — [ ] Verified: Navbar CTA button transitions smoothly without jumping
- [ ] Implemented — [ ] Verified: npm run build passes (0 errors)
- [ ] Implemented — [ ] Verified: npm run test passes
- [ ] Implemented — [ ] Verified: Visual baselines updated
- [ ] Implemented — [ ] Verified: PR created via gh CLI

## Test Requirements
- npm run build
- npm run test
- npm run test:visual:update
- Manually verify both bugs are fixed by simulating clicks in Playwright
- Verify slideshow at multiple transition cycles
- Verify at 375px and 1280px

## Constraints
- Do not change any text content
- Dark mode only
- Hero changes must not reduce text readability
- Manual PR merge — do not auto-merge
- Fix bugs first (BUG 1, BUG 2), then polish items

## Completion Report
[Claude Code fills in — must confirm both bugs verified fixed via DOM inspection
and note exact transition duration values set on slideshow]