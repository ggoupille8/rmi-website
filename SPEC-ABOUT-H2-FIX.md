# SPEC: About Section H2 Fix + Scroll Animations

## CONTEXT
The About section ("Why Choose RMI") has a heading that renders duplicate text. The DOM produces "Why Choose Resource Mechanical InsulationWhy Choose Resource Mechanical Insulation" via an over-engineered sr-only + aria-hidden pattern. This is bad for SEO crawlers and text extraction.

## FILES
- `src/components/landing/About.tsx` (ONLY file to modify)

## DO NOT TOUCH
- Card content text (Safety-First, Emergency Response, Track Record, Union Workforce)
- Card colors (blue, red, amber, emerald)
- Card hover lift behavior
- Any other component file

## TASK 1: Fix the H2 Duplicate Text Rendering

### Problem
Current H2 innerHTML structure:
```html
<span class="sr-only">Why Choose Resource Mechanical Insulation</span>
<span aria-hidden="true">Why Choose <span class="hidden sm:inline">Resource Mechanical Insulation</span><span class="sm:hidden">RMI</span></span>
```
Crawlers and `textContent` see the heading twice.

### Approach
Replace the entire H2 inner content with:
```jsx
<h2 className="...existing tailwind classes preserved exactly...">
  Why Choose{' '}
  <span className="hidden sm:inline">Resource Mechanical Insulation</span>
  <span className="sm:hidden">RMI</span>
</h2>
```

This gives:
- Mobile: "Why Choose RMI" (clear, concise)
- Desktop: "Why Choose Resource Mechanical Insulation" (full name)
- Screen readers: whichever is currently displayed — both are perfectly valid
- Crawlers: no duplicate text
- Zero sr-only / aria-hidden complexity

**Preserve ALL existing Tailwind classes on the H2 element itself** (text size, font weight, color, margin, etc.). Only change what's INSIDE the H2 tags.

### Verification
- Open About.tsx, confirm H2 no longer has `sr-only` or `aria-hidden`
- `document.querySelector('[id="about"] h2').textContent` should NOT contain duplicate text
- `npm run build` passes

## TASK 2: Add Scroll-Triggered Entrance to About Cards

### Problem
The About cards appear statically. A staggered fade-up matches the polish level of the rest of the site.

### Approach
1. Add `useRef` + `useEffect` with IntersectionObserver (threshold: 0.1) watching the card grid container
2. `useState` for `isVisible` (boolean), set once, then unobserve
3. Each card gets conditional classes:
   - Before intersection: `opacity-0 translate-y-4`
   - After intersection: `opacity-100 translate-y-0`
   - Always: `transition-all duration-700 ease-out`
4. Stagger via inline `transitionDelay`: 0ms, 100ms, 200ms, 300ms
5. Fallback: if `typeof IntersectionObserver === 'undefined'`, set `isVisible = true` immediately
6. Do NOT override existing hover classes — add animation classes alongside them

### Verification
- Cards animate in on scroll with visible stagger
- Existing hover lift effect still works
- Cards are fully visible if JS is disabled (check the fallback)
- No CLS (opacity-0 elements still occupy space)
- `npm run build` passes

## GIT WORKFLOW
```
git checkout -b feat/about-h2-fix
git add -A
git commit -m "fix: remove duplicate H2 text in About section, add scroll animations"
# Do NOT merge to main
```

## DEFINITION OF DONE
- [ ] H2 textContent has no duplication
- [ ] Responsive text (RMI on mobile, full name on desktop)
- [ ] Cards animate in with stagger
- [ ] Hover lift preserved
- [ ] `npm run build` passes
- [ ] No changes to any other files
