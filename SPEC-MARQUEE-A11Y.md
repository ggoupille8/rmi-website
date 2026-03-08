# SPEC: Materials Marquee Accessibility + SEO Fix

## CONTEXT
The Materials Marquee renders 22 unique materials in an infinite CSS scroll. The animation works by duplicating the list 4-5x in the DOM (120 nodes for 22 items). This is standard for CSS marquees, but the duplicate content is exposed to screen readers (announced 4-5 times) and crawlers (looks like keyword stuffing).

## FILES
- `src/components/landing/MaterialsMarquee.tsx` (ONLY file to modify)

## DO NOT TOUCH
- Marquee animation behavior (speed, direction, pause-on-hover if any)
- Chip/tag visual styling
- Gradient background
- Fade masks (80px)
- Overflow containment
- The materials list content
- Any other component file

## TASK 1: Add Visually-Hidden Semantic List + Hide Animation Duplicates

### Problem
Screen readers announce all 22 materials 4-5 times. Crawlers index duplicated text.

### Approach
1. **Find where the materials array is defined** — there should be an array of strings with all 22 material names.

2. **Add a visually-hidden `<ul>` BEFORE the marquee animation container:**
   ```jsx
   <ul className="sr-only" aria-label="Materials we work with">
     {materials.map((material, i) => (
       <li key={i}>{material}</li>
     ))}
   </ul>
   ```

3. **Add `aria-hidden="true"` to the entire marquee animation container** (the div that wraps all the scrolling tracks). Since the sr-only list provides the accessible content, the visual animation is decorative from an AT perspective.

### Verification
- The sr-only `<ul>` exists in the DOM with all 22 materials
- The sr-only list is invisible at all viewports (check: `getComputedStyle(el).position === 'absolute'` and clip)
- The marquee animation container has `aria-hidden="true"`
- Visual animation is completely unchanged
- `npm run build` passes

## TASK 2: Add Section-Level aria-label

### Approach
Find the outermost container element of the marquee component and add:
```
aria-label="Materials and products we install"
```

If the outermost element is a `<section>`, also ensure it has `role="region"` (implicit for `<section>` with aria-label, so this may already be handled).

### Verification
- Section has aria-label
- `npm run build` passes

## GIT WORKFLOW
```
git checkout -b feat/marquee-a11y
git add -A
git commit -m "fix: add accessible materials list, hide marquee duplicates from AT"
# Do NOT merge to main
```

## DEFINITION OF DONE
- [ ] Visually-hidden `<ul>` with all 22 materials exists
- [ ] Marquee animation container has `aria-hidden="true"`
- [ ] Screen readers encounter each material exactly once
- [ ] Visual marquee unchanged
- [ ] Section has aria-label
- [ ] `npm run build` passes
- [ ] No changes to any other files
