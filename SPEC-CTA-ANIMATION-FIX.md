# SPEC: CTA Non-Composited Animation Fix + Alt Text

## CONTEXT
PageSpeed flags "Avoid non-composited animations — 1 animated element found" on both mobile and desktop. The culprit is the CTA banner's `gradient-shift` animation which animates `background-position-x` — a property that triggers repaint on every frame because it can't be promoted to the GPU compositor layer.

Additionally, the CTA image has `alt=""` (empty) which should be descriptive.

**This is the only non-composited animation on the site.** Fixing it removes the flag entirely.

## FILES
- `src/components/landing/CTABanner.tsx` (ONLY file to modify)

## DO NOT TOUCH
- The visual appearance of the gradient (colors, direction, overall look)
- The dot pattern overlay
- The button glow and hover effects
- Any other component file
- Image files

## TASK 1: Fix CTA Image Alt Text

### Problem
`alt=""` on the CTA image. Should be descriptive.

### Approach
1. Find the `<img>` in the CTA `<picture>` element
2. Change `alt=""` to `alt="Commercial insulation project in progress"`

### Verification
- `npm run build` passes
- Grep CTABanner.tsx for `alt=` — should show the new descriptive text

## TASK 2: Convert gradient-shift to GPU-Compositable Animation

### Problem
Current implementation:
```
className="... bg-gradient-to-r from-neutral-900 via-blue-950 to-neutral-900 bg-[length:200%_100%] animate-[gradient-shift_8s_ease_infinite]"
```
With keyframes:
```css
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
```

`background-position` is NOT compositable — it triggers repaint every frame.

### Approach
Replace the `background-position` animation with a `transform: translateX()` animation on a pseudo-element. This moves the work to the GPU compositor.

**Implementation:**

1. Remove from the `<section>` element:
   - `bg-gradient-to-r from-neutral-900 via-blue-950 to-neutral-900`
   - `bg-[length:200%_100%]`
   - `animate-[gradient-shift_8s_ease_infinite]`

2. Keep on the `<section>`:
   - `overflow-hidden` (add if not present — needed to clip the oversized pseudo-element)
   - All other classes (min-h, flex, items-center, justify-center, relative, z-10, etc.)
   - Set `bg-neutral-900` as the base background color

3. Add a new `<div>` as the FIRST child of the section (behind all content) for the gradient:
   ```jsx
   <div
     aria-hidden="true"
     className="absolute inset-0 w-[200%] bg-gradient-to-r from-neutral-900 via-blue-950 to-neutral-900 animate-[gradient-pan_8s_ease_infinite] pointer-events-none"
     style={{ willChange: 'transform' }}
   />
   ```

4. Add the new keyframes to `tailwind.config.mjs` or use inline Tailwind arbitrary values. Since this is a Tailwind-based project, the cleanest approach is:

   Check if `tailwind.config.mjs` (or `.ts` or `.js`) has a `theme.extend.keyframes` section. If so, add:
   ```js
   'gradient-pan': {
     '0%, 100%': { transform: 'translateX(0)' },
     '50%': { transform: 'translateX(-50%)' },
   }
   ```
   And under `theme.extend.animation`:
   ```js
   'gradient-pan': 'gradient-pan 8s ease infinite',
   ```

   **IMPORTANT:** If there is no `tailwind.config` file or the keyframes aren't defined there (they might be in a global CSS file), search for where `gradient-shift` is currently defined and put `gradient-pan` next to it. Run `grep -rn "gradient-shift" .` to find it.

   If keyframes are defined in a CSS file (like `src/styles/global.css`), add the new keyframes there AND the corresponding Tailwind class via arbitrary value syntax in the component.

5. Ensure the gradient div has `pointer-events-none` so it doesn't interfere with clicks on the button.

6. The content (heading, button, image) must sit ABOVE the gradient div. They likely already have `relative z-*` classes. If not, add `relative z-10` to the content container.

### Why This Works
`transform: translateX()` is one of the four compositable properties (transform, opacity, filter, will-change). The browser can animate it on the GPU without triggering layout or paint on the main thread. The gradient colors and visual effect look identical — we're just sliding the gradient left/right instead of changing background-position.

### Verification
- `npm run build` passes
- The CTA banner still shows the same animated blue gradient effect
- Run PageSpeed or Lighthouse locally — "Avoid non-composited animations" should no longer flag any elements
- The dot pattern overlay is still visible
- The button is still clickable with hover glow
- No visual difference in the gradient animation

### Error Recovery
If `tailwind.config` doesn't support keyframes easily:
- Use inline `@keyframes` in a `<style>` tag within the component (Astro/React supports this)
- Or define in `src/styles/global.css` if that file exists

## GIT WORKFLOW
```
git checkout -b feat/cta-composited-animation
git add -A
git commit -m "perf: convert CTA gradient to GPU-composited transform animation, fix alt text"
# Do NOT merge to main — Graham will merge
```

## IMPORTANT: FILE SCOPE
This spec may need to touch ONE additional file beyond CTABanner.tsx — whichever file defines the `gradient-shift` keyframes (could be `tailwind.config.mjs`, `src/styles/global.css`, or similar). Run `grep -rn "gradient-shift"` to find it. This is acceptable since no other agent touches config or CSS files.

## DEFINITION OF DONE
- [ ] CTA gradient animates via `transform` not `background-position`
- [ ] "Avoid non-composited animations" flag eliminated
- [ ] CTA image has descriptive alt text
- [ ] Visual appearance of gradient unchanged
- [ ] Dot pattern, button glow, all hover effects preserved
- [ ] `npm run build` passes
- [ ] No changes to any other component files
