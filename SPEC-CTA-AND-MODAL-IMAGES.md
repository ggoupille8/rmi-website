# SPEC: CTA Background Cleanup + Service Modal Stock Images

## CONTEXT

Two issues to fix in one branch:

1. The CTA/Contact background image (cta-project.jpeg) is too visually busy -- the bg-black/60 overlay is not dark enough and the image overwhelms the form
2. Two service modals (Plan & Specification / Bid Work and 24/7 Emergency Response) open with text-only content and no photos, unlike the other 7 services which all have image galleries

Branch: feat/cta-and-modal-images
Files: frontend/src/pages/index.astro, frontend/src/content/site.ts, frontend/public/images/services/

---

## TASK 1: Darken CTA/Contact Background Overlay

### Problem
The bg-black/60 overlay on the shared CTA + Contact background wrapper lets too much of the busy mechanical room image bleed through, making the contact form hard to focus on.

### Files
- frontend/src/pages/index.astro -- find the div with class "absolute inset-0 bg-black/60" inside the shared CTA/Contact background wrapper

### Approach
Change bg-black/60 to bg-black/70. This darkens the overlay by 10 percentage points which significantly improves text contrast while still showing the industrial atmosphere.

### What NOT to Change
- Do NOT change the image itself
- Do NOT change the object-position values
- Do NOT add a second overlay or gradient

### Verification
- npm run build passes
- The overlay class reads bg-black/70

---

## TASK 2: Add Stock Images to Plan & Spec Service Modal

### Problem
The "Plan & Specification / Bid Work" service modal opens with only icon + text + CTA button. No photo gallery. All other services (Pipe Insulation, Duct Insulation, etc.) have image slideshows.

### Files
- frontend/src/content/site.ts -- the services data array, find the "Plan & Specification / Bid Work" entry
- frontend/public/images/services/ -- add new image files here

### Approach
1. Copy the two stock images into the project:
   - stock-plan-spec-1.jpg -> frontend/public/images/services/plan-spec-1.jpg
   - stock-plan-spec-2.jpg -> frontend/public/images/services/plan-spec-2.jpg

2. In site.ts, find the Plan & Specification service entry and add an images array matching the pattern used by other services. The images array should contain paths like:
   ```
   images: [
     "/images/services/plan-spec-1.jpg",
     "/images/services/plan-spec-2.jpg"
   ]
   ```

3. The modal component (Services.tsx) should already handle the two-panel layout when images are present -- verify this works by checking how other services with images render.

### Verification
- Clicking "Plan & Specification / Bid Work" opens the two-panel modal with image slideshow on the left
- Images display correctly with object-fit contain
- Counter shows "1 / 2" and arrows navigate between images
- npm run build passes

---

## TASK 3: Add Stock Images to 24/7 Emergency Response Service Modal

### Problem
Same as Task 2 but for the "24/7 Emergency Response" service.

### Files
- frontend/src/content/site.ts -- find the "24/7 Emergency Response" entry
- frontend/public/images/services/ -- add new image files here

### Approach
1. Copy the two stock images into the project:
   - stock-emergency-1.jpg -> frontend/public/images/services/emergency-response-1.jpg
   - stock-emergency-2.jpg -> frontend/public/images/services/emergency-response-2.jpg

2. In site.ts, find the 24/7 Emergency Response service entry and add an images array:
   ```
   images: [
     "/images/services/emergency-response-1.jpg",
     "/images/services/emergency-response-2.jpg"
   ]
   ```

### Verification
- Clicking "24/7 Emergency Response" opens the two-panel modal with image slideshow on the left
- Images display correctly
- Counter shows "1 / 2" and arrows navigate
- npm run build passes

---

## EXECUTION ORDER

1. Task 1 (overlay) -- simplest change, index.astro only
2. Task 2 (plan & spec images) -- copy files + update site.ts
3. Task 3 (emergency images) -- copy files + update site.ts
4. Final build verification

---

## IMAGE FILES

The stock images are provided alongside this spec file. They should be in the same directory or in a stock-images subfolder. The files are:

- stock-plan-spec-1.jpg -- Blueprints with tools on desk (Pexels, free license)
- stock-plan-spec-2.jpg -- Team reviewing construction plans overhead (Pexels, free license)
- stock-emergency-1.jpg -- Industrial worker in hi-vis vest directing work (Pexels, free license)
- stock-emergency-2.jpg -- Construction worker with hard hat (Unsplash, free license)

All images are royalty-free, no attribution required.

---

## GIT WORKFLOW

git checkout main
git pull
git checkout -b feat/cta-and-modal-images

git add -A
git commit -m "fix: darken CTA overlay + add stock images to Plan & Spec and Emergency modals"

Do NOT merge to main
git push -u origin feat/cta-and-modal-images

---

## DEFINITION OF DONE

- [ ] CTA overlay changed from bg-black/60 to bg-black/70
- [ ] plan-spec-1.jpg and plan-spec-2.jpg in frontend/public/images/services/
- [ ] emergency-response-1.jpg and emergency-response-2.jpg in frontend/public/images/services/
- [ ] Plan & Spec modal shows two-panel layout with image slideshow
- [ ] Emergency Response modal shows two-panel layout with image slideshow
- [ ] All existing service modals still work correctly
- [ ] npm run build zero errors
- [ ] npx tsc --noEmit zero errors
