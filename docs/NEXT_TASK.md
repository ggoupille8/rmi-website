# Next Task
Type: UI Polish — Mobile-First Fine Tuning
Priority: High
Complexity: Medium
UPDATE_BASELINES: true
BASELINE_COMPONENTS: All sections
Created: 2026-02-23

## Objective
Make the mobile experience exceptional — better than desktop in feel and usability.
Most real users will arrive on phone. This pass focuses exclusively on 375px–414px
viewport quality. Take Playwright screenshots BEFORE and AFTER every fix.
No content changes. No desktop layout regressions.

## Files
### May Modify (only what's needed)
- src/components/landing/Navbar.astro
- src/components/landing/HeroFullWidth.tsx
- src/components/landing/Services.tsx
- src/components/landing/About.tsx
- src/components/landing/MaterialsMarquee.tsx
- src/components/landing/CTABanner.tsx
- src/components/landing/ContactForm.tsx
- src/components/landing/Footer.tsx
- src/components/landing/FloatingMobileCTA.tsx

### Never Touch
- src/content/site.ts

---

## Step 0 — Capture Before Screenshots
Before touching any code, use Playwright to capture screenshots of every section
at 375px viewport height 812px. Save as before-mobile-[section].png in /tmp.
This is mandatory — do not skip.

---

## Fix 1 — Navbar: hamburger menu quality
**Audit:** Open the hamburger menu at 375px. Check:
- Does the menu open smoothly with animation, or does it pop open instantly?
- Does it cover the full width cleanly?
- Are the menu items large enough to tap comfortably (min 48px height each)?
- Is there a visible close button or does it close on outside tap?
- Does the menu close after tapping a nav link?
- Is there a backdrop/overlay behind the menu?

**Fix:** Address any issues found. Minimum bar:
- Menu items must be at least 48px tall tap targets
- Smooth open/close animation (150-200ms)
- Menu closes on link tap
- Visual separation between menu items

## Fix 2 — Hero: mobile proportions and text sizing
**Audit:** At 375px check:
- Does the hero take up the right amount of screen — full viewport height or
  proportional? Does it feel too tall or too short?
- Is the RMI logo sized correctly — prominent but not overflowing?
- Is "Resource Mechanical Insulation" script text readable at this size?
- Is "Commercial & Industrial Insulation Experts" subtitle readable?
- Are the CTA buttons appropriately sized — "Request a Quote" should be
  wide and tap-friendly
- Do the phone/email icon buttons have adequate tap target size?
- Are the 3 stats (100+, 500+, 231K+) readable and well-proportioned?
- Is there enough vertical spacing between logo, subtitle, CTAs, and stats?

**Fix:** Tune font sizes, spacing, and layout for optimal mobile feel.
The hero should feel confident and premium on a phone screen.

## Fix 3 — Services: mobile list experience
**Audit:** At 375px check:
- Do service rows stack to single column properly?
- Are rows tall enough to tap comfortably?
- Is the icon + text layout clean in a single column?
- Is there enough padding inside each row?
- Does the section header + description text wrap cleanly?
- Is the section header font size appropriate (not too large, not too small)?

**Fix:** Tune row height, padding, text sizing for excellent mobile list feel.
Service rows should feel like a premium mobile list — spacious, tappable, clean.

## Fix 4 — About cards: mobile stacking
**Audit:** At 375px check:
- Do the 4 cards stack to single column?
- Is card padding adequate on mobile?
- Are the icons sized appropriately for mobile?
- Is card title text well-sized?
- Is body text readable (min 14px effective size, adequate line-height)?
- Is vertical spacing between stacked cards appropriate?
- Does the section heading wrap cleanly on narrow screens?

**Fix:** Polish card layout, text sizes, and spacing for mobile stacking.

## Fix 5 — Materials marquee: mobile feel
**Audit:** At 375px check:
- Do both marquee rows display at readable size?
- Are pill text sizes appropriate — readable but not oversized?
- Is the section heading size appropriate on mobile?
- Is the animation speed appropriate on mobile (not too fast to read)?
- Is there enough vertical padding in the section?

