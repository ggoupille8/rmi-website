# MOBILE-FIXES.md — Final Polish & Consistency Pass

**Date:** February 22, 2026
**Priority:** High — Finalize before next deploy
**Scope:** Hero slideshow, card transparency, transition visibility, visual consistency

> **Instructions for Claude Code:** Read this entire document first. Execute each fix in order. After all changes, run `npm run build` to verify no TypeScript errors, then run `npm run test` to check for regressions. Update visual regression baselines with `npm run test:visual:update` only after confirming the changes look correct. Commit as a single commit: `fix: final polish — glassmorphism cards, slideshow transitions, mobile hero crops`

---

## Fix 1: Hero Slideshow Transitions Not Visible on Desktop

### Problem

The `prefers-reduced-motion: reduce` CSS override in `global.css` sets `transition-duration: 0.01ms !important` on ALL elements. This kills the 2000ms crossfade between hero slides on desktop. The crossfade is an opacity-only transition — it does NOT cause vestibular discomfort and should be exempt from the blanket reduced-motion override.

The Ken Burns zoom animation IS correctly disabled by the JS-side `prefersReducedMotion` check in `HeroFullWidth.tsx`, which is fine. But the CSS `!important` override also prevents the crossfade from working.

### Root Cause

```css
/* global.css — line ~24 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important; /* ← This kills crossfade */
  }
}
```

### Fix

**File:** `frontend/src/styles/global.css`

Add a targeted exception for opacity-only transitions (crossfades) inside the reduced motion media query. The slideshow slide divs use the class pattern `transition-opacity duration-[2000ms]`. Add an override that restores a reasonable (shorter but visible) fade duration for opacity transitions:

```css
/* Inside the existing @media (prefers-reduced-motion: reduce) block */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Preserve crossfade transitions — opacity changes don't cause vestibular issues */
  .transition-opacity {
    transition-duration: 800ms !important;
  }
}
```

This allows the hero slideshow to still crossfade (at a quicker 800ms instead of 2000ms for reduced-motion users) while keeping all other motion-triggering transitions disabled.

**Also update the reduced-motion marquee block at the bottom of global.css.** No change needed there — it already has `animation-iteration-count: infinite !important` which is correct for the marquee.

---

## Fix 2: Hero Images — Mobile Object Position Tuning

### Problem

The hero images are landscape-oriented with varying aspect ratios:

- `hero-1.webp`: 2560×1440 (16:9) — very wide, loses subject on mobile crop
- `hero-2.webp`: 2016×1512 (4:3) — decent but subject may be off-center
- `hero-3.webp`: 1717×918 (1.87:1) — ultra-wide, severely cropped on mobile
- `hero-4.webp`: 1536×2048 (portrait) — works great on mobile, may lose top/bottom on desktop
- `hero-5.webp`: 2000×1500 (4:3) — similar to hero-2

On mobile (portrait viewport ~375×812), `object-fit: cover` crops the sides of wide images. The current `heroImagePositions` array has per-image mobile adjustments, but the positions need refinement to center on the actual subject matter.

### Fix

**File:** `frontend/src/components/landing/HeroFullWidth.tsx`

Update the `heroImagePositions` array. The key insight is that on mobile portrait, we need to shift the focal point to where the actual insulation work/equipment is visible:

```typescript
const heroImagePositions = [
  "object-[50%_65%] sm:object-center", // hero-1: equipment is in lower portion, shift down to avoid showing just ceiling/sky
  "object-[60%_45%] sm:object-center", // hero-2: pipes cluster right-of-center, shift right and slightly up
  "object-[35%_50%] sm:object-center", // hero-3: ultra-wide, subject left-of-center, shift left to capture it
  "object-[50%_35%] sm:object-center", // hero-4: portrait — on desktop, shift up to show more of the equipment top
  "object-[55%_40%] sm:object-center", // hero-5: similar to hero-2, slight right and up adjustment
];
```

**Important:** These positions should be verified visually on an actual mobile device or Chrome DevTools mobile emulation after applying. The exact percentages may need 1-2 iterations of fine-tuning.

---

## Fix 3: Glassmorphism Cards — Consistent Transparency Throughout

### Problem

The hero section uses glassmorphism (semi-transparent bg + backdrop-blur + subtle border), but every other section uses fully opaque cards:

