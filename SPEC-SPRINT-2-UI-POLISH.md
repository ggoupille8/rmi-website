# SPEC: Sprint 2 — UI Polish & Visual Improvements

## CONTEXT

This sprint addresses the remaining UI polish items from the February 26 mobile audit. These are all cosmetic/UX improvements — no content changes, no backend changes. This spec is designed to run AFTER the Astro 5 upgrade (SPEC-ASTRO-5-UPGRADE.md) has been merged.

**Pre-condition:** Confirm the Astro 5 upgrade branch has been merged to main and the site builds clean before starting this sprint. If the Astro 5 upgrade is not yet merged, do NOT start this spec.

```bash
npx astro --version  # Should show 5.x
npm run build        # Must pass
```

**Content stability rule:** Do NOT change any text copy. These are visual/layout fixes only.

---

## TASK 1: Materials Marquee — Fix Edge Text Clipping

### Severity: MEDIUM (visible on every page load)

### Problem

The scrolling materials marquee clips text at both left and right edges. Items like "Acoustic Control (Mass Loaded Vinyl, Lead-Free)" get abruptly cut off mid-word. The fade/gradient masks at the edges are either too narrow or missing entirely, making the clipping look like a bug rather than a deliberate scroll indicator.

### Files
- `frontend/src/components/landing/MaterialsMarquee.tsx`

### Approach

Add gradient fade masks to both edges of the marquee container using CSS pseudo-elements or a wrapper div. The fade should be wide enough (48–64px on mobile, 80–120px on desktop) to smoothly obscure text as it enters/exits the viewport.

```css
/* Example approach using a parent wrapper with gradient masks */
.marquee-wrapper {
  position: relative;
  overflow: hidden;
}
.marquee-wrapper::before,
.marquee-wrapper::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 80px; /* Adjust: 48px mobile, 80-120px desktop */
  z-index: 10;
  pointer-events: none;
}
.marquee-wrapper::before {
  left: 0;
  background: linear-gradient(to right, rgb(38 38 38) 0%, transparent 100%); /* Match bg-neutral-800 */
}
.marquee-wrapper::after {
  right: 0;
  background: linear-gradient(to left, rgb(38 38 38) 0%, transparent 100%);
}
```

In Tailwind, this can be achieved with `before:` and `after:` utility classes, or via a custom CSS class. The key is matching the gradient color to the section's background (`bg-neutral-800` = `rgb(38, 38, 38)`).

### Verification
1. `npm run build` — must pass
2. Visual check: text should smoothly fade in/out at both edges, never appear abruptly cut off
3. The gradient color must match the section background exactly — no visible color seam

---

## TASK 2: Service Cards — Add Visual Tiering

### Severity: MEDIUM (all 9 cards look identical)

### Problem

All 9 service cards have identical styling — same dark background, same blue left-border, same icon color. There's no visual hierarchy to help a visitor understand which services are core vs. specialized. The wall of identical cards can feel monotonous, especially on mobile where they stack vertically.

### Files
- `frontend/src/components/landing/Services.tsx`
- `frontend/src/content/site.ts` (if tier/category data needs to be added)

### Approach

Group the 9 services into 3 visual tiers using subtle differentiation. Do NOT use dramatically different colors or layouts — keep the current card structure, just add visual weight to the primary services.

**Tier 1 — Core Services (top row):** Pipe Insulation, Duct Insulation, Tanks/Vessels/Equipment
- Slightly brighter or thicker left-border (e.g., `border-l-4` instead of `border-l-2`)
- Or a very subtle background difference (e.g., `bg-neutral-800/80` vs `bg-neutral-800/60`)

**Tier 2 — Specialty (middle row):** Removable Blankets, Field-Applied Jacketing, Pipe Supports & Fabrication
- Current styling (no change)

**Tier 3 — Additional Services (bottom row):** Plan & Spec, Material Sales, 24/7 Emergency Response
- Current styling, or slightly lighter/more subtle to indicate supporting services

The simplest effective approach: make the top row's left-border `border-l-4` (or a slightly brighter blue) while the bottom two rows stay at `border-l-2`. This creates just enough visual hierarchy without a redesign.

**Alternative approach (if tiering feels forced):** Add subtle color variation to the blue left-border — warm blue for thermal services, a cooler tone for fabrication/planning. But keep it subtle.

### Verification
1. `npm run build` — must pass
2. The top row of cards should look visually distinct from the bottom rows
3. All 9 cards must still be clickable and open their modals correctly
4. Mobile layout (stacked cards) should still look cohesive

---

## TASK 3: "Why Choose RMI" — Deduplicate Intro vs Safety Card Content

