# Mobile Visual QA Punch-List
**Date:** 2025-12-21  
**Viewports Tested:** iPhone SE (375x667), Small Android (360x640)  
**Mode:** Dark mode only (per requirements)

---

## Summary

- **P0 (Critical):** 6 issues
- **P1 (High):** 2 issues  
- **P2 (Medium):** 3 issues

**Total:** 11 issues

---

## P0 - Critical Issues (Must Fix)

### 1. Footer Phone Link Tap Target Too Small
- **Symptom:** Phone link in footer contact list has height of 26px (below 44px minimum)
- **Viewport:** Both iPhone SE (375x667) and Android Small (360x640)
- **Repro Steps:** 
  1. Viewport: 375x667 or 360x640
  2. Scroll to bottom of page
  3. Locate footer "Get in Touch" section
  4. Inspect phone link (first item in contact list)
- **Suspected Cause:** Link uses `flex items-center gap-2` with no padding, resulting in 26px height
- **Candidate Fix:** Add `py-2` or `min-h-[44px]` to phone/email links in footer contact list
- **File Reference:** `src/components/landing/Footer.tsx:57-68`

### 2. Footer Email Link Tap Target Too Small
- **Symptom:** Email link in footer contact list has height of 26px (below 44px minimum)
- **Viewport:** Both iPhone SE (375x667) and Android Small (360x640)
- **Repro Steps:** 
  1. Viewport: 375x667 or 360x640
  2. Scroll to bottom of page
  3. Locate footer "Get in Touch" section
  4. Inspect email link (second item in contact list)
- **Suspected Cause:** Link uses `flex items-center gap-2` with no padding, resulting in 26px height
- **Candidate Fix:** Add `py-2` or `min-h-[44px]` to phone/email links in footer contact list
- **File Reference:** `src/components/landing/Footer.tsx:70-82`

### 3. Footer Bottom Bar "Contact" Link Tap Target Too Small
- **Symptom:** "Contact" link in footer bottom bar has height of 26px (below 44px minimum)
- **Viewport:** Both iPhone SE (375x667) and Android Small (360x640)
- **Repro Steps:** 
  1. Viewport: 375x667 or 360x640
  2. Scroll to bottom of page
  3. Locate footer bottom bar (below main footer content)
  4. Inspect "Contact" link on right side
- **Suspected Cause:** Link uses `text-white hover:text-primary-300` with no padding, resulting in 26px height
- **Candidate Fix:** Add `py-2` or `min-h-[44px]` to bottom bar links
- **File Reference:** `src/components/landing/Footer.tsx:117-123`

---

## P1 - High Priority Issues

### 4. Services Section Long Titles May Wrap Awkwardly
- **Symptom:** Several service titles are very long (50+ characters) and may wrap awkwardly on small screens
- **Viewport:** Both iPhone SE (375x667) and Android Small (360x640)
- **Repro Steps:** 
  1. Viewport: 375x667 or 360x640
  2. Scroll to Services section
  3. Inspect long titles such as:
     - "Lagging/Jacketing Systems for Outdoor Duct and Piping Systems" (67 chars)
     - "Removable Blankets/Cans (Pumps, Valves, Strainers, Expansion Joints)" (71 chars)
     - "Energy Evaluation/Budgeting/Value Engineering" (48 chars)
- **Suspected Cause:** While `break-words` is applied, font size may be too large for very long titles on mobile
- **Candidate Fix:** Consider reducing font size on mobile for service items (currently `text-base sm:text-lg lg:text-xl`). Could use `text-sm sm:text-base lg:text-lg` or add mobile-specific smaller size.
- **File Reference:** `src/components/landing/Services.tsx:321`

### 5. Hero Section Padding May Be Tight on Small Android
- **Symptom:** Hero content has `pl-4 pr-4` (16px) padding which may feel tight on 360px viewport
- **Viewport:** Android Small (360x640)
- **Repro Steps:** 
  1. Viewport: 360x640
  2. Scroll to top (Hero section)
  3. Inspect left/right padding of hero content
