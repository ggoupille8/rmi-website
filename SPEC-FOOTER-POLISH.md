# SPEC: Footer & Bottom-of-Page Polish

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

The footer is functional but basic. This spec adds visual depth, a mini-map/location embed, service area emphasis, and a more professional layout.

**DO NOT MODIFY:** Footer quick link destinations, social media URLs, contact information values, navbar, hero, or analytics.

---

## TASK 1: Footer — Visual Redesign with Gradient Background

### Files
- `frontend/src/components/landing/Footer.tsx` (or Footer.astro)

### Approach
1. The footer currently uses a flat dark background. Add a subtle gradient:
   ```
   bg-gradient-to-b from-neutral-900 to-neutral-950
   ```
2. Add a top border to separate the footer from the contact section:
   ```
   border-t border-neutral-800
   ```
3. Increase the footer padding for breathing room: `py-12 sm:py-16`
4. The three columns (Company Info, Quick Links, Contact) should have more spacing on desktop.

### Verification
- `npm run build` passes.
- Footer has a subtle gradient background and top border.
- Padding is generous (not cramped).

---

## TASK 2: Footer — Service Area Badge

### Files
- `frontend/src/components/landing/Footer.tsx`

### Approach
1. Below the "Serving Michigan, Ohio, Indiana & the Midwest" text in the Company Info column, add a visual badge or mini-callout:
   ```tsx
   <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-300">
     <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
       <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
     </svg>
     Serving the Midwest
   </div>
   ```
2. This adds a subtle branded element that emphasizes the service area without being heavy-handed.

### Verification
- `npm run build` passes.
- A blue-tinted "Serving the Midwest" badge appears in the footer's company info column.
- The badge is visually subtle, not distracting.

---

## TASK 3: Footer — Quick Links Hover Effect

### Files
- `frontend/src/components/landing/Footer.tsx`

### Approach
1. Add a subtle hover animation to footer quick links:
   - Default: `text-neutral-400`
   - Hover: `text-white` with a slight translate: `hover:translate-x-1`
   - Transition: `transition-all duration-200`
2. Add a small right-arrow indicator on hover:
   ```tsx
   <a className="group flex items-center gap-1 text-neutral-400 hover:text-white transition-all duration-200">
     <span className="group-hover:translate-x-1 transition-transform duration-200">{link.text}</span>
     <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
     </svg>
   </a>
   ```

### Verification
- `npm run build` passes.
- Footer links shift slightly right and show a small arrow on hover.
- Transition is smooth (200ms).

---

## TASK 4: Footer — Social Media Icons Enhancement

### Files
- `frontend/src/components/landing/Footer.tsx`

### Approach
1. The social media icons (LinkedIn, Facebook) currently render as plain icons. Add hover effects:
   - Default: `text-neutral-400 bg-neutral-800`
   - Hover: Platform-specific colors:
     - LinkedIn: `hover:bg-[#0077B5] hover:text-white`
     - Facebook: `hover:bg-[#1877F2] hover:text-white`
   - Add `transition-all duration-200` and a slight scale: `hover:scale-110`
2. Wrap each icon in a rounded container: `w-10 h-10 rounded-full flex items-center justify-center`
3. This makes the social icons look like proper branded buttons rather than plain icons.

### Verification
- `npm run build` passes.
- LinkedIn icon turns LinkedIn blue on hover.
- Facebook icon turns Facebook blue on hover.
- Both icons scale slightly on hover.
- Icons are inside rounded circular containers.

---

## TASK 5: Footer — Add Email Signup Teaser (Optional)

### Files
- `frontend/src/components/landing/Footer.tsx`

### Approach
1. Add a small "Stay Updated" section at the bottom of the footer, above the copyright line:
   ```tsx
   <div className="border-t border-neutral-800 pt-6 mt-6 text-center">
     <p className="text-sm text-neutral-400">
       Stay updated on our latest projects and services.
     </p>
     <p className="text-sm text-neutral-500 mt-1">
       Follow us on{' '}
       <a href="https://www.linkedin.com/company/resource-mechanical-insulation" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">
         LinkedIn
       </a>
       {' '}for industry insights and project updates.
     </p>
   </div>
   ```
2. This is NOT a newsletter signup form — it's just a text CTA encouraging LinkedIn follows. Keep it simple.
3. Position it between the main footer grid and the copyright line.

### Verification
- `npm run build` passes.
- "Stay Updated" text appears above the copyright line.
- LinkedIn link is clickable and opens in a new tab.

---

## EXECUTION ORDER
1. Task 1 (gradient bg — quick)
2. Task 3 (link hover — quick)
3. Task 4 (social icons — moderate)
4. Task 2 (service area badge — small)
5. Task 5 (email teaser — small)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b feat/footer-polish`
3. Make all changes, `npm run build`, `npm run test`
4. Update visual baselines if needed: `npm run test:visual:update`
5. `git add . && git commit -m "feat: footer — gradient bg, link hover, social colors, service badge, stay updated"`
6. `git push origin feat/footer-polish`
7. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] Footer has gradient background and top border
- [ ] Quick links have hover translate + arrow animation
- [ ] Social icons have platform-specific hover colors in circular containers
- [ ] "Serving the Midwest" badge appears in company info
- [ ] "Stay Updated" text with LinkedIn CTA appears above copyright
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
