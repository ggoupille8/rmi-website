# SPRINT-3: Analytics Setup + Final Polish

**Spec Version:** 1.0  
**Date:** February 26, 2026  
**Author:** Senior Developer Audit  
**Execution:** Claude Code autonomous — read this file, execute all tasks in order, verify each before marking complete.

---

## CONTEXT

This sprint has two goals: (1) get analytics instrumented so the site is collecting visitor data and form conversion metrics, and (2) clean up the remaining low-severity UI polish from the February 26 mobile audit. Sprint 1 (hero, projects, social links, domain) and Sprint 2 (service cards, nav, FAB, content) are complete and merged. Do NOT modify anything from Sprint 1 or Sprint 2 unless explicitly specified here.

---

## TASK 1: Google Analytics 4 — Install and Configure

### Problem
The site has been live since February 17 but has no analytics. Every day without analytics is lost visitor data — we can't see traffic sources, page engagement, bounce rates, or form conversion rates.

### Files
- `frontend/src/layouts/BaseLayout.astro` (head tag — analytics script goes here)
- Possibly `frontend/src/components/landing/ContactForm.tsx` (form submission event tracking)

### Approach

1. **Add the GA4 script tag** to `BaseLayout.astro` inside the `<head>` section. Use the standard Google Analytics 4 async snippet:

   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID" is:inline></script>
   <script is:inline>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'GA_MEASUREMENT_ID');
   </script>
   ```

2. **Use an environment variable** for the measurement ID so it's not hardcoded:
   - Add `PUBLIC_GA_MEASUREMENT_ID` to the Astro config / environment
   - In development, the script should NOT load if the env var is missing or empty (avoid polluting analytics with dev traffic)
   - Wrap the script in a conditional: only render if `import.meta.env.PUBLIC_GA_MEASUREMENT_ID` is defined and non-empty
   - If Astro doesn't support inline conditional script rendering easily, use a simple approach: set a `data-ga-id` attribute on a meta tag and load the script conditionally via a small inline script block

3. **Important Astro note:** Scripts in `.astro` files need the `is:inline` directive to prevent Astro from bundling them. Without `is:inline`, the GA script won't work correctly.

4. **Do NOT:**
   - Hardcode a measurement ID (use env var)
   - Add Google Tag Manager (just GA4 for now — simpler)
   - Add any cookie consent banner at this stage (can be added later if needed)

### Verification
- Run `npm run build` — no errors
- Inspect the built HTML output — GA4 script should be present in the `<head>` when the env var is set
- GA4 script should NOT be present when env var is missing (verify by temporarily unsetting it)
- The script uses `is:inline` directive
- No TypeScript errors related to the script

---

## TASK 2: Contact Form — Conversion Event Tracking

### Problem
We need to know how many visitors submit the contact form. A basic page view count is useful, but form submission is the conversion event that matters.

### Files
- `frontend/src/components/landing/ContactForm.tsx`

### Approach

1. **Fire a GA4 event on successful form submission.** After the form successfully submits (after the API returns success, not on button click), add:

   ```typescript
   // Fire GA4 conversion event
   if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
     window.gtag('event', 'form_submission', {
       event_category: 'contact',
       event_label: 'quote_request',
       value: 1
     });
   }
   ```

2. **Add the gtag type declaration** so TypeScript doesn't complain. Add to the component file or a global `.d.ts`:

   ```typescript
   declare global {
     interface Window {
       gtag?: (...args: any[]) => void;
       dataLayer?: any[];
     }
   }
   ```

3. **Also track CTA button clicks** as a secondary engagement event. In the hero "Request a Quote" button and the CTA banner, add an onClick handler that fires:

   ```typescript
   if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
     window.gtag('event', 'cta_click', {
       event_category: 'engagement',
       event_label: 'request_quote'
     });
   }
   ```

4. **Do NOT track** every nav link click or scroll event — keep it simple. Just two events: `form_submission` (conversion) and `cta_click` (engagement).

5. **Graceful degradation:** All gtag calls must check that `window.gtag` exists before calling. If analytics is blocked by an ad blocker, the site should work identically.

### Verification
- Run `npm run build` — no errors, no TypeScript errors
- Form submission success handler includes the `form_submission` gtag event
- CTA buttons include `cta_click` gtag event on click
- All gtag calls are wrapped in existence checks
- The form still works correctly if gtag is undefined (ad blocker scenario)

---

## TASK 3: Google Search Console — Verification Meta Tag

### Problem
Google Search Console requires a verification meta tag (or other method) to prove site ownership. Once verified, Graham can see search impressions, click-through rates, and indexing status.

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach

1. **Add a Search Console verification meta tag** placeholder in the `<head>` of `BaseLayout.astro`:

   ```html
   {import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION && (
     <meta name="google-site-verification" content={import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION} />
   )}
   ```

2. Like GA4, use an environment variable so it's not hardcoded and doesn't render in development.

3. **Verify the sitemap is accessible.** The sitemap should already be configured from Sprint 1. Confirm that `https://rmi-llc.net/sitemap-index.xml` (or `sitemap.xml`) is referenced in `robots.txt`:
   ```
   Sitemap: https://rmi-llc.net/sitemap-index.xml
   ```
   If not, add/update the sitemap reference in `frontend/public/robots.txt`.

4. **Do NOT:**
   - Create a Google Search Console account (Graham does this himself)
   - Submit the sitemap (Graham does this after adding the verification code)