- Hero content card: `bg-neutral-900/35` + `backdrop-blur-md` ✅
- Hero stat cards: `bg-neutral-900/25` + `backdrop-blur-sm` ✅
- Service cards: `bg-neutral-900` (fully opaque) ❌
- About cards: `bg-neutral-800` (fully opaque) ❌
- Contact form card: `bg-neutral-900` via `card-elevated` (fully opaque) ❌
- Materials marquee pills: `border-neutral-700/60` (no bg transparency) — fine as-is

The owner wants cards to be "mostly transparent" with a see-through quality throughout the site.

### Fix — Service Cards

**File:** `frontend/src/components/landing/Services.tsx`

Find the service card `<button>` element in the grid map. Change the background from opaque to glassmorphism:

**Current:**

```tsx
className =
  "flex items-center justify-center sm:justify-start gap-4 p-4 bg-neutral-900 border border-neutral-700 border-l-[3px] border-l-accent-500 hover:border-l-accent-400 hover:bg-neutral-800 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-500/10 transition-all duration-200 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset";
```

**Replace with:**

```tsx
className =
  "flex items-center justify-center sm:justify-start gap-4 p-4 bg-neutral-900/50 backdrop-blur-sm border border-neutral-700/50 border-l-[3px] border-l-accent-500 hover:border-l-accent-400 hover:bg-neutral-800/60 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-500/10 transition-all duration-200 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-inset";
```

Changes:

- `bg-neutral-900` → `bg-neutral-900/50` (50% opacity)
- Added `backdrop-blur-sm`
- `border-neutral-700` → `border-neutral-700/50` (softer border)
- `hover:bg-neutral-800` → `hover:bg-neutral-800/60`

### Fix — About Cards

**File:** `frontend/src/components/landing/About.tsx`

Find the feature card `<div>` in the features map. Change background:

**Current:**

```tsx
className =
  "relative bg-neutral-800 p-6 border border-neutral-700 hover:border-accent-500/30 hover:shadow-lg transition-all duration-300";
```

**Replace with:**

```tsx
className =
  "relative bg-neutral-800/40 backdrop-blur-sm p-6 border border-neutral-700/40 hover:border-accent-500/30 hover:bg-neutral-800/55 hover:shadow-lg transition-all duration-300";
```

Changes:

- `bg-neutral-800` → `bg-neutral-800/40` (40% opacity — more see-through)
- Added `backdrop-blur-sm`
- `border-neutral-700` → `border-neutral-700/40`
- Added `hover:bg-neutral-800/55` for subtle hover feedback

### Fix — Contact Form Card

**File:** `frontend/src/components/landing/ContactForm.tsx`

Find the card container div with `card-elevated` class:

**Current:**

```tsx
<div className="card-elevated p-4 sm:p-5 bg-neutral-900 border-neutral-700">
```

**Replace with:**

```tsx
<div className="card-elevated p-4 sm:p-5 bg-neutral-900/50 backdrop-blur-sm border-neutral-700/50">
```

Changes:

- `bg-neutral-900` → `bg-neutral-900/50`
- Added `backdrop-blur-sm`
- `border-neutral-700` → `border-neutral-700/50`

**Note:** The `card-elevated` class in `global.css` also sets `bg-neutral-900`. We need to update that base class too, OR override it inline (the inline classes should take precedence with Tailwind). However, to be safe and consistent:

**File:** `frontend/src/styles/global.css`

Update the `.card-elevated` component class:

**Current:**

```css
.card-elevated {
  @apply rounded-xl bg-neutral-900 p-8 shadow-lg border border-neutral-700;
}
```

**Replace with:**

```css
.card-elevated {
  @apply rounded-xl bg-neutral-900/50 backdrop-blur-sm p-8 shadow-lg border border-neutral-700/50;
}
```

### Fix — Service Modal (keep more opaque for readability)

**File:** `frontend/src/components/landing/Services.tsx`

The modal dialog should remain more opaque for reading comfort. Find the modal content div:

**Current:**

