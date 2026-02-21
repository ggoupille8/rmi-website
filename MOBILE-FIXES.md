An external audit flagged several issues on the production site. I’ve already verified that many are false flags — the fixes below cover only the REAL issues, plus a few items that need investigation first. Work through everything in order.

IMPORTANT: Stay on whatever branch you’re currently on (likely polish/landing-page-v2). Do NOT create a new branch.

---

## INVESTIGATE FIRST — Verify Before Fixing

Before writing any code, investigate these 4 items and report what you find. Only fix them if the issue is confirmed.

### INVESTIGATE A: Google Fonts / Font Loading

Check frontend/src/layouts/BaseLayout.astro for any Google Fonts `<link>` tags. If fonts are loaded from Google, check whether `font-display: swap` is set (either in the link URL parameter or in CSS @font-face rules). Also check if the site uses system fonts or self-hosted fonts instead.

If Google Fonts ARE loaded without font-display: swap, fix by either:

- Adding `&display=swap` to the Google Fonts URL, OR
- Adding `font-display: swap` to any @font-face declarations, OR
- Converting to self-hosted fonts with proper font-display

If no external fonts are loaded, skip this.

### INVESTIGATE B: Unnecessary React Hydration

Check whether the Services grid and Materials marquee are wrapped in `<astro-island>` tags with `client:load` or similar hydration directives. Look at:

- frontend/src/pages/index.astro — how Services.tsx and MaterialsMarquee.tsx are imported and rendered
- If either component uses NO client-side interactivity (no useState, useEffect, event handlers, or animations that require JS), it should be converted to an Astro component or use `client:visible` instead of `client:load`
- The Materials marquee uses CSS animation (not JS) so it may not need hydration at all
- The Services grid uses buttons — check if those buttons have click handlers or if they’re purely visual

Report what you find. If any component can be de-hydrated, do it. If they all need hydration, explain why and skip.

### INVESTIGATE C: Canonical Tag

Check the production `<head>` in BaseLayout.astro for `<link rel="canonical">`. The site is accessible via both rmi-llc.net and resourcemechanicalinsulation.com, so a canonical tag is important.

If missing, add: `<link rel="canonical" href="https://resourcemechanicalinsulation.com" />`
If already present, report the value and skip.

### INVESTIGATE D: Console 404 Errors

Run the dev server (`npm run dev` in the frontend directory) and open http://localhost:4321 in a headless browser or check the network tab equivalent. Look for any 404 errors for:

- favicon.ico
- manifest.json or site.webmanifest
- Any missing image or asset

If you find 404s, fix them by either adding the missing file or removing the reference. If none found, skip.

---

## FIX 1 — Mobile Menu Focus Trap (High Priority — Accessibility)

**File:** frontend/src/components/landing/Navbar.astro

When the mobile nav menu is open, pressing Tab moves focus through background page content instead of cycling through menu links. This is an accessibility failure — keyboard users can’t navigate the menu properly and focus escapes into invisible content behind the overlay.

**Fix:**

1. When the mobile menu opens, implement a focus trap that constrains Tab/Shift+Tab to cycle through only these elements:

- The close button (hamburger button in X state)
- The 4 nav links (Services, About, Contact, Request a Quote)

1. When the menu opens, move focus to the first nav link
1. When Escape is pressed, close the menu and return focus to the hamburger button
1. When the menu closes (via close button or link click), return focus to the hamburger button

Implementation approach — add this to the existing `<script>` tag in Navbar.astro:

```javascript
// After menu opens:
const focusableElements = mobileMenu.querySelectorAll("a, button");
const firstFocusable = focusableElements[0];
const lastFocusable = focusableElements[focusableElements.length - 1];

firstFocusable.focus();

function trapFocus(e) {
  if (e.key === "Tab") {
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  }
  if (e.key === "Escape") {
    closeMenu();
    hamburgerButton.focus();
  }
}

// Add when menu opens, remove when menu closes
mobileMenu.addEventListener("keydown", trapFocus);
```

Make sure to also include the close/hamburger button in the focusable elements list so users can close the menu via keyboard.

---

## FIX 2 — Footer Touch Targets (High Priority — Mobile)

**File:** frontend/src/components/landing/Footer.tsx

The footer “Quick Links” (Services, About, Request a Quote) have a computed height of approximately 32px, which is below the 44px minimum for mobile touch targets.

