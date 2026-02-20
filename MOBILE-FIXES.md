I need you to fix 10 mobile QA bugs on the RMI website. The project is at C:\Users\Graham Goupille\astro-project. Start by creating a branch:

git checkout -b fix/mobile-qa-bugs

Then work through ALL 10 issues below in order. I've already inspected the live DOM and documented the exact classes and structure of every element involved, so you have full context. After all fixes, run `npm run build` to verify no errors, then commit everything.

Here's the full context and fixes:

---

## ISSUE 1 — Mobile Nav Menu Broken (CRITICAL)

**File:** frontend/src/components/landing/Navbar.astro

The mobile menu overlay (#mobile-menu) opens when the hamburger is clicked, but it renders BEHIND page content because it has no z-index. The header is z-50, hero content is z-10, but the mobile menu div has z-index: auto.

Current mobile menu div classes: "md:hidden fixed inset-0 top-12 sm:top-14 hidden"
Current mobile menu background: rgba(23, 23, 23, 0.97)
The nav inside it: "flex flex-col items-center justify-center gap-8 h-full"
Links inside have classes like: "mobile-nav-link text-2xl font-semibold text-neutral-100 hover:text-accent-400 transition-colors"

**Fix:**

1. Add `z-[60]` to the #mobile-menu div (above z-50 header)
2. Add body scroll lock: when menu opens set `document.body.style.overflow = 'hidden'`, when it closes set `document.body.style.overflow = ''`
3. Also remove scroll lock when any mobile nav link is clicked (so page can scroll to anchor)
4. Find the script tag in Navbar.astro that handles the hamburger toggle — it toggles the "hidden" class on #mobile-menu and updates aria-expanded/aria-label on the button

---

## ISSUE 2 — Hero Slideshow Transition Flinch

**File:** frontend/src/components/landing/HeroFullWidth.tsx

The hero has 5 slides (hero-1.jpg through hero-5.jpg) plus a gradient overlay div. Currently the slideshow uses BOTH z-index swapping AND opacity transitions, causing a visible flinch/pop during crossfade.

Current slide classes pattern:

- Active slide: "absolute inset-0 transition-opacity duration-[4000ms] ease-in-out opacity-100 z-[2]"
- Previous slide: "absolute inset-0 transition-opacity duration-[4000ms] ease-in-out opacity-100 z-[1]"
- Inactive slides: "absolute inset-0 transition-opacity duration-[4000ms] ease-in-out opacity-0 z-0"

The gradient overlay is the last child: "absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"

**Fix:**

- Use a pure opacity crossfade. Remove z-index from the Tailwind classes entirely.
- Set z-index via inline `style` prop instead (no transition): current=2, previous=1, others=0
- The current slide should transition TO opacity-100, the previous slide should transition TO opacity-0
- Reduce transition duration from 4000ms to 2000ms for a snappier feel
- Non-active/non-previous slides should have duration-[0ms] so they snap invisible instantly
- Make sure the gradient overlay div always stays on top (z-10 or higher, with pointer-events-none)

If the component doesn't currently track `previousSlide` state, add it — store the previous index in a useRef or useState when the slide changes.

---

## ISSUE 3 — Hero Landscape Overflow (Filmstrip Effect)

**File:** frontend/src/components/landing/HeroFullWidth.tsx

On mobile landscape, adjacent slides bleed in from the edges. The slideshow wrapper div doesn't have overflow hidden.

Current slideshow wrapper classes: "absolute top-12 sm:top-14 left-0 right-0 bottom-0 z-0"

**Fix:** Add `overflow-hidden` to that div's classes.

---

## ISSUE 4 — Hero Images Over-Cropped on Portrait Mobile

**File:** frontend/src/components/landing/HeroFullWidth.tsx

All 5 hero images use `object-center` uniformly. On portrait mobile, this crops badly. Each image needs a mobile-specific object-position.

Current img classes: "w-full h-full object-cover object-center"

Image dimensions (for context on aspect ratios):

- hero-1.jpg: 2560x1440 (landscape, 16:9) — rooftop HVAC shot, equipment at bottom
- hero-2.jpg: 2016x1512 (4:3ish) — pipe cluster
- hero-3.jpg: 1717x918 (wide landscape) — valve/equipment
- hero-4.jpg: 1536x2048 (PORTRAIT) — this one is already portrait orientation
- hero-5.jpg: 2000x1500 (4:3) — general shot

**Fix:** Replace the uniform `object-center` with per-image responsive positioning:

- hero-1: `object-[50%_70%] sm:object-center` (shift down to show equipment, not sky)
- hero-2: `object-[50%_40%] sm:object-center` (shift up slightly to center pipes)
- hero-3: `object-[40%_50%] sm:object-center` (shift left to center subject)
- hero-4: `object-center` (already portrait, center works fine)
- hero-5: `object-[50%_40%] sm:object-center` (shift up slightly)

Create an array of position classes and apply them per slide index. Also add alt text to each image — they currently have empty alt attributes.

---

## ISSUE 5 — Stats Bar Too Low on Mobile

**File:** frontend/src/components/landing/HeroFullWidth.tsx

The stats bar (100+ Clients, 500+ Projects, 231K+ OSHA Hours) uses mt-auto which pushes it to the very bottom on mobile, visually disconnecting it from the hero content above.

Current stats container classes: "mt-auto pb-4 sm:pb-6 flex justify-center gap-6 sm:gap-8"
Current stat card classes: "w-40 sm:w-44 bg-neutral-900/25 backdrop-blur-sm rounded-lg border border-neutral-700/30 px-4 py-3"

**Fix:**

- Change `mt-auto` to `mt-6 sm:mt-auto` — fixed margin on mobile, auto on desktop
- Change `gap-6` to `gap-3 sm:gap-8` — tighter on mobile
- Change stat card `w-40` to `flex-1 min-w-0 sm:w-44 sm:flex-none` — fluid width on mobile, fixed on desktop

---

## ISSUE 6 — Stats Labels Possibly Hidden on Mobile

**File:** frontend/src/components/landing/HeroFullWidth.tsx

The stat labels ("Clients", "Projects Annually", "OSHA Man-Hours") exist in the DOM but may be getting clipped on narrow screens because cards are fixed-width (w-40 = 160px) and text like "Projects Annually" is long.

The third stat has TWO label variants in the DOM: "OSHA Man-Hours" and "OSHA Hours" — there's likely a responsive show/hide for the shorter version.

**Fix:**

- Ensure no label has `hidden` or `sm:block` classes that would hide it on mobile
- If there IS a short/long label pattern, make sure the short version shows on mobile: the short label should be `sm:hidden` (visible on mobile, hidden on sm+) and the long label should be `hidden sm:block`
- Reduce label font size on mobile: use `text-[10px] sm:text-xs` for the label text
- Add `leading-tight` and `truncate` or `line-clamp-1` to prevent overflow

---

## ISSUE 7 — Services Cards Left-Aligned on Mobile

**File:** frontend/src/components/landing/Services.tsx

Service cards use horizontal flex layout with icon + text. On mobile single-column, the left-alignment looks unbalanced.

Current card classes: "flex items-center gap-4 p-4 bg-neutral-900 border border-neutral-700 border-l-[3px] border-l-accent-500 hover:border-l-accent-400 hover:bg-neutral-800 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-500/10 transition-all duration-200 rounded-r-lg cursor-default"

Card children:

1. SVG icon: "lucide lucide-droplets w-7 h-7 text-accent-500 flex-shrink-0"
2. SPAN text: "text-sm font-bold text-white uppercase tracking-wide"

**Fix:** Add `justify-center sm:justify-start` to the card button classes. This centers the icon+text pair on mobile but keeps left-alignment on desktop. The left accent border still provides visual anchoring.

---

## ISSUE 8 — Materials Marquee Too Fast on Mobile

**File:** frontend/src/components/landing/MaterialsMarquee.tsx

The marquee uses CSS class `.service-ticker__track` with animation duration of 36s. This is too fast on mobile where less content is visible.

Current CSS:

```css
.service-ticker__track {
  display: inline-flex;
  width: max-content;
  animation: 36s linear 0s infinite normal none running service-ticker-scroll;
  will-change: transform;
}
```

The keyframes:

```css
@keyframes service-ticker-scroll {
  0% {
    transform: translateX(0px);
  }
  100% {
    transform: translateX(-50%);
  }
}
```

**Fix:** Add responsive animation-duration overrides. Find where the `.service-ticker__track` styles are defined (likely in a <style> tag in the component or in a global CSS file) and add:

```css
@media (max-width: 639px) {
  .service-ticker__track {
    animation-duration: 90s;
  }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .service-ticker__track {
    animation-duration: 60s;
  }
}
```

---

## ISSUE 9 — Floating Phone Button Overlaps Content

**File:** frontend/src/components/landing/FloatingMobileCTA.tsx

IMPORTANT: During my DOM inspection, I found NO fixed-position phone button currently rendering on the page. The only tel: links are in the hero section and footer — neither is fixed positioned.

**First:** Check if FloatingMobileCTA.tsx is imported and rendered in frontend/src/pages/index.astro. If it's NOT imported, this issue is already resolved — skip it.

**If it IS imported and rendering:**

- Add `md:hidden` to hide it on desktop (navbar already has a CTA)
- Change bottom positioning to `bottom-20` to avoid overlapping footer content
- Set z-index to `z-40` (below mobile menu z-[60])

---

## ISSUE 10 — Hero Card Backdrop-Blur Inconsistency (LOW PRIORITY)

**File:** frontend/src/components/landing/HeroFullWidth.tsx

The glassmorphism card has a very transparent background that depends on backdrop-blur working properly.

Current card classes: "max-w-3xl mx-auto bg-neutral-900/25 backdrop-blur-sm rounded-xl border border-neutral-700/30 py-6 px-6 sm:px-10"

**Fix:** Add a CSS @supports fallback. Change:

- `bg-neutral-900/25` → `bg-neutral-900/60` (darker fallback when blur not supported)
- Add `supports-[backdrop-filter]:bg-neutral-900/25` (lighter when blur IS supported)

So the full class becomes: "max-w-3xl mx-auto bg-neutral-900/60 supports-[backdrop-filter]:bg-neutral-900/25 backdrop-blur-sm rounded-xl border border-neutral-700/30 py-6 px-6 sm:px-10"

---

## AFTER ALL FIXES

1. Run `npm run build` and fix any TypeScript/build errors
2. Run `npm run test` — visual regression tests WILL fail (that's expected from our intentional UI changes)
3. Run `npm run test:visual:update` to update the visual baselines
4. Commit everything:

```bash
git add .
git commit -m "fix: resolve 10 mobile QA issues

- Fix mobile nav menu z-index and add body scroll lock (critical)
- Fix hero slideshow crossfade flinch with pure opacity transitions
- Fix hero landscape overflow (filmstrip effect)
- Add per-image mobile object-position for hero slides
- Tighten stats bar positioning on mobile
- Ensure stat labels visible on mobile
- Center service card content on mobile
- Slow materials marquee on mobile (90s vs 36s)
- Verify floating CTA state (may already be resolved)
- Add backdrop-blur fallback for hero glassmorphism card"
```

Do NOT push yet — I want to review on my phone first.
