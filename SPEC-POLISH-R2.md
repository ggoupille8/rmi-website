# CLAUDE CODE PROMPT
# Save this file to your project root as SPEC-POLISH-R2.md, then paste the prompt below into Claude Code:
#
# Read the file `SPEC-POLISH-R2.md` in the project root. This is an 8-task polish spec from a production audit. The previous deep polish run marked several items as "already done" but they are NOT present in production — verify each task against the actual source code and fix what's missing. Execute tasks in the specified order. Commit each separately. Branch: fix/polish-r2. Do NOT merge to main. Write a summary to tasks/todo.md when complete.
#

# SPEC: Polish Round 2 — Production Verification Failures + Remaining Issues

## CONTEXT

Production audit of https://rmi-llc.net on Feb 27, 2026 AFTER merging fix/deep-polish to main. The deep polish run reported 9/9 tasks complete, but production verification shows several fixes are NOT deployed. Items marked "Already done" by Claude Code were NOT actually implemented — they need to be done now. Additionally, the marquee mask is still insufficient for long chip labels.

### What DID land from deep-polish:
- ✅ Stale file cleanup + TS error fixes
- ✅ Marquee fade mask widened (from 120px → 152px) — but still not enough
- ✅ Section spacing normalized (Services/About: 80/80px, Materials/Projects: 64/64px)

### What did NOT land (reported as "Already done" but NOT in production):
- ❌ Form autocomplete attributes — ALL fields still missing autocomplete (except honeypot)
- ❌ Service card aria-label + aria-haspopup — zero buttons have these attributes
- ❌ Logo optimization — still serving 1920x1080 PNG (1.1MB+ for a 40px display)

---

## TASK 1: Fix Marquee Fade Mask — Use Percentage-Based Stops

### Problem
The current mask uses `clamp(100px, 20vw, 250px)` which resolves to 152px at 864px viewport. Material chip labels like "Acoustic Control (Mass Loaded Vinyl, Lead-Free)" are ~350px wide. At 152px fade, the first half of that chip is still fully readable at the edge. The clamp approach keeps failing because chip widths vary wildly — some are 100px, some are 350px.

### Root Cause
Using pixel/vw values for the mask doesn't account for chip width variation. A percentage-based approach is more robust.

### Files
- `frontend/src/components/landing/MaterialsMarquee.tsx`

### Approach
Change the mask gradient to use percentage-based stops instead of pixel clamp:
```
linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)
```
This reserves 20% of the container width on each side for the fade zone. At 864px that's ~173px. At 375px mobile that's 75px. At 1280px desktop that's 256px.

Update the inline style on the `.service-ticker` parent div (the one with `className="relative overflow-hidden"`):
```tsx
style={{
  maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)'
}}
```

### What NOT to Change
- Do not change marquee animation speed, direction, or chip content.
- Do not change the overflow-hidden on the container.

### Verification
- `npm run build` passes
- At ANY viewport width: text at the very edges should be fully transparent or nearly invisible
- The center 60% of the marquee should show chips clearly
- No partial chip labels should be readable at the boundaries

### Commit
`fix: use percentage-based marquee fade mask for consistent edge coverage`

---

## TASK 2: Add Autocomplete Attributes to Contact Form

### Problem
Production verification confirms ALL form fields (except honeypot) have NO autocomplete attribute. Claude Code's deep polish reported this as "Already done" but it is NOT.

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
Open the file and verify: are autocomplete attributes present? If they are, they may have been added in a way that doesn't render (e.g., wrong prop name, conditional logic, etc.). If they are truly missing, add them.

Add to each input/select/textarea element:

| Field | `name` attr | Add `autocomplete` attr |
|-------|-------------|------------------------|
| Name | `name` | `"name"` |
| Company | `company` | `"organization"` |
| Email | `email` | `"email"` |
| Phone | `phone` | `"tel"` |
| Project Type | `projectType` | `"off"` |
| Message | `message` | `"off"` |
| Honeypot (website) | `website` | Already has `"off"` ✓ |

### What NOT to Change
- Do not change field labels, placeholders, validation, or submission logic.