**Fix:** Add padding to footer nav links to increase their touch target size. Find the footer navigation links and add vertical padding:

Current link styling likely uses something like `text-sm` with minimal padding.

Add `py-2` to each footer nav link to bring the touch target to at least 44px. The visual text size stays the same — only the tappable area increases.

Also check the phone number and email links in the footer Contact section — they need the same treatment. Add `py-2 inline-block` if they’re inline links.

---

## FIX 3 — Landscape Stats Overflow (Medium Priority — Mobile)

**File:** frontend/src/components/landing/HeroFullWidth.tsx

At landscape mobile viewport (667x375), the 3 stats cards may not wrap correctly if they have fixed widths or nowrap on the flex container.

We recently changed stats to `flex-1 min-w-0` but the container still uses `flex` without `flex-wrap`. At very narrow heights (landscape), the cards might overflow.

**Fix:**

1. Add `flex-wrap` to the stats container so cards wrap if needed
1. Ensure the container and cards work at both 375px wide (portrait) and 667px wide by 375px tall (landscape)
1. Test: the 3 cards should fit in a single row at 667px width but gracefully wrap if the viewport is narrower

---

## FIX 4 — Form Submit Loading State (Medium Priority — UX)

**File:** frontend/src/components/landing/ContactForm.tsx

The “Send Message” button provides no visual feedback when clicked. Users can double-submit or think nothing happened.

**Fix:** Add a loading state to the submit button:

1. When the form submits, immediately:

- Disable the button (`disabled`)
- Change the button text to “Sending…” or show a spinner
- Add `opacity-70 cursor-not-allowed` classes

1. On success: show a success message (green checkmark + “Message sent! We’ll be in touch within 48 hours.”)
1. On error: re-enable the button, show an error message (“Something went wrong. Please try again or call us directly.”)
1. Prevent double-submission by checking the loading state before sending

The form already has a submit handler — find it and wrap it with loading state management. Use React useState for the loading/success/error states.

---

## FIX 5 — Global Focus Indicators (High Priority — Accessibility)

**Files:** frontend/src/styles/global.css and component files

Check if there’s a global `outline: none` or `outline: 0` on `:focus` that removes native browser focus indicators. Many Tailwind setups include this via Preflight.

**Fix:**

1. If there IS a global outline removal on `:focus`, add a visible `:focus-visible` style in global.css:

```css
/* Restore focus indicators for keyboard navigation */
:focus-visible {
  outline: 2px solid rgb(96, 165, 250); /* accent blue */
  outline-offset: 2px;
}
```

1. Check that all interactive elements (buttons, links, form inputs) have visible focus states. The site already uses `focus-visible:ring-2 focus-visible:ring-accent-400` on SOME elements (I verified this on the hamburger button). But it needs to be global.
1. Do NOT add focus styles to `:focus` (non-visible) — that creates ugly outlines on mouse click. Only style `:focus-visible` which activates on keyboard navigation.
1. Verify by tabbing through the entire page — every link, button, form field, and the mobile menu should show a visible focus ring.

---

## FIX 6 — Write Tests for All Fixes

Add Playwright tests to frontend/tests/mobile-qa-fixes.spec.ts (append to the existing file):

### Focus Trap Tests (mobile viewport)

- Open mobile menu, press Tab — focus stays within menu
- Press Shift+Tab at first menu item — focus wraps to last item
- Press Escape — menu closes and focus returns to hamburger button

### Footer Touch Target Tests (mobile viewport)

- All footer nav links have a computed height >= 44px
- Footer phone and email links have computed height >= 44px

### Landscape Stats Test (667x375 viewport)

- Stats container has no horizontal overflow
- All 3 stat labels are visible

### Form Loading State Tests

- Click submit with empty form — validation prevents submission, button stays enabled
- Fill form and submit — button shows loading state (disabled, text changes)

### Focus Indicator Tests

- Tab to the first nav link — it has a visible outline or ring
- Tab to a form input — it has a visible outline or ring
- Tab to the submit button — it has a visible outline or ring

---

## AFTER ALL FIXES:

1. Run `npm run build` — must pass
1. Run `npx playwright test` — goal is 0 failures
1. If visual baselines need updating: `npm run test:visual:update`
1. Run tests again to confirm 0 failures
1. Commit with message: “fix: focus trap, footer touch targets, landscape stats, form loading state, focus indicators, audit cleanup”
1. Do NOT push — report back full results including what you found in the INVESTIGATE items