```tsx
className={`relative z-10 max-w-lg w-full mx-4 bg-neutral-900 rounded-2xl border border-neutral-700/50 shadow-2xl shadow-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
```

**Replace with:**

```tsx
className={`relative z-10 max-w-lg w-full mx-4 bg-neutral-900/80 backdrop-blur-md rounded-2xl border border-neutral-700/40 shadow-2xl shadow-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
```

Changes:

- `bg-neutral-900` → `bg-neutral-900/80` (80% — higher opacity for readability)
- Added `backdrop-blur-md`
- `border-neutral-700/50` → `border-neutral-700/40`

---

## Fix 4: Section Border & Background Consistency

### Problem

Sections have inconsistent border-top treatments and background patterns:

- Services: `bg-neutral-800`, no border-top
- About: `bg-neutral-950`, `border-t border-accent-600/30`
- Materials: `bg-neutral-900`, `border-t border-accent-500/30`
- CTA Banner: `bg-accent-900`, no border
- Contact: `bg-neutral-800`, no border-top
- Footer: `bg-neutral-950`, `border-t border-neutral-800/50`

### Fix — Standardize section dividers

Every content section should have a subtle accent border-top for visual rhythm. The CTA Banner and Footer are visually distinct enough to skip.

**File:** `frontend/src/components/landing/Services.tsx`

Find the section element:
**Current:**

```tsx
className = "py-12 sm:py-16 bg-neutral-800";
```

**Replace with:**

```tsx
className = "py-12 sm:py-16 bg-neutral-800 border-t border-accent-600/20";
```

**File:** `frontend/src/components/landing/ContactForm.tsx`

Find the section element:
**Current:**

```tsx
className = "py-12 sm:py-16 bg-neutral-800";
```

**Replace with:**

```tsx
className = "py-12 sm:py-16 bg-neutral-800 border-t border-accent-600/20";
```

---

## Fix 5: Form Input Consistency with Glassmorphism

### Problem

The contact form inputs use `bg-neutral-700` which is lighter than the card background, creating a raised look. With the card now being semi-transparent, the inputs should also adopt a semi-transparent style for consistency.

### Fix

**File:** `frontend/src/components/landing/ContactForm.tsx`

Find the `inputBase` constant:

**Current:**

```tsx
const inputBase =
  "block w-full rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 text-sm px-3 py-2.5 border bg-neutral-700 text-neutral-100 leading-relaxed min-w-0";
```

**Replace with:**

```tsx
const inputBase =
  "block w-full rounded-md shadow-sm focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 text-sm px-3 py-2.5 border bg-neutral-700/60 backdrop-blur-sm text-neutral-100 leading-relaxed min-w-0";
```

Change: `bg-neutral-700` → `bg-neutral-700/60` + `backdrop-blur-sm`

---

## Fix 6: Navbar Logo Link Consistency

### Problem (Minor)

The navbar logo image has inline `style` with `filter: brightness(0) invert(1)` on the hero logo AND Tailwind class `brightness-0 invert` on the navbar logo mark. These are functionally identical but use different approaches. Not a visual bug but worth noting for future maintenance.

### No code change needed — informational only.

---

## Verification Checklist

After applying all fixes, verify:

1. **Hero slideshow crossfade** — Should be visible on desktop even with `prefers-reduced-motion: reduce` enabled (test by toggling in Chrome DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion`)
2. **Ken Burns zoom** — Should still be disabled when reduced motion is preferred
3. **Mobile hero images** — Open Chrome DevTools, toggle device toolbar to iPhone 14 Pro (390×844), cycle through all 5 hero slides and verify subject matter is visible
4. **Service cards** — Should show slight transparency/glass effect on hover
5. **About cards** — Should be clearly see-through with text still readable
6. **Contact form card** — Semi-transparent with functional form inputs
7. **Service modal** — More opaque than cards (80%) for reading comfort
8. **Section borders** — All content sections should have subtle accent border-top
9. **Build passes** — `npm run build` with no errors
10. **Tests pass** — `npm run test` (expect visual regression failures — update baselines after visual verification)

---

## Files Modified Summary

| File                                                | Changes                                                         |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `frontend/src/styles/global.css`                    | Reduced-motion crossfade exception, card-elevated glassmorphism |
| `frontend/src/components/landing/HeroFullWidth.tsx` | Hero image mobile object-position tuning                        |
| `frontend/src/components/landing/Services.tsx`      | Service card + modal glassmorphism, section border              |
| `frontend/src/components/landing/About.tsx`         | About card glassmorphism                                        |
| `frontend/src/components/landing/ContactForm.tsx`   | Contact card + input glassmorphism, section border              |

---

## Notes

- The glassmorphism transparency values (40%, 50%, 80%) are starting points. If cards feel too transparent or text readability suffers, increase the opacity by 10-15%.
- Hero image positions are approximate. After applying, do a visual check on actual mobile viewport and adjust the percentage values in `heroImagePositions` as needed.
- The `prefers-reduced-motion` fix is intentionally targeted — only opacity transitions are exempted. Transform, position, and other motion-triggering transitions remain suppressed.
- Form input backdrop-blur may not render on all mobile browsers (Safari < 16). The `bg-neutral-700/60` fallback still provides adequate contrast.
