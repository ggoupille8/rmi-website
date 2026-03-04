# SPEC: Service Card Hover & Click Affordance

## CONTEXT

The 9 service cards in the Services section are clickable buttons that open rich modals (with photo galleries, descriptions, and CTAs). However, there is ZERO visual indication that they are interactive. The current hover effect is nearly invisible — it changes `border-l` from blue-500 to blue-400 and barely shifts the background. A visitor scrolling the page would have no idea that clicking these cards reveals 21 photos and detailed service descriptions.

This is the single highest-impact UX fix on the site. The modal content already exists — we just need to make people discover it.

**Branch:** `feat/service-card-hover`
**File:** `frontend/src/components/landing/Services.tsx`

---

## TASK: Improve Service Card Hover States & Click Affordance

### Current State (classes on each card button)
```
group cursor-pointer flex items-center justify-center sm:justify-start gap-4 px-4 py-4 sm:p-4 min-h-[56px]
bg-neutral-900/50 backdrop-blur-sm
border border-neutral-700/50 border-l-[3px] border-l-blue-500
hover:border-l-blue-400 hover:border-neutral-600/70 hover:bg-neutral-800/90 hover:-translate-y-0
```

The problems:
1. `hover:-translate-y-0` does literally nothing (0 translation)
2. `hover:bg-neutral-800/90` vs `bg-neutral-900/50` is a barely perceptible change
3. `hover:border-l-blue-400` vs `border-l-blue-500` is also near-invisible
4. No transition classes for smooth animation
5. No visual indicator (arrow, chevron, "View Details" text) that clicking opens a modal
6. The icon color change (`group-hover:text-blue-400`) is the only visible feedback

### Changes Required

#### 1. Stronger hover effect on the card button
Replace the hover classes with these:

**Remove:**
```
hover:border-l-blue-400 hover:border-neutral-600/70 hover:bg-neutral-800/90 hover:-translate-y-0
```

**Add:**
```
transition-all duration-200 ease-out
hover:bg-neutral-800/70 hover:border-l-blue-400 hover:border-neutral-600
hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/10
```

This gives:
- A visible upward lift (`-translate-y-0.5` = 2px)
- A subtle blue glow shadow
- A more noticeable background change
- Smooth transition animation

#### 2. Add a right-side chevron/arrow indicator
Inside each card button, after the service name text, add a right-aligned chevron that signals clickability. Use a simple SVG or the existing lucide-react ChevronRight icon:

```tsx
import { ChevronRight } from 'lucide-react';
```

Add to each card button's children, after the text span:
```tsx
<ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-200 ml-auto flex-shrink-0 hidden sm:block" />
```

Key details:
- `ml-auto` pushes it to the right edge
- `hidden sm:block` — hide on mobile (cards are compact), show on sm+
- `group-hover:translate-x-0.5` — subtle rightward nudge on hover
- `text-neutral-500` → `group-hover:text-blue-400` — lights up on hover
- The button already has `group` class, so group-hover will work

#### 3. Ensure transition class is on the card button
The card button needs `transition-all duration-200` (or `transition-transform duration-200`) for smooth hover animation. Check that it's present.

### What NOT to Change
- Do NOT change card content, service names, or descriptions
- Do NOT change the modal behavior
- Do NOT change card layout (3-column grid)
- Do NOT change the icon on the left side
- Do NOT add any new sections or content
- Keep the mobile layout working — test at 375px

### Verification
- `npm run build` passes with zero errors
- `npx tsc --noEmit` passes with zero errors
- Hovering a service card shows: visible background change, slight upward lift, blue shadow glow, chevron lights up and nudges right
- Chevron visible on desktop (sm+), hidden on mobile
- Cards still open modals on click
- Mobile layout unchanged (cards stack properly, no overflow)

---

## GIT WORKFLOW

```
git checkout main && git pull
git checkout -b feat/service-card-hover

# Single commit:
git add -A
git commit -m "fix: improve service card hover states and add click affordance chevron"

# Do NOT merge to main
git push -u origin feat/service-card-hover
```

---

## DEFINITION OF DONE

- [ ] Hover effect visibly lifts card and adds blue shadow
- [ ] Chevron icon appears on right side of each card (desktop only)
- [ ] Chevron animates on hover (color change + subtle translate)
- [ ] Smooth transitions on all hover effects
- [ ] Cards still open service modals correctly
- [ ] Mobile layout unaffected
- [ ] `npm run build` zero errors
- [ ] `npx tsc --noEmit` zero errors
