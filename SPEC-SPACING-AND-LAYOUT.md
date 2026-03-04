SPEC: Section Spacing Tighten + CTA Image Extension + Footer CleanupCONTEXTThe front page has excessive vertical padding between sections (96px top + 96px bottom at lg breakpoint = 192px of combined dead space per section). The CTA banner background image needs to extend through the contact form section, the Featured Projects descriptions are truncated, and the footer has too much whitespace (534px tall).Branch: feat/spacing-and-layout-polishTASK 1: Tighten Section Padding GloballyProblem
Sections use lg:py-24 (96px) creating massive dead space. Target: 32-48px.Files

frontend/src/components/landing/Services.tsx
frontend/src/components/landing/About.tsx
frontend/src/components/landing/MaterialsMarquee.tsx
frontend/src/components/landing/ProjectShowcase.tsx
frontend/src/components/landing/ContactForm.tsx
Approach
Replace padding on every content section's outermost <section>:

Old: pt-10 pb-16 sm:py-20 lg:py-24
New: py-8 sm:py-10 lg:py-12
Apply to Services, About, Materials, Projects, and Contact Form internal container.Also tighten h2 heading bottom margins (mb-8/mb-10 → mb-4/mb-6) and subtitle bottom margins (mb-10/mb-12 → mb-6/mb-8).What NOT to change

Hero section (uses min-h-[100dvh])
CTA Banner (Task 3)
Footer (Task 4)
Verification

npm run build — zero errors
Sections visibly closer together, no content overlap
TASK 2: Show Full Featured Projects ContentProblem
All three project descriptions truncated with "..." via line-clamp.Files

frontend/src/components/landing/ProjectShowcase.tsx
Approach
Remove line-clamp-* or truncate classes from project description <p> elements. Also remove any fixed height constraints on cards that cause truncation.Verification

All three descriptions show fully, no "..."
No layout break at mobile
TASK 3: Extend CTA Banner Image Through Contact FormProblem
CTA banner image ends abruptly; contact form has plain dark background. Image should span both sections continuously. Footer stays dark.Files

frontend/src/components/landing/CTABanner.tsx
frontend/src/components/landing/ContactForm.tsx
frontend/src/pages/index.astro
Approach
In index.astro, wrap CTABanner and ContactForm in a parent <div class="relative"> that holds the background image (use the SAME image currently in CTABanner). Add an overlay <div class="absolute inset-0 bg-black/60">.In CTABanner: remove background image/picture element, add relative z-10, remove solid bg colors.In ContactForm: remove bg-neutral-900 and border-t, add relative z-10. Form inputs keep their own dark backgrounds.Verification

Image visible behind CTA AND contact form
No seam between sections
Form inputs readable, form still submits
Footer starts with dark background after contact form
TASK 4: Tighten Footer SpacingProblem
Footer is 534px tall. Container has 64px top padding, 56px gap to social icons, 48px gap to copyright.Files

frontend/src/components/landing/Footer.tsx
Approach

Container: pt-12 sm:pt-16 → pt-8 sm:pt-10; pb-6 sm:pb-8 → pb-4 sm:pb-6
Social icons row: mt-8 pt-6 → mt-4 pt-4
Copyright row: mt-6 pt-6 → mt-3 pt-3
Target: ~300-350px footer height
Verification

Compact but not cramped, all content readable
Mobile stacking works
EXECUTION ORDER

Task 1 — Section padding
Task 4 — Footer spacing
Task 2 — Project descriptions
Task 3 — CTA image extension
GIT WORKFLOW
Branch: feat/spacing-and-layout-polish
Do NOT merge to main. Push branch for review.DEFINITION OF DONE

 All content sections use ~32-48px vertical padding (down from 96px)
 Heading/subtitle margins tightened proportionally
 Footer ~300-350px (down from 534px)
 Project descriptions show in full
 CTA image extends through contact form
 Contact form readable and functional
 Footer keeps dark background
 npm run build and npx tsc --noEmit pass
 No overlap at any breakpoint
 Nav anchor links work
 Contact form submits correctly
 Write summary to tasks/todo.md