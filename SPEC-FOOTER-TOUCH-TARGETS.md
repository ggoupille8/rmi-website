# SPEC: Footer Touch Target Fix + Email Update + Accessibility

## CONTEXT
Footer quick links and contact links render at 36px height on mobile — below the 44px WCAG AAA minimum. The hero dots were fixed to 44px previously; the footer is the last remaining gap.

Additionally, the footer email is being changed from `fab@rmi-llc.net` to `info@rmi-llc.net`. This is a shared mailbox already created in Microsoft 365 — only Graham receives it. He screens website leads before forwarding good ones to the estimating team. This change also needs to be reflected in the JSON-LD structured data in BaseLayout.astro.

**Phone number 248-379-5156 is CORRECT — do not change it.**

## FILES
- `src/components/landing/Footer.tsx` (primary)
- `src/layouts/BaseLayout.astro` (JSON-LD schema email update only)

## DO NOT TOUCH
- Footer layout (3-column desktop, stacked mobile)
- Social media icon styles (scale+bg hover already done)
- Copyright line
- Phone number (248-379-5156 — confirmed correct, do NOT change)
- Any other component file
- Any meta tags, canonical URLs, og tags, or anything else in BaseLayout.astro other than the JSON-LD email field

## TASK 1: Update Footer Email from fab@ to info@

### Problem
Footer currently shows `fab@rmi-llc.net` as the contact email. This needs to change to `info@rmi-llc.net`.

### Approach
1. Open `src/components/landing/Footer.tsx`
2. Find the mailto link — it will look something like:
   ```jsx
   <a href="mailto:fab@rmi-llc.net">fab@rmi-llc.net</a>
   ```
3. Change BOTH the `href` and the display text:
   ```jsx
   <a href="mailto:info@rmi-llc.net">info@rmi-llc.net</a>
   ```
4. Search the entire file for any other occurrence of `fab@rmi-llc.net` and replace with `info@rmi-llc.net`
5. Run `grep -n "fab@" src/components/landing/Footer.tsx` to confirm zero remaining occurrences

### Verification
- `grep "fab@" src/components/landing/Footer.tsx` returns nothing
- `grep "info@rmi-llc.net" src/components/landing/Footer.tsx` returns the mailto link
- `npm run build` passes

## TASK 2: Update JSON-LD Email in BaseLayout.astro

### Problem
The JSON-LD LocalBusiness structured data in BaseLayout.astro has `"email":"fab@rmi-llc.net"`. This should match the footer.

### Approach
1. Open `src/layouts/BaseLayout.astro`
2. Find the `<script type="application/ld+json">` block
3. Change `"email":"fab@rmi-llc.net"` to `"email":"info@rmi-llc.net"`
4. Do NOT touch anything else in this file — no meta tags, no canonical URLs, no og tags, nothing

### Verification
- `grep "fab@" src/layouts/BaseLayout.astro` returns nothing
- `grep "info@rmi-llc.net" src/layouts/BaseLayout.astro` returns the JSON-LD email
- `npm run build` passes

## TASK 3: Also Check and Update site.ts If Email Is Defined There

### Problem
The email might be centrally defined in `src/content/site.ts` (or similar content file).

### Approach
1. Run `grep -rn "fab@rmi-llc.net" src/` to find ALL occurrences across the entire src directory
2. For any file found that is Footer.tsx or BaseLayout.astro — already handled above
3. For any OTHER file found (e.g., `site.ts`, `config.ts`, `content.ts`):
   - If it's a data/config file that feeds the footer or JSON-LD, change `fab@rmi-llc.net` to `info@rmi-llc.net`
   - If it's the ContactForm.tsx, do NOT change it — the contact form submission may route to a different email and should be left alone
4. Run `grep -rn "fab@rmi-llc.net" src/` again — the ONLY remaining occurrence should be in ContactForm.tsx (if any). Footer, BaseLayout, and any content/config files should show `info@`.

### Verification
- `grep -rn "fab@rmi-llc.net" src/` shows zero results in Footer.tsx, BaseLayout.astro, and any content/config files
- ContactForm.tsx is untouched (or if it doesn't reference fab@, this is N/A)
- `npm run build` passes

## TASK 4: Increase Quick Link Touch Targets

### Problem
Footer quick links have 36px height on mobile.

### Approach
1. Find quick link `<a>` elements (Services, About, Projects, Contact, Request a Quote)
2. Add `min-h-[44px] inline-flex items-center` to each
3. Apply only to the `<a>` tags, not the wrapping container
4. Preserve existing hover translate effect

### Verification
- Quick links have minimum 44px height at narrow viewports
- Hover translate still works
- Desktop layout unaffected
- `npm run build` passes

## TASK 5: Increase Contact Link Touch Targets

### Problem
Phone, email, and address links also at 36px.

### Approach
1. Add `min-h-[44px] inline-flex items-center` to tel:, mailto:, and maps `<a>` elements
2. Preserve icon + text alignment

### Verification
- All contact links meet 44px minimum height
- Icons stay aligned with text
- `npm run build` passes

## TASK 6: Add Descriptive aria-label to Google Maps Link

### Approach
Add `aria-label="View our location on Google Maps"` to the address link.

### Verification
- Maps link has aria-label
- `npm run build` passes

## GIT WORKFLOW
```
git checkout -b feat/footer-touch-targets
git add -A
git commit -m "fix: update contact email to info@, increase footer touch targets to 44px"
# Do NOT merge to main
```

## DEFINITION OF DONE
- [ ] Footer email changed from fab@ to info@rmi-llc.net (both href and display text)
- [ ] JSON-LD email in BaseLayout.astro changed to info@rmi-llc.net
- [ ] All other src/ references to fab@ updated (except ContactForm.tsx)
- [ ] All footer links >= 44px touch target on mobile
- [ ] Maps link has aria-label
- [ ] Hover effects preserved
- [ ] Phone number unchanged (248-379-5156)
- [ ] `npm run build` passes