### Severity: LOW (content overlap)

### Problem

The section intro says "Built on safety, reliability, and deep expertise" and then the first card (Safety-First Culture) leads with safety stats. The intro and the first card say roughly the same thing, creating redundancy when reading top-to-bottom.

### Files
- `frontend/src/content/site.ts` or `frontend/src/components/landing/About.tsx` — wherever the intro subtitle is defined

### Approach

Change the section subtitle from:
```
Built on safety, reliability, and deep expertise. Here's what sets us apart.
```
To something that sets up the cards without front-running the Safety card:
```
Here's what sets us apart from other insulation contractors.
```

This is a one-line change. The subtitle should frame the cards as a collection, not preview the first one.

**Do NOT change the card content itself.** Only the subtitle.

### Verification
1. `npm run build` — must pass
2. Visual: the subtitle text has changed
3. The Safety-First Culture card content remains unchanged

---

## TASK 4: "Proven Track Record" Card — Strengthen Content

### Severity: LOW (vague compared to other cards)

### Problem

The "Proven Track Record" card is the weakest of the four About cards. It says "our work speaks for itself" and "trust RMI to deliver" — generic phrases that could describe any contractor. The other three cards have specific proof points (EMR rating, 24/7 shifts, Local 25 certification).

### Files
- `frontend/src/content/site.ts` (About section card content)

### Approach

Replace the current Proven Track Record card text with something that has a concrete proof point. Suggested replacement:

**Current:**
> From hospitals and manufacturing plants to landmark restorations and ground-up campus builds — our work speaks for itself. Year after year, general contractors and facility managers trust RMI to deliver on schedule and on spec.

**New:**
> From a year-round presence at Henry Ford Hospital to Ford's new World Headquarters — our project list includes Michigan's most recognized names. General contractors and facility managers choose RMI because we deliver on schedule, on spec, and on budget.

This ties directly to the Featured Projects section below and provides concrete names instead of vague categories.

### Verification
1. `npm run build` — must pass
2. The Proven Track Record card text has changed
3. No other card text has changed

---

## TASK 5: Service Area Text Consistency

### Severity: LOW

### Problem

The footer says "Serving Michigan and the Midwest" which is good and accurate. Verify this same language is used consistently in the JSON-LD structured data `areaServed` field and meta description.

### Files
- `frontend/src/layouts/BaseLayout.astro` (JSON-LD schema)

### Approach

Check the JSON-LD `areaServed` field. It should list specific states/areas that match the actual service area. If it only says "Michigan," consider expanding to include Ohio, Indiana, and the broader Midwest to match the footer language and actual service area.

This is a check-and-fix task — if it's already consistent, no change needed.

### Verification
1. `npm run build` — must pass
2. `grep -A5 "areaServed" frontend/src/layouts/BaseLayout.astro` — should show Michigan + Midwest states

---

## EXECUTION ORDER

1. **Task 1 — Marquee fade masks** (most visible fix, standalone)
2. **Task 2 — Service card tiering** (visual hierarchy, standalone)
3. **Task 3 — About subtitle dedup** (one-line text change)
4. **Task 4 — Track Record card** (content improvement)
5. **Task 5 — Service area check** (may be a no-op)

Run `npm run build` after each task.

---

## WHAT NOT TO CHANGE

- **Do NOT touch the hero section** — it's working correctly
- **Do NOT move the floating FAB** — that's a separate mobile-specific fix that needs real-device testing
- **Do NOT change the CTA banner image** — cropping issues need design direction
- **Do NOT change project card content** — that was just fixed in sprint 2
- **Do NOT change the contact form or footer layout**
- **Do NOT upgrade Tailwind** — stay on current version

---

## GIT WORKFLOW

- **Branch:** `feat/sprint-2-ui-polish`
- **Commit messages:**
  - `fix: add fade masks to materials marquee edges`
  - `style: add visual tiering to service cards`
  - `fix: deduplicate About section intro with Safety card`
  - `content: strengthen Proven Track Record card`
  - `fix: ensure service area consistency in JSON-LD`
- **Merge policy:** Do NOT merge to main. Push branch, create PR for Graham to review.

---

## DEFINITION OF DONE

- [ ] `npm run build` passes with zero errors
- [ ] Materials marquee text fades smoothly at both edges
- [ ] Service cards have visible visual hierarchy (top row distinct from others)
- [ ] About section subtitle doesn't duplicate Safety card content
- [ ] Proven Track Record card has concrete proof points
- [ ] JSON-LD areaServed matches footer service area language
- [ ] All changes on `feat/sprint-2-ui-polish` branch, NOT merged to main
- [ ] Summary written to `tasks/todo.md`
