# SPEC: CTA/Contact Background Image Cleanup

## CONTEXT

The shared background image behind the CTA banner and Contact form (cta-project.jpeg) is visually overwhelming. The image is a busy mechanical room photo (portrait orientation 918x1224) being displayed in a landscape container with object-fit cover, which severely crops it and makes it feel cramped. The current dark overlay is bg-black/60 which is not dark enough to push the busy pipes/valves into the background.

Goal: Make the background less overwhelming so the CTA text and contact form are the clear focal point, without replacing the image.

Branch: feat/cta-bg-cleanup
Primary file: frontend/src/pages/index.astro (the shared background wrapper)

---

## TASK 1: Darken the Overlay

### Problem
The bg-black/60 overlay lets too much of the busy pipe image show through, competing with the form fields and CTA text.

### Files
- The shared CTA/Contact background wrapper in index.astro (look for the div with class "absolute inset-0 bg-black/60")

### Approach
Change the overlay from bg-black/60 to bg-black/70. This provides better text contrast for both CTA heading and form labels, reduced visual noise from the pipes, and still shows enough of the industrial photo to maintain context.

If there are separate overlays for CTA vs Contact sections, the Contact section overlay should be slightly darker (bg-black/75) since the form needs maximum readability.

### Verification
- npm run build passes
- The CTA text is easily readable
- The contact form fields are clearly visible against the darkened background
- The image is still visible enough to provide industrial atmosphere

---

## TASK 2: Adjust Image Object Position

### Problem
The image uses object-[center_30%] on mobile and object-[center_40%] on desktop. Since the portrait image is heavily cropped horizontally, adjusting the vertical position can help show a less busy part of the image.

### Approach
Change from object-[center_30%] / object-[center_40%] to object-[center_25%] / object-[center_35%]. This shifts the visible slice slightly upward, which may reveal a less cluttered portion of the mechanical room. Test this visually -- if the upper portion of the image is equally busy, revert this change and keep the overlay darkening only.

### Verification
- Ensure the visible portion of the image still looks intentional/professional
- No awkward crops

---

## GIT WORKFLOW

git checkout main
git pull
git checkout -b feat/cta-bg-cleanup

git add -A
git commit -m "fix: darken CTA/contact background overlay for better readability"

Do NOT merge to main
git push -u origin feat/cta-bg-cleanup

---

## DEFINITION OF DONE

- [ ] Overlay changed from bg-black/60 to bg-black/70 (or bg-black/75 for contact section)
- [ ] Image position adjusted (or deliberately kept if upper portion is equally busy)
- [ ] CTA text clearly readable
- [ ] Contact form fields clearly visible
- [ ] Background image still provides industrial atmosphere
- [ ] npm run build zero errors
- [ ] npx tsc --noEmit zero errors
