# SPEC: Sprint 2 — Content Fix + UI Polish

## CONTEXT

This sprint addresses issues found during a comprehensive Chrome audit of the live production site (https://rmi-llc.net) on March 3, 2026. The primary trigger is an incorrect project name in the Ford World Headquarters card, but the audit uncovered several additional issues worth fixing in the same pass.

**Priority order:** Content accuracy fix first (Ford HQ naming), then accessibility fix (missing alt text), then cosmetic/SEO polish.

**Content stability rule:** Only change copy that is factually incorrect or has a verified issue. Do NOT rewrite working copy for style preferences.

---

## TASK 1: Fix Ford World Headquarters Project Card — Incorrect Name

### Severity: HIGH (factual error on production site)

### Problem

The Ford World Headquarters project card description says:

> "Ford's new Henry Ford II World Center in Dearborn"

This is wrong. **"Henry Ford II World Center"** is the name of the *old* Ford headquarters (the Glass House, built 1956). The new building RMI worked on is officially called **"Ford World Headquarters"** (also known as "the Hub"). The broader campus inherited the "Henry Ford II World Center" name, but the building itself is "Ford World Headquarters."

Per Ford's own November 2025 announcement and multiple news sources, the new facility was dedicated as the **Ford World Headquarters** on November 16, 2025.

### Files
- `frontend/src/content/site.ts` — this is where all project card content is defined

### Approach

Find the Ford World Headquarters project card content in `site.ts` and change:

**Old text:**
```
Ford's new Henry Ford II World Center in Dearborn — a state-of-the-art campus replacing the iconic Glass House.
```

**New text:**
```
Ford's new World Headquarters in Dearborn — a state-of-the-art facility replacing the iconic Glass House.
```

Key changes:
- "Henry Ford II World Center" → "World Headquarters" (the correct building name)
- "campus" → "facility" (the building itself is a facility; the campus is the broader area)

**Do NOT change:**
- The card title ("Ford World Headquarters — Dearborn") — this is already correct
- The rest of the description — it's accurate
- Any other project card content

### Verification
1. Run `npm run build` — must succeed with no errors
2. `grep -r "Henry Ford II" frontend/src/` — must return zero results
3. `grep -r "World Headquarters" frontend/src/content/site.ts` — must find the corrected text
4. The card title `Ford World Headquarters — Dearborn` must remain unchanged

---

## TASK 2: Add Missing Alt Text to CTA Banner Image

### Severity: MEDIUM (accessibility gap — WCAG violation)

### Problem

The CTA banner background image (`cta-project.jpeg`) has no `alt` attribute. This was detected during the DOM audit — it's the only image on the page with missing alt text (11 out of 12 images have proper alt text).

### Files
- The component that renders the CTA banner. Search for `cta-project.jpeg` or `cta-project` in:
  - `frontend/src/components/landing/CTABanner.tsx`
  - Or `frontend/src/content/site.ts` if the image path is defined there

### Approach

Add a descriptive alt attribute to the CTA banner image. Since it's a background/decorative image behind the CTA text, an empty alt (`alt=""`) with `role="presentation"` is acceptable per WCAG. However, if it's rendered as an `<img>` tag (not a CSS background), use:

```
alt="Industrial insulation installation at a mechanical facility"
```

If it's purely decorative (background behind CTA text), use `alt=""` with `aria-hidden="true"`.

### Verification
1. Run `npm run build` — must succeed
2. `grep -n "cta-project" frontend/src/components/landing/CTABanner.tsx` — confirm the image reference exists
3. Check that the `alt` attribute is present (not missing/undefined) on the rendered `<img>` element

---

## TASK 3: Fix "Why Choose RMI" Section Heading Accessibility

### Severity: LOW (cosmetic / screen reader issue)

### Problem

The "Why Choose Resource Mechanical Insulation" heading uses responsive text swapping:
```html
Why Choose <span class="hidden sm:inline">Resource Mechanical Insulation</span><span class="sm:hidden">RMI</span>
```

This renders correctly visually (shows full name on desktop, "RMI" on mobile), but screen readers and text extraction tools read both spans concatenated: **"Why Choose Resource Mechanical InsulationRMI"** — no space between the two.

### Files
- `frontend/src/components/landing/About.tsx` (or wherever the "Why Choose" heading is defined)

### Approach

Add `aria-label` to the heading to provide clean screen reader text, and mark the swapped spans as `aria-hidden`:

```tsx
<h2 aria-label="Why Choose Resource Mechanical Insulation">
  Why Choose{' '}
  <span className="hidden sm:inline" aria-hidden="true">Resource Mechanical Insulation</span>
  <span className="sm:hidden" aria-hidden="true">RMI</span>
</h2>
```

Alternatively, if this creates complexity, just add a space before the `sm:hidden` span so the fallback text reads "Resource Mechanical Insulation RMI" (still not ideal but better than the concatenated version).

The simplest correct fix: use `sr-only` to provide the accessible text and hide the visual spans from screen readers.

### Verification
1. Run `npm run build` — must succeed
2. Check that the heading element has an `aria-label` attribute
3. Visual rendering must remain identical (full name on desktop, "RMI" on mobile)

---

## TASK 4: Verify URL Canonical Consistency (www vs non-www)

### Severity: LOW (SEO hygiene)

### Problem

The site currently renders at `www.rmi-llc.net` and the canonical/OG/JSON-LD URLs all point to `https://www.rmi-llc.net/`. The project instructions reference `rmi-llc.net` (no www) as the production domain, but the www version appears to be the actual canonical. This needs to be consistent — either www or non-www, not a mix.

### Files
- `frontend/src/layouts/BaseLayout.astro` — canonical URL, OG URL
- `frontend/src/content/site.ts` — if the base URL is defined there
- Check `astro.config.mjs` for the `site` property
- Check Vercel dashboard redirect settings (note: this is a config check, not a code change)

### Approach

1. **Check `astro.config.mjs`** for the `site` value — determine if it's set to `https://rmi-llc.net` or `https://www.rmi-llc.net`
2. **Check `BaseLayout.astro`** for hard-coded canonical/OG URLs
3. **Verify which is canonical:** If `www.rmi-llc.net` is what Vercel serves and all meta tags point to www, then www IS the canonical and that's fine. Just make sure `rmi-llc.net` (non-www) redirects 301 to `www.rmi-llc.net`.
4. **If there's a mismatch** between the Astro `site` config and the actual served URL, update the Astro config to match reality.

**Do NOT change the canonical URL arbitrarily.** If www is working and all meta tags are consistent, leave it as-is. The goal is consistency, not a preference for one over the other.

### Verification
1. `grep -r "rmi-llc.net" frontend/src/ astro.config.mjs` — all references should use the same format (either all `www.rmi-llc.net` or all `rmi-llc.net`)
2. Check that `astro.config.mjs` site property matches the canonical URL in BaseLayout.astro
3. Run `npm run build` — must succeed

---

## EXECUTION ORDER

1. **Task 1 — Ford HQ naming fix** (highest priority, factual error)
2. **Task 2 — CTA banner alt text** (accessibility, quick fix)
3. **Task 3 — About heading accessibility** (screen reader, quick fix)
4. **Task 4 — URL canonical check** (SEO, may be no-op)

Run `npm run build` after each task. If build fails, fix before proceeding.

---

## WHAT NOT TO CHANGE

- **Do NOT modify any other project card text** (Henry Ford Hospital and Michigan Central Station cards are accurate)
- **Do NOT rearrange sections, change spacing, or adjust layout** — this sprint is content/accessibility only
- **Do NOT touch service cards, materials marquee, hero, or footer** — those are separate Sprint 2 items from the prior audit that need direction decisions first
- **Do NOT modify the contact form or backend**
- **Do NOT update visual regression baselines** unless a task specifically changes visible rendering (Task 1 will change rendered text, so baselines that capture the project cards section will need updating)

---

## GIT WORKFLOW

- **Branch:** `feat/sprint-2-content-fixes`
- **Commit messages:**
  - `fix: correct Ford World Headquarters project name (was Henry Ford II World Center)`
  - `fix: add missing alt text to CTA banner image`
  - `fix: improve About heading screen reader accessibility`
  - `chore: verify canonical URL consistency`
- **Merge policy:** Do NOT merge to `main`. Push branch and create PR for Graham to review.

---

## DEFINITION OF DONE

- [ ] `npm run build` passes with zero errors
- [ ] No references to "Henry Ford II World Center" remain in frontend source
- [ ] CTA banner image has alt text (empty string or descriptive)
- [ ] About section heading has proper screen reader support
- [ ] All canonical/OG/JSON-LD URLs are consistent (www or non-www, not mixed)
- [ ] All changes on `feat/sprint-2-content-fixes` branch, NOT merged to main
- [ ] Summary written to `tasks/todo.md`
