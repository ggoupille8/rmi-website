# SPEC: Error Handling, 404 Page & Edge Cases

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

The site needs a custom 404 page, form error handling polish, and edge case coverage. These are the "last 5%" details that prevent users from hitting dead ends.

**DO NOT MODIFY:** Any existing working features, content text, SEO meta tags, or analytics.

---

## TASK 1: Custom 404 Page

### Files
- `frontend/src/pages/404.astro` (create new)

### Approach
1. Create a custom 404 page at `frontend/src/pages/404.astro` using the existing `BaseLayout.astro`.
2. The page should match the site's dark theme and include:
   - The standard navbar (so users can navigate back)
   - A centered message: large "404" text, "Page Not Found" heading, brief description
   - A "Back to Home" button styled like the primary CTA (`btn-primary`)
   - A "Request a Quote" link as secondary action
   - The standard footer
3. Keep it simple — no complex graphics or animations.
4. Style the 404 number as a large, semi-transparent decorative element.
5. Page title should be "Page Not Found | Resource Mechanical Insulation"

### Verification
- `npm run build` passes.
- Navigating to `/nonexistent-page` shows the custom 404 page.
- The 404 page has navbar, 404 message, home button, and footer.
- The page matches the site's dark theme.

---

## TASK 2: Contact Form — Client-Side Validation Enhancement

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
1. Check existing validation. The form should validate:
   - **Name**: Required, minimum 2 characters
   - **Email**: Required, valid email format
   - **Phone**: Optional, but if provided, valid phone format (10+ digits)
   - **Company**: Optional
   - **Service Type**: Required selection (not the placeholder "Select a project type...")
   - **Project Details**: Optional
2. Add inline error messages below each invalid field (red text, small font):
   ```tsx
   {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
   ```
3. Validate on blur (when user leaves a field) AND on submit.
4. Highlight invalid fields with a red border: `border-red-500` instead of the default border.
5. Clear the error when the user starts typing in the field.
6. If the form already has this validation, verify it covers all fields and the error messages are user-friendly.

### Verification
- `npm run build` passes.
- Submitting an empty form shows validation errors on required fields.
- Typing in a field clears its error.
- Email field rejects invalid formats.
- Error messages appear in red below the relevant field.

---

## TASK 3: Contact Form — Loading State

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
1. When the form is submitted, the "Send Message" button should:
   - Become disabled (prevent double submission)
   - Show a loading spinner or "Sending..." text
   - Disable all form fields while submission is in progress
2. Implementation:
   ```tsx
   const [isSubmitting, setIsSubmitting] = useState(false);
   
   // In the submit handler:
   setIsSubmitting(true);
   try {
     await submitForm(data);
     // Show success
   } catch (error) {
     // Show error
   } finally {
     setIsSubmitting(false);
   }
   ```
3. Button during loading:
   ```tsx
   <button disabled={isSubmitting} className={`btn-primary ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
     {isSubmitting ? 'Sending...' : 'Send Message'}
   </button>
   ```
4. If this already exists, verify it works correctly and the loading state is visually clear.

### Verification
- `npm run build` passes.
- Clicking Send Message shows a loading state.
- The button is disabled during submission.
- Double-clicking doesn't submit twice.

---

## TASK 4: Contact Form — Server Error Handling

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach
1. If the API call fails (network error, 500 response, timeout), show a user-friendly error message:
   - "Something went wrong. Please try again or call us directly at 248-379-5156."
2. The error should appear above the submit button or at the top of the form.
3. Style it as a red/warning banner: `bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-lg`
4. Include a "Try Again" button that clears the error and re-enables the form.
5. The phone number in the error message should be a clickable `tel:` link.
6. If this already exists, verify the error handling covers:
   - Network failures (offline)
   - Server errors (500)
   - Timeout (>10 seconds)

### Verification
- `npm run build` passes.
- Simulating a failed API call shows the error message.
- The error message includes a clickable phone number.
- The "Try Again" button works.

---

## TASK 5: Keyboard Navigation — Skip to Content Link

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
1. Add a "Skip to main content" link as the first focusable element on the page:
   ```html
   <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium">
     Skip to main content
   </a>
   ```
2. Add `id="main-content"` to the `<main>` element (or the first content section after the navbar).
3. This is a WCAG AAA requirement — keyboard users can skip the navbar and jump directly to content.

### Verification
- `npm run build` passes.
- Pressing Tab on page load shows the "Skip to main content" link.
- Clicking it (or pressing Enter) jumps focus past the navbar to the main content.
- The link is visually hidden until focused.

---

## TASK 6: Copyright Year Auto-Update

### Files
- `frontend/src/components/landing/Footer.tsx` (or Footer.astro)

### Approach
1. Check the copyright year in the footer. If it's hardcoded as "2026", make it dynamic:
   ```tsx
   © {new Date().getFullYear()} Resource Mechanical Insulation, LLC
   ```
   Or in Astro:
   ```astro
   © {new Date().getFullYear()} Resource Mechanical Insulation, LLC
   ```
2. This ensures the year updates automatically every January 1st.

### Verification
- `npm run build` passes.
- The footer copyright shows the current year.
- The year is not hardcoded in the source — it uses `new Date().getFullYear()`.

---

## EXECUTION ORDER
1. Task 6 (copyright year — trivial)
2. Task 5 (skip link — small)
3. Task 1 (404 page — new file)
4. Task 3 (form loading — state addition)
5. Task 4 (form error handling — state addition)
6. Task 2 (form validation — most involved)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b feat/error-handling-404`
3. Make all changes, `npm run build`, `npm run test`
4. Update visual baselines if needed: `npm run test:visual:update`
5. `git add . && git commit -m "feat: custom 404, form validation/loading/errors, skip link, dynamic copyright"`
6. `git push origin feat/error-handling-404`
7. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] Custom 404 page exists and renders properly
- [ ] Contact form shows inline validation errors on required fields
- [ ] Submit button shows loading state during submission
- [ ] Failed submissions show user-friendly error with phone number
- [ ] "Skip to main content" link appears on Tab and works
- [ ] Copyright year is dynamic (not hardcoded)
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