### Verification
Run this in browser console after build to confirm:
```js
[...document.querySelectorAll('form input, form select, form textarea')].map(i => `${i.name}: ${i.autocomplete}`)
```
Expected: `["name: name", "company: organization", "email: email", "phone: tel", "projectType: off", "message: off", "website: off"]`

### Commit
`fix: add autocomplete attributes to contact form fields`

---

## TASK 3: Add aria-label and aria-haspopup to Service Card Buttons

### Problem
The 9 service card `<button>` elements have NO aria-label and NO aria-haspopup. Claude Code reported this as already done but production shows zero buttons with these attributes.

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
Open the file and check: are the aria attributes present in the source? If added but not rendering, debug why. If missing, add them.

For each service card button, add:
```tsx
<button
  aria-label={`Learn more about ${service.title}`}
  aria-haspopup="dialog"
  // ... existing props
>
```

The exact property name for the title may vary — check what the service object calls its display name (could be `title`, `name`, `label`, etc).

### What NOT to Change
- Do not change button styling, click handlers, or modal behavior.

### Verification
```js
document.querySelectorAll('button[aria-haspopup="dialog"]').length
// Expected: 9
```

### Commit
`a11y: add aria-label and aria-haspopup to service card buttons`

---

## TASK 4: Optimize Navbar Logo Image

### Problem
`rmi-logo-mark.png` is 1920x1080 pixels (likely 200KB-1MB+) but displays at roughly 40x28px in the navbar. This is a massive waste of bandwidth on every single page load.

### Files
- `frontend/public/images/logo/rmi-logo-mark.png` (source)
- `frontend/src/components/landing/Navbar.astro` (the `<img>` tag)

### Approach
1. First, check actual file size: `ls -la frontend/public/images/logo/rmi-logo-mark.png`
2. Check what the img element looks like in Navbar.astro — what classes/width/height are set.
3. Create optimized versions. Use a Node.js script since sharp-cli may not be available:

```js
// optimize-logo.mjs
import sharp from 'sharp';

// Create 2x retina version (logo displays at ~40px, so 80px is plenty for retina)
await sharp('frontend/public/images/logo/rmi-logo-mark.png')
  .resize(160) // width 160, height auto
  .webp({ quality: 85 })
  .toFile('frontend/public/images/logo/rmi-logo-mark-optimized.webp');

await sharp('frontend/public/images/logo/rmi-logo-mark.png')
  .resize(160)
  .png({ compressionLevel: 9 })
  .toFile('frontend/public/images/logo/rmi-logo-mark-optimized.png');

console.log('Done');
```