**Fix:** Tune pill sizing, animation speed, and section padding for mobile.
Consider slowing marquee animation slightly on mobile for better readability.

## Fix 6 — CTA banner: mobile impact
**Audit:** At 375px check:
- Does the headline text wrap cleanly? No orphaned single words on a line.
- Is the button full-width on mobile (it should span most of the screen width)?
- Is button text sized and padded for easy tapping?
- Is vertical padding proportional — banner should feel tight and impactful?

**Fix:** Ensure headline wraps cleanly, button is full or near-full width on mobile,
and the banner has appropriate mobile proportions.

## Fix 7 — Contact form: mobile keyboard and input experience
**Audit:** At 375px check:
- Are all input fields full-width?
- Is label text clearly associated and readable above each field?
- Is input font size at least 16px (critical — prevents iOS auto-zoom on focus)?
- Is the Project Type select full-width?
- Is the Project Details textarea a good height on mobile?
- Is the Send Message button full-width with good tap target height (min 48px)?
- Is there adequate spacing between fields?
- Does the form section have appropriate horizontal padding (not edge-to-edge)?

**Fix:** Ensure all inputs are 16px+ font size (iOS zoom prevention).
Make all fields full-width. Ensure Send Message is min 48px height on mobile.
Add appropriate bottom padding to the form section so the floating CTA button
doesn't overlap the submit button.

## Fix 8 — Footer: mobile layout
**Audit:** At 375px check:
- Do footer columns stack to single column?
- Is there appropriate spacing between stacked sections?
- Are Quick Links tap targets large enough (min 44px)?
- Is contact information readable and well-spaced?
- Does the copyright bar lay out correctly (text may need to center or stack)?
- Is "Back to top" accessible and sized appropriately?

**Fix:** Polish footer stacking, tap target sizes, and spacing for mobile.

## Fix 9 — Floating mobile CTA button
**Audit:** At 375px check:
- Is the floating phone CTA button positioned correctly — not overlapping
  the contact form's Send Message button when scrolled to the form?
- Is it at the right position (bottom-right, clear of browser chrome)?
- Is it sized correctly — big enough to tap, not so large it dominates?
- Does it disappear appropriately when the contact form is visible?

**Fix:** Ensure the floating CTA hides when the contact form section is in
view (use IntersectionObserver on the contact section). Correct position
if overlapping any content.

## Fix 10 — Scroll behavior and anchor offsets
**Audit:** Tap each navbar link (Services, About, Contact) and check:
- Does the page scroll smoothly to the correct section?
- Does the fixed navbar cover the section heading after scrolling?
  (The scroll target needs a negative offset equal to navbar height ~60px)
- Is scroll-behavior smooth (not instant jump)?

**Fix:** Add scroll-margin-top to each section anchor target equal to navbar
height so headings are never hidden behind the navbar after nav link taps.

---

## Acceptance Criteria

- [ ] Before screenshots captured for all sections at 375px
- [ ] Hamburger menu has 48px+ tap targets and smooth animation
- [ ] Hero text, buttons, and stats all well-proportioned at 375px
- [ ] Services rows are comfortable tap targets with clean layout
- [ ] About cards stack cleanly with readable text
- [ ] Marquee readable and appropriately paced on mobile
- [ ] CTA banner headline wraps cleanly, button full/near-full width
- [ ] All form inputs 16px+ font (iOS zoom prevention confirmed)
- [ ] Footer stacks cleanly with adequate tap targets
- [ ] Floating CTA hides when contact form is visible
- [ ] Navbar anchor links scroll to correct position (not obscured)
- [ ] After screenshots captured and compared to before
- [ ] npm run build passes (0 errors)
- [ ] npm run test passes
- [ ] Visual baselines updated
- [ ] PR created via gh CLI

## Test Requirements
- npm run build
- npm run test
- npm run test:visual:update
- All fixes
