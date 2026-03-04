# SPEC: Contact Section Visual Upgrade

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

The contact section works well functionally but the visual presentation can be elevated. This spec adds contact info alongside the form, improves the section heading, and adds subtle visual touches.

**DO NOT MODIFY:** Contact form API logic, form field names, database schema, hero section, navbar, footer quick links, or analytics.

---

## TASK 1: Add Contact Info Panel Beside Form

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
1. Currently the contact form is a single centered column. Add a two-column layout on desktop: contact info on the left, form on the right.
2. Layout: `grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12`
3. Left column (contact info) should include:
   - Section heading: "Get in Touch" (or keep existing heading)
   - Brief text: "Ready to discuss your insulation project? Reach out directly or fill out the form and we'll get back to you within 48 hours."
   - Phone: icon + "419-705-6153" (clickable `tel:` link)
   - Email: icon + "fab@rmi-llc.net" (clickable `mailto:` link)
   - Address: icon + "11677 Wayne Road, Suite 112, Romulus, MI 48174"
   - Hours: icon + "Monday – Friday, 7:00 AM – 5:00 PM" (or whatever the actual hours are)
4. Right column: the existing form.
5. On mobile (below `lg`), the contact info stacks above the form.
6. Use simple SVG icons (phone, mail, map-pin, clock) from the existing icon set or inline SVGs.
7. Style the contact info text as `text-neutral-300` with `text-white` for the actual phone/email/address values.

### Verification
- `npm run build` passes.
- On desktop, contact info appears left of the form in a 2-column layout.
- On mobile, contact info stacks above the form.
- Phone and email are clickable links.
- The section heading is "Get in Touch" or similar.

---

## TASK 2: Contact Form — Section Heading Update

### Files
- `frontend/src/components/landing/ContactForm.tsx` or the parent that renders the heading

### Approach
1. Check the current contact section heading. If it says "Get a Quote" or "Contact Us", update it to "GET A QUOTE" with the same styling as other section headings (uppercase, tracking-wider, bold).
2. Add a subtitle below: "Share your project details and we'll get back to you within 48 hours."
3. Add the blue accent line divider (same pattern as other sections):
   ```html
   <div class="w-12 h-0.5 bg-accent-500 mx-auto mt-4"></div>
   ```
4. Center the heading and subtitle above the two-column layout.

### Verification
- `npm run build` passes.
- The contact section heading matches the style of other section headings.
- Blue accent divider appears below the heading.

---

## TASK 3: Contact Form — Floating Labels

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
1. Replace standard labels with floating labels that sit inside the input and animate upward when the field is focused or has a value.
2. Implementation pattern:
   ```tsx
   <div className="relative">
     <input
       id="name"
       className="peer w-full bg-neutral-800/50 border border-neutral-600 rounded-lg px-4 pt-5 pb-2 text-white placeholder-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
       placeholder="Full Name"
     />
     <label
       htmlFor="name"
       className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-400 peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
     >
       Full Name *
     </label>
   </div>
   ```
3. This uses Tailwind's `peer` modifier to animate the label based on focus and value state — no JavaScript needed.
4. Apply to all input fields: Name, Company, Email, Phone, and the textarea (Project Details).
5. For the select dropdown (Service Type), keep the standard label above it since floating labels don't work well with `<select>`.

### Verification
- `npm run build` passes.
- Labels float up when fields are focused.
- Labels stay up when fields have values.
- Labels return to center when fields are empty and unfocused.
- Select dropdown keeps its standard label.

---

## TASK 4: Contact Form — Input Styling Enhancement

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
1. Upgrade input styling to feel more premium:
   - Background: `bg-white/5` (very subtle, almost transparent)
   - Border: `border-neutral-600/50` default, `border-blue-500` on focus
   - Add a subtle inner glow on focus: `focus:shadow-[0_0_0_1px_rgba(59,130,246,0.3)]`
   - Text: `text-white` for entered values
   - Rounded: `rounded-lg` (already done likely)
2. Add smooth transition to all state changes: `transition-all duration-200`
3. The textarea should have a minimum height of 120px: `min-h-[120px]`
4. The submit button should have a hover scale effect: `hover:scale-[1.02]`

### Verification
- `npm run build` passes.
- Form inputs have a premium glass-like appearance.
- Focus states show blue border with subtle glow.
- Submit button scales slightly on hover.

---

## TASK 5: Contact Section — Background Image Overlay Adjustment

### Files
- `frontend/src/pages/index.astro` (wrapper div with background image)

### Approach
1. The contact section uses a shared background image with a `bg-black/70` overlay. Check if this is now only on the contact section (since the CTA banner was separated in the previous spec).
2. Adjust the overlay opacity to `bg-black/80` for better text readability over the background photo. The form inputs need sufficient contrast.
3. If the background image is still the full `cta-project.jpeg` photo, verify it looks good behind the contact form. The darker overlay (80%) will help.
4. Consider adding a subtle gradient overlay instead of flat black:
   ```
   bg-gradient-to-b from-black/85 via-black/75 to-black/85
   ```
   This adds depth while maintaining readability.

### Verification
- `npm run build` passes.
- Contact section has stronger overlay for better readability.
- Form inputs are clearly readable against the background.
- The transition from CTA banner (gradient) to contact section (photo) looks natural.

---

## EXECUTION ORDER
1. Task 2 (heading update — quick)
2. Task 5 (overlay adjustment — quick)
3. Task 4 (input styling — moderate)
4. Task 1 (contact info panel — layout change)
5. Task 3 (floating labels — most involved)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b feat/contact-visual-upgrade`
3. Make all changes, `npm run build`, `npm run test`
4. Update visual baselines if needed: `npm run test:visual:update`
5. `git add . && git commit -m "feat: contact section — info panel, floating labels, premium inputs, overlay"`
6. `git push origin feat/contact-visual-upgrade`
7. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] Contact info panel with phone/email/address appears beside form on desktop
- [ ] On mobile, contact info stacks above form
- [ ] Section heading matches other sections' style
- [ ] Floating labels animate on input fields
- [ ] Inputs have premium glass-like styling
- [ ] Background overlay is stronger for readability
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