### Verification
- Run `npm run build` — no errors
- Built HTML includes the verification meta tag when env var is set
- Meta tag does NOT render when env var is missing
- `robots.txt` contains a `Sitemap:` line pointing to `https://rmi-llc.net/sitemap-index.xml` (or correct sitemap URL)

---

## TASK 4: Phone/Email Quick-Action Icons — Visibility Improvement

### Problem
In the hero section, the phone and email quick-action icon buttons (circular icons below the CTA) have gray circle outlines that nearly disappear against the hero background image.

### Files
- `frontend/src/components/landing/HeroFullWidth.tsx`

### Approach
1. Locate the phone and email icon buttons in the hero component.
2. **Increase their visibility** by adding a subtle semi-transparent background:
   - Add `bg-white/10` and `backdrop-blur-sm` to the icon container circles
   - This creates a frosted glass effect that makes them visible against any hero image without being heavy-handed
3. **On hover**, brighten slightly: `hover:bg-white/20` transition
4. Keep the current icon color (white or light gray outlines).
5. **Do NOT** change the icon size, position, or functionality.

### Verification
- Run `npm run build` — no errors
- Phone and email icons are visually distinguishable against the hero image at 375px viewport
- Hover state provides subtle brightness change
- Icons remain functional (phone opens tel: dialog, email opens mailto:)

---

## TASK 5: About Section Icon Circle Background Fill

### Problem
The icon circles in the "Why Choose RMI" cards (Safety-First, Emergency Response, Proven Track Record, Union-Trained) use thin blue outline circles that nearly blend into the dark card backgrounds.

### Files
- `frontend/src/components/landing/About.tsx`

### Approach
1. Locate the icon container elements in the About cards.
2. Add a subtle background fill inside the icon circles: `bg-blue-500/10` (10% opacity blue)
3. This gives them visual weight without being heavy. The existing blue outline/border should remain.
4. **Do NOT** change the icon SVGs, card layout, or card content.

### Verification
- Run `npm run build` — no errors
- Icon circles have a visible but subtle blue-tinted background
- The fill doesn't overpower the icon itself
- Check at 375px viewport

---

## TASK 6: EMR Safety Rating Badge

### Problem
RMI has an EMR (Experience Modification Rate) of 0.76, which is 24% better than the industry average of 1.0. This is a meaningful safety credential that isn't displayed anywhere on the site. Competitors like Rival Insulation prominently feature their safety record, and this is a concrete, verifiable number that builds trust.

### Files
- `frontend/src/components/landing/About.tsx`
- `frontend/src/content/site.ts` (if About content is defined here)

### Approach
1. **Add the EMR rating to the Safety-First Culture card.** Append one sentence to the existing card description:
   - Add: "Our EMR rating of 0.76 puts us 24% better than the industry average — a direct reflection of our commitment to planning, training, and accountability."
2. **Do NOT** create a separate badge, banner, or visual element for this. Just add it as an additional sentence in the Safety-First card text.
3. **Do NOT** change any other card content.

### Verification
- Run `npm run build` — no errors
- Safety-First Culture card includes the EMR rating sentence
- No other card content changed
- Text reads naturally within the existing card description

---

## EXECUTION ORDER

1. **Task 1** (GA4 install) — foundational, everything else can build on it
2. **Task 2** (Form event tracking) — depends on Task 1's gtag being available
3. **Task 3** (Search Console meta tag) — quick, while in the head tag area
4. **Task 4** (Hero icon visibility) — quick CSS tweak
5. **Task 5** (About icon backgrounds) — quick CSS tweak
6. **Task 6** (EMR rating content) — small content addition

After all tasks: run full `npm run build`, update visual baselines if Playwright visual tests exist (`npm run test:visual:update`), run any functional tests.

---

## GIT WORKFLOW

1. Create feature branch: `git checkout -b feat/sprint-3-analytics-polish`
2. Make all changes
3. Commit with: `git add . && git commit -m "feat: Sprint 3 — GA4 analytics, event tracking, Search Console prep, icon polish, EMR rating"`
4. **Do NOT merge to main.** Leave the branch for Graham to review and merge manually.

---

## POST-MERGE STEPS (for Graham, not Claude Code)

After merging this branch to main and Vercel deploys:

1. **Set environment variables in Vercel dashboard:**
   - `PUBLIC_GA_MEASUREMENT_ID` — Get this from Google Analytics (create a GA4 property for rmi-llc.net first)
   - `PUBLIC_GOOGLE_SITE_VERIFICATION` — Get this from Google Search Console (add property for rmi-llc.net)

2. **Verify GA4 is working:**
   - Visit rmi-llc.net in a regular browser (not incognito with ad blocker)
   - Open Google Analytics > Realtime report
   - You should see yourself as an active user

3. **Submit sitemap in Search Console:**
   - Go to Google Search Console > Sitemaps
   - Submit: `https://rmi-llc.net/sitemap-index.xml`

---

## DEFINITION OF DONE

- [ ] All 6 tasks completed and individually verified
- [ ] `npm run build` passes with zero errors
- [ ] GA4 script loads conditionally based on env var
- [ ] Form submission fires `form_submission` GA4 event
- [ ] CTA clicks fire `cta_click` GA4 event
- [ ] All gtag calls gracefully handle missing gtag (ad blocker safe)
- [ ] Search Console verification meta tag loads conditionally based on env var
- [ ] Sitemap URL present in robots.txt
- [ ] Hero phone/email icons have frosted glass background effect
- [ ] About card icon circles have subtle blue background fill
- [ ] Safety-First card includes EMR rating sentence
- [ ] Feature branch created, committed, NOT merged to main
- [ ] Summary of all changes written to `tasks/todo.md`