- **Suspected Cause:** 16px padding on 360px viewport leaves only 328px for content, which may feel cramped
- **Candidate Fix:** Consider using `px-3` (12px) on very small screens (< 375px) or ensure content doesn't overflow
- **File Reference:** `src/components/landing/Hero.tsx:72`

---

## P2 - Medium Priority Issues

### 6. Services Section Card Padding Consistency
- **Symptom:** Services card uses `p-4 sm:p-6 lg:p-8` which may be inconsistent with other sections
- **Viewport:** Both iPhone SE (375x667) and Android Small (360x640)
- **Repro Steps:** 
  1. Viewport: 375x667 or 360x640
  2. Scroll to Services section
  3. Inspect white card containing service list
- **Suspected Cause:** Card padding `p-4` (16px) on mobile may feel tight given the content density
- **Candidate Fix:** Verify padding feels adequate, consider `p-5` or `px-5 py-4` on mobile if needed
- **File Reference:** `src/components/landing/Services.tsx:298`

### 7. Contact Form Grid Layout on Mobile
- **Symptom:** Email/Phone fields use `grid-cols-1 gap-4 sm:grid-cols-2` which is correct, but spacing may feel tight
- **Viewport:** Both iPhone SE (375x667) and Android Small (360x640)
- **Repro Steps:** 
  1. Viewport: 375x667 or 360x640
  2. Scroll to Contact Form section
  3. Inspect form field spacing
- **Suspected Cause:** `gap-4` (16px) between fields may feel tight on mobile
- **Candidate Fix:** Consider `gap-5` or `gap-6` on mobile for better breathing room
- **File Reference:** `src/components/landing/ContactForm.tsx:221`

### 8. Footer Grid Column Layout Verification
- **Symptom:** Footer uses `grid-cols-1 gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4` - verify single column on mobile
- **Viewport:** Both iPhone SE (375x667) and Android Small (360x640)
- **Repro Steps:** 
  1. Viewport: 375x667 or 360x640
  2. Scroll to bottom
  3. Verify footer columns stack vertically (single column)
- **Suspected Cause:** Layout appears correct, but verify no horizontal overflow
- **Candidate Fix:** Ensure `grid-cols-1` is applied on mobile (already present, verify visually)
- **File Reference:** `src/components/landing/Footer.tsx:11`

---

## Verified Working Correctly

### ✅ No Horizontal Scroll
- **Status:** Confirmed on both viewports
- **Note:** No elements exceed viewport width

### ✅ Hero CTA Buttons
- **Status:** All buttons meet 44px minimum
  - Primary CTA: 186x64px ✓
  - Phone button: 64x64px ✓
  - Email button: 64x64px ✓

### ✅ Contact Form Submit Button
- **Status:** Submit button meets 44px minimum
  - iPhone SE: 343x51px ✓
  - Android Small: 328x51px ✓

### ✅ Footer CTA Buttons (Main Stack)
- **Status:** Main footer CTA buttons meet 44px minimum
  - Phone CTA: 343x52px (iPhone) / 328x52px (Android) ✓
  - Email CTA: 343x52px (iPhone) / 328x52px (Android) ✓
  - Request Quote: 343x52px (iPhone) / 328x52px (Android) ✓

### ✅ Services Text Wrapping
- **Status:** Service items use `break-words` class correctly
- **Note:** Long titles wrap properly, though font size consideration noted in P1

---

## Recommendations

1. **Immediate Action:** Fix all P0 tap target issues in Footer component
2. **Review:** Test Services section with longest titles on actual devices
3. **Consider:** Adding mobile-specific font size adjustments for very long service titles
4. **Verify:** Test footer links with actual finger taps to ensure usability

---

## Test Commands

```bash
# Capture mobile screenshots
npm run dev
npx tsx scripts/mobile-qa.ts

# Run automated inspection
npx tsx scripts/mobile-inspect.ts

# View report
cat artifacts/mobile-qa/inspection-report.json
```

---

## Notes

- All measurements taken in dark mode as per requirements
- Tap target minimum: 44x44px (iOS/Android standard)
- Horizontal scroll check: Passed on both viewports
- Screenshots available in: `artifacts/mobile-qa/`