If `sharp` is not installed: `npm install sharp --save-dev` (it's likely already a dependency of Astro).

4. Update Navbar.astro to use a `<picture>` element:
```html
<picture>
  <source srcset="/images/logo/rmi-logo-mark-optimized.webp" type="image/webp" />
  <img src="/images/logo/rmi-logo-mark-optimized.png" alt="Resource Mechanical Insulation" ... />
</picture>
```

5. Keep the original full-res file — it may be used for OG image or print materials.

### What NOT to Change
- Do not change the logo's visual size, position, or alt text in the navbar.
- Do not delete the original high-res file.

### Verification
- Logo renders correctly in navbar at all viewport sizes
- New file size under 10KB (optimized.webp should be 2-5KB)
- `npm run build` passes
- The original 1920px file is NOT referenced in any `<img>` or `<source>` tag

### Commit
`perf: optimize navbar logo from 1920px to 160px (saves ~200KB per load)`

---

## TASK 5: Add Focus-Visible Outlines to All Interactive Elements

### Problem
Keyboard navigation testing revealed that focus outlines on interactive elements are inconsistent or missing. Some buttons show browser default outlines, some show nothing. For WCAG AAA compliance (which this site targets), all focusable elements need a clearly visible focus indicator.

### Files
- `frontend/src/styles/global.css` (or wherever global styles live — check Tailwind config)
- May need to add a utility class or global rule

### Approach
Add a global focus-visible rule that applies a consistent, high-contrast focus ring to all interactive elements:

```css
/* Global focus-visible ring for keyboard navigation */
:focus-visible {
  outline: 2px solid #3B82F6; /* blue-500, matches the site's accent blue */
  outline-offset: 2px;
}

/* Remove default focus for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

Check if Tailwind's `@apply` or `ring` utilities are already used for focus states. If so, make them consistent. The goal: every link, button, and form field should show a visible blue ring when focused via keyboard (Tab key), but NOT when clicked with a mouse.

### What NOT to Change
- Do not change hover states, active states, or click handlers.
- Do not remove existing focus styles that are already correct.

### Verification
1. Load the page and press Tab repeatedly
2. Every link in the navbar should show a blue ring when focused
3. Service card buttons should show focus ring
4. Form fields should show focus ring
5. Footer links should show focus ring
6. No focus ring visible when clicking with mouse

### Commit
`a11y: add consistent focus-visible outlines for keyboard navigation`

---

## TASK 6: Add Error Boundary and Loading States to React Islands

### Problem
The React islands (HeroFullWidth, Services, ContactForm, etc.) are client-side hydrated components. If any JavaScript error occurs during hydration, the entire component silently fails. There are no error boundaries catching these failures, and no loading/skeleton states while JavaScript loads.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`
- `frontend/src/components/landing/Services.tsx`
- `frontend/src/components/landing/ContactForm.tsx`
- `frontend/src/components/landing/FloatingMobileCTA.tsx`
- Create: `frontend/src/components/ErrorBoundary.tsx`

### Approach
1. Create a simple ErrorBoundary component:
```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Component error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}
```

2. Wrap each React island's content in an ErrorBoundary in `index.astro`:
```astro
<ErrorBoundary client:load>
  <HeroFullWidth client:load />
</ErrorBoundary>
```

If Astro doesn't support wrapping islands this way, wrap the content INSIDE each component instead:
```tsx
// Inside HeroFullWidth.tsx
export default function HeroFullWidth() {
  return (
    <ErrorBoundary fallback={<div className="min-h-[80dvh] bg-neutral-950" />}>
      {/* existing content */}
    </ErrorBoundary>
  );
}
```

3. For the ContactForm specifically, add a meaningful fallback:
```tsx
<ErrorBoundary fallback={
  <div className="text-center py-8">
    <p className="text-neutral-400">Unable to load form. Please call <a href="tel:+12483795156" className="text-blue-400">248-379-5156</a> or email <a href="mailto:info@rmi-llc.net" className="text-blue-400">info@rmi-llc.net</a>.</p>
  </div>
}>
```

### What NOT to Change
- Do not change component behavior when there are no errors.
- Do not change visual appearance of working components.

### Verification
- `npm run build` passes
- Normal page load looks identical (error boundaries are invisible when no errors)
- To test: temporarily add `throw new Error('test')` inside a component, verify fallback renders instead of blank space, then remove the test error

### Commit
`fix: add ErrorBoundary to React islands with meaningful fallbacks`

---

## TASK 7: Add rel="noopener noreferrer" to All External Links

### Problem
While the footer social links correctly have `rel="noopener noreferrer"`, other external links on the page may not. Need a sweep to ensure ALL external links (target="_blank") have proper rel attributes for security.

### Files
- All `.tsx` and `.astro` files that contain `<a>` tags

### Approach
1. Search the codebase: `grep -rn 'target="_blank"' frontend/src/` 
2. For each match, verify it also has `rel="noopener noreferrer"`
3. If any are missing, add the attribute
4. Also check for any external links that DON'T use target="_blank" but should (links to linkedin.com, facebook.com, google.com, etc.)

### What NOT to Change
- Do not change internal anchor links (#services, #contact, etc.)
- Do not add target="_blank" to internal navigation

### Verification
```bash
# All target="_blank" should have rel="noopener noreferrer"
grep -rn 'target="_blank"' frontend/src/ | grep -v 'noopener'
# Expected: zero results
```

### Commit
`security: ensure all external links have rel="noopener noreferrer"`

---

## TASK 8: Run Full Lighthouse Audit and Fix Flagged Issues

### Problem
We haven't run a Lighthouse audit since the deep polish changes. Need to check Performance, Accessibility, Best Practices, and SEO scores and fix anything that dropped.

### Files
- Various, depending on what Lighthouse flags

### Approach
1. Build the production site: `npm run build`
2. Serve it locally: `npx serve frontend/dist` (or however the Astro build output is served)
3. Run Lighthouse from CLI:
```bash
npx lighthouse http://localhost:4321 --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless --no-sandbox"
```
4. If Lighthouse CLI is not available or doesn't work in this environment, check for issues manually:
   - Check all images have width/height attributes (CLS prevention)
   - Check all images have alt text
   - Check color contrast ratios on all text
   - Check that the page has no layout shifts on load
5. Fix any issues that score below 95 in any category
6. Common quick wins to check:
   - Add `width` and `height` attributes to all `<img>` tags to prevent CLS
   - Ensure hero images have `fetchpriority="high"`
   - Add `loading="lazy"` to all below-fold images (check this is already done)

### What NOT to Change
- Do not change content or copy
- Do not add new sections or features

### Verification
- `npm run build` passes
- All images have explicit width/height attributes OR are inside a sized container
- Hero image has `fetchpriority="high"` and `loading="eager"`
- Below-fold images have `loading="lazy"`

### Commit
`perf: fix Lighthouse-flagged issues (CLS, image attributes, priorities)`

---

## EXECUTION ORDER

Execute in this exact order:

1. **Task 1** — Marquee fade mask (CSS, quick, third attempt — get it right this time)
2. **Task 2** — Form autocomplete (HTML attributes, quick)
3. **Task 3** — Service card aria (HTML attributes, quick)
4. **Task 7** — External link security (grep + fix, quick)
5. **Task 5** — Focus-visible outlines (CSS, moderate)
6. **Task 4** — Logo optimization (image processing, moderate)
7. **Task 6** — Error boundaries (React components, moderate)
8. **Task 8** — Lighthouse audit (investigation + fixes, longest)

---

## GIT WORKFLOW

```bash
git checkout main
git pull origin main
git checkout -b fix/polish-r2

# Commit each task separately with the exact commit messages listed above
# This makes review easy — one commit per fix

git push origin fix/polish-r2

# Do NOT merge to main — Graham reviews and merges manually
```

---

## IMPORTANT NOTES FOR CLAUDE CODE

1. **Verify before claiming "already done"**: The previous run claimed several tasks were already done when they were NOT in the deployed code. For EVERY task, check the actual source file FIRST. If the change is truly present in the source, show the exact line. If not, implement it.

2. **Don't be lazy about the marquee mask**: This is the third attempt. The previous values of 120px and 152px both failed because chip labels vary from 100px to 350px wide. The percentage approach (20% / 80%) is the correct solution. Verify it visually works at 375px, 768px, and 1280px.

3. **Test EVERY change**: After each task, run `npm run build` to verify nothing broke. Don't batch and hope.

4. **Git commit messages must match exactly**: Use the commit messages specified in each task. This makes the review diff readable.

---

## FINAL STEPS

1. Run `npm run build` — zero errors, zero warnings
2. Run `npx tsc --noEmit` — zero errors
3. Run `npm run test` — report pass/fail count
4. If visual tests fail, update baselines: `npm run test:visual:update`
5. Re-run tests after baseline update
6. Write summary to `tasks/todo.md`
7. Push to `fix/polish-r2`
8. Do NOT merge to main

---

## DEFINITION OF DONE

- [ ] Marquee edges: zero readable text at boundaries at any viewport
- [ ] Form fields: all have correct autocomplete attributes (verify in DOM, not just source)
- [ ] Service cards: 9 buttons with aria-label and aria-haspopup="dialog"
- [ ] All external links: rel="noopener noreferrer"
- [ ] Focus-visible: consistent blue ring on all interactive elements via keyboard
- [ ] Logo: optimized file under 10KB, original not referenced in any img tag
- [ ] Error boundaries: all React islands wrapped, ContactForm has phone/email fallback
- [ ] Image attributes: width/height on all imgs, fetchpriority on hero, lazy on below-fold
- [ ] `npm run build` — zero errors
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Full test suite passes
- [ ] All on `fix/polish-r2` branch
- [ ] NOT merged to main
