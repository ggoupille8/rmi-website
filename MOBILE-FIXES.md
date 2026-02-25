# FINAL POLISH & MERGE: Last Pass Before Production Push

Type: Final QA Polish + Git Merge
Priority: HIGH
Complexity: Low-Medium
Created: 2026-02-24

## Context

Stay on branch `style/heavy-polish-spacing`. This is the FINAL spec before merging to main. Fixes are small, targeted, and low-risk. After fixes are applied and verified, merge to main and push.

READ EACH FIX. Check the current code first. Only apply if the issue exists. Mark as "already correct" if already handled.

---

## FIX 1: Contact Section Scroll Margin Mismatch (BUG)

The `#contact` anchor has `scroll-mt-10` (40px) while `#services` and `#about` have `scroll-mt-14` (56px). The navbar is 56px tall. Clicking "Contact" in the navbar scrolls the heading 16px behind the navbar.

### File: frontend/src/components/landing/ContactForm.tsx (or wherever #contact id is set)

Find the element with `id="contact"` and its class containing `scroll-mt-10`.
Replace `scroll-mt-10` with `scroll-mt-14` to match services and about.

---

## FIX 2: Navbar Logo Image Oversized

The navbar logo (`rmi-logo-mark.png`) has a natural size of 1920x1080 — that's a full HD image being rendered at ~40px height. It works but ships unnecessary bytes. The logo should have explicit `width` and `height` attributes to prevent layout shift and help the browser allocate space before the image loads.

### File: frontend/src/components/landing/Navbar.astro

Find the `<img>` tag for the logo. Add explicit `width` and `height` attributes matching the rendered size. For example, if the logo renders at roughly 40px tall, set:

```
width="48" height="27"
```

(Adjust to match the actual aspect ratio — 1920/1080 = 16:9, so at 48px wide it'd be 27px tall, or at 40px tall it'd be 71px wide. Check the rendered size with getComputedStyle and set width/height accordingly.)

Also add `decoding="async"` if not present.

This doesn't reduce file size (a future optimization), but prevents CLS and improves Lighthouse scores.

---

## FIX 3: Service Cards Missing cursor-pointer

From the HEAVY-POLISH spec, service cards should have `cursor-pointer` to signal interactivity. This was in the spec but may not have been applied since they don't link anywhere yet. Check if the cards have `cursor-pointer`.

### File: frontend/src/components/landing/Services.tsx

If service cards don't have `cursor-pointer`, add it to each card wrapper's className. This signals that individual service pages are coming and gives hover states a reason to exist.

---

## FIX 4: Footer Contact Links — Phone and Email Should Be Clickable

Verify the phone number and email in the footer are `<a>` tags with proper `href`:
- Phone: `<a href="tel:+14197056153">419-705-6153</a>`
- Email: `<a href="mailto:fab@rmi-llc.net">fab@rmi-llc.net</a>`

### File: frontend/src/components/landing/Footer.tsx

If these are already links (check the interactive elements), verify they have `hover:text-accent-400 transition-colors duration-200` like other footer links.

If the address is not a link (it shouldn't be since it's informational), verify it's just `text-neutral-400` and NOT a link.

---

## FIX 5: Meta Description Length Check

The page title and meta description should be optimal for search results.

### File: frontend/src/layouts/BaseLayout.astro

Check:
- `<title>` tag: should be ≤60 characters for full display in SERPs
- `<meta name="description">`: should be 120-160 characters
- Both should contain "mechanical insulation", "Michigan", and a CTA-style phrase

If the title or description is too long, too short, or missing key terms, adjust. Do NOT change if already optimized — this is a check, not a rewrite.

---

## FIX 6: Lighthouse Performance Quick Wins

A few small tweaks that improve Lighthouse scores with zero visual impact:

### 6a. Add `font-display: swap` to any @font-face declarations

Check `frontend/src/styles/global.css` (or wherever fonts are loaded). If there are `@font-face` rules without `font-display: swap`, add it. If fonts are loaded via Google Fonts `<link>` tags, append `&display=swap` to the URL.

If no custom fonts are loaded (just system fonts via Tailwind), skip this.

### 6b. Verify preconnect hints

In BaseLayout.astro `<head>`, check for preconnect tags. If the site loads external resources (e.g., fonts, analytics), there should be corresponding preconnect hints:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
```

If no external resources are loaded, skip this.

### 6c. Ensure all images have explicit width and height

Check contact section image, hero images, and logo. All `<img>` tags should have `width` and `height` attributes to prevent CLS. The hero images may already have this. The contact photo should too.

---

## FIX 7: Open Graph Image Dimensions

Verify the OG image exists and is properly configured.

### File: frontend/src/layouts/BaseLayout.astro

Check:
- `<meta property="og:image">` points to a valid image URL (should be absolute: `https://rmi-llc.net/og-image.jpg`)
- `<meta property="og:image:width" content="1200">`
- `<meta property="og:image:height" content="630">`
- Twitter card is also set: `<meta name="twitter:card" content="summary_large_image">`

If the og:image URL uses `resourcemechanicalinsulation.com`, that's fine — just verify it's an absolute URL, not relative.

---

## FIX 8: Console Error Check

Run the dev server and check the browser console for any errors or warnings.

### Action:
Open http://localhost:4321 in the browser console. Look for:
- JavaScript errors (red)
- React warnings (yellow)
- 404s on resources
- Any deprecation warnings

If there are errors, fix them. If console is clean, note "no console errors" in the report.

---

## MERGE & PUSH

After all fixes are applied and verified:

### Step 1: Final build check
```bash
npm run build
```
Must pass with zero errors.

### Step 2: Run full test suite
```bash
npx playwright test
```
All tests must pass (flaky Firefox retry is acceptable if it passes on retry).

### Step 3: Update visual baselines if any visual changes were made
```bash
npx playwright test tests/visual/ --update-snapshots
npx playwright test tests/visual/
```

### Step 4: Commit the polish changes
```bash
git add -A
git commit -m "style: final polish pass — scroll margins, cursor states, image sizing, meta checks"
```

### Step 5: Merge to main
```bash
git checkout main
git pull origin main
git merge style/heavy-polish-spacing
```

### Step 6: Push to main
```bash
git push origin main
```

If the branch is protected and requires a PR:
```bash
git push origin style/heavy-polish-spacing
```
Then note that a PR needs to be created and approved.

---

## Checklist — Report Back

- [ ] Fix 1: Contact scroll-mt-14 (matched to services/about)
- [ ] Fix 2: Navbar logo width/height attributes + decoding="async"
- [ ] Fix 3: Service cards cursor-pointer
- [ ] Fix 4: Footer phone/email links verified as clickable with hover styles
- [ ] Fix 5: Meta title (≤60 chars) and description (120-160 chars) verified
- [ ] Fix 6a: font-display: swap (or N/A if no custom fonts)
- [ ] Fix 6b: Preconnect hints (or N/A if no external resources)
- [ ] Fix 6c: All images have explicit width/height
- [ ] Fix 7: OG image absolute URL + dimensions meta tags
- [ ] Fix 8: No console errors
- [ ] npm run build — PASS
- [ ] Playwright tests — PASS
- [ ] Visual baselines updated (if changed)
- [ ] Committed with descriptive message
- [ ] Merged to main (or branch pushed for PR)
- [ ] Pushed to origin

### Summary
List: files modified, fixes applied, fixes skipped, any issues found