# SPEC: SEO & Structured Data Polish

**Spec Version:** 1.0
**Date:** March 4, 2026
**Execution:** Claude Code autonomous

---

## CONTEXT

The site has LocalBusiness and Organization JSON-LD schemas but they're missing key fields that Google uses for Knowledge Panels and rich results. Service schema is missing entirely — adding it helps Google understand what RMI does and can improve search visibility for service-related queries. Additionally, service cards lack `role="button"` for accessibility, and the meta description is 1 character over the optimal 160-char limit.

**DO NOT MODIFY:** Any visual styling, layout, component structure, hero, footer, or analytics code.

---

## TASK 1: Enrich LocalBusiness Schema

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
Find the existing LocalBusiness JSON-LD script. Add these missing fields:

1. `"logo"` — point to the logo URL: `"https://www.rmi-llc.net/images/logo/rmi-logo-full.webp"`
2. `"sameAs"` — array of social profiles:
   ```json
   "sameAs": [
     "https://www.linkedin.com/company/resource-mechanical-insulation",
     "https://www.facebook.com/ResourceMechanicalInsulation"
   ]
   ```
3. Verify `"telephone"` uses E.164 format: `"+12483795156"`
4. Verify `"url"` is `"https://www.rmi-llc.net"`

### Verification
- `npm run build` passes.
- The LocalBusiness JSON-LD includes `logo`, `sameAs` array with 2 entries.

---

## TASK 2: Enrich Organization Schema

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
Find the existing Organization JSON-LD script. Add:

1. `"logo"` — `"https://www.rmi-llc.net/images/logo/rmi-logo-full.webp"`
2. `"sameAs"` — same array as LocalBusiness:
   ```json
   "sameAs": [
     "https://www.linkedin.com/company/resource-mechanical-insulation",
     "https://www.facebook.com/ResourceMechanicalInsulation"
   ]
   ```
3. `"contactPoint"`:
   ```json
   "contactPoint": {
     "@type": "ContactPoint",
     "telephone": "+12483795156",
     "contactType": "sales",
     "email": "fab@rmi-llc.net",
     "availableLanguage": "English"
   }
   ```
4. `"foundingDate"`: `"2021"`
5. `"numberOfEmployees"`: `{"@type": "QuantitativeValue", "minValue": 10, "maxValue": 50}`

### Verification
- `npm run build` passes.
- Organization JSON-LD includes logo, sameAs, contactPoint, foundingDate, numberOfEmployees.

---

## TASK 3: Add Service Schema Structured Data

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
Add a new JSON-LD script block with an array of Service schemas for RMI's core services. Use a single script with `@graph` or add individual Service entries. The services to include:

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Pipe Insulation",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Resource Mechanical Insulation, LLC"
  },
  "areaServed": {
    "@type": "State",
    "name": "Michigan"
  },
  "description": "Commercial and industrial pipe insulation services including plumbing, HVAC, process piping, steam/condensate, and cryogenic systems."
}
```

Create similar entries for these services (6 total):
1. **Pipe Insulation** — plumbing, HVAC, process piping, steam/condensate, cryogenic
2. **Duct Insulation** — standard ductwork, grease duct, fume hood, generator exhaust, boiler breeching
3. **Equipment Insulation** — tanks, vessels, removable blankets/cans
4. **Field-Applied Jacketing** — aluminum, stainless steel, PVC jacketing and lagging
5. **Pipe Support Fabrication** — custom pipe support fabrication and installation
6. **Emergency Insulation Response** — 24/7 emergency insulation repair and replacement

Each service should have: `serviceType`, `provider` (reference to LocalBusiness), `areaServed` (Michigan), and a brief `description`.

### Verification
- `npm run build` passes.
- 6 Service schema entries exist in the page source.
- Google Rich Results Test (https://search.google.com/test/rich-results) accepts the page without errors.

---

## TASK 4: Service Cards — Add role="button" and aria-label

### Files
- `frontend/src/components/landing/Services.tsx`

### Approach
1. Each service card div has `cursor-pointer` and `tabIndex={0}` but no `role` attribute. Add `role="button"` to each card.
2. Add `aria-label={`View ${service.title} details`}` to each card so screen readers announce what clicking does.
3. Verify that the existing `onKeyDown` handler responds to Enter and Space keys (standard button behavior). If not, add:
   ```tsx
   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(service); } }}
   ```

### Verification
- `npm run build` passes.
- Each service card has `role="button"` and `aria-label`.
- Pressing Enter or Space on a focused service card opens the modal.

---

## TASK 5: Trim Meta Description to 160 Characters

### Files
- `frontend/src/layouts/BaseLayout.astro`

### Approach
The current meta description is 161 characters — 1 over the optimal limit. Find it and trim to ≤160 characters without losing meaning. Keep the core message about commercial/industrial insulation in Michigan.

### Verification
- `npm run build` passes.
- Meta description content attribute is ≤160 characters.

---

## EXECUTION ORDER
1. Task 5 (meta desc trim — trivial)
2. Task 4 (service card a11y — small)
3. Task 1 (LocalBusiness schema)
4. Task 2 (Organization schema)
5. Task 3 (Service schemas — most code)

## GIT WORKFLOW
1. `git checkout main && git pull origin main`
2. `git checkout -b fix/seo-schema-polish`
3. Make all changes, `npm run build`, `npm run test`
4. Update visual baselines if needed: `npm run test:visual:update`
5. `git add . && git commit -m "fix: SEO schema enrichment, service a11y, meta desc trim"`
6. `git push origin fix/seo-schema-polish`
7. **Do NOT merge to main.**

## DEFINITION OF DONE
- [ ] LocalBusiness has logo + sameAs
- [ ] Organization has logo + sameAs + contactPoint + foundingDate
- [ ] 6 Service schemas added
- [ ] Service cards have role="button" and aria-label
- [ ] Meta description ≤160 chars
- [ ] `npm run build` passes
- [ ] Branch pushed, NOT merged
- [ ] Summary written to `tasks/todo.md`
