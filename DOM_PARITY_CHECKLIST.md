# DOM Parity Checklist - Hero & Services Sections

## Required DOM Parity Across Breakpoints

**Breakpoints to verify:** 375px, 430px, 768px, 1024px, 1440px

### Verification Method
1. Open Chrome DevTools (F12)
2. Use Device Toolbar (Ctrl+Shift+M)
3. Set custom widths: 375px, 430px, 768px, 1024px, 1440px
4. Inspect DOM structure in Elements panel
5. Verify all elements listed below exist at each breakpoint

---

## Hero Section DOM Structure

### Required Elements (Must exist at ALL breakpoints):

1. **Section Container**
   - `<section>` with `aria-labelledby="hero-heading"`

2. **Content Column** (First child in DOM)
   - Container div with content
   - Accent line decoration (`hidden lg:block` - CSS-only, element exists)
   - `<h1>` with `id="hero-heading"`
   - `<p>` subheadline
   - CTA container div
     - Primary CTA button (`<a>`)
     - Phone icon button (`<a>`)
     - Email icon button (`<a>`)

3. **Image Column** (Second child in DOM)
   - Container div
   - `<img>` hero image
   - White overlay div
   - GradientBlendOverlay component

### DOM Order (Must be consistent):
```
<section>
  <div> <!-- container -->
    <div> <!-- grid -->
      <div> <!-- content column - FIRST -->
        <div> <!-- accent line -->
        <h1>
        <p>
        <div> <!-- CTA container -->
          <a> <!-- primary CTA -->
          <a> <!-- phone -->
          <a> <!-- email -->
      </div>
      <div> <!-- image column - SECOND -->
        <img>
        <div> <!-- overlay -->
        <GradientBlendOverlay>
      </div>
    </div>
  </div>
</section>
```

### CSS-Only Differences (Acceptable):
- Grid layout: `grid` (mobile) → `lg:grid-cols-2` (desktop)
- Visual order: CSS Grid column positioning handles reordering
- Typography: `clamp()` scales smoothly
- Spacing: `clamp()` scales smoothly
- Accent line visibility: `hidden lg:block` (CSS-only)

---

## Services Section DOM Structure

### Required Elements (Must exist at ALL breakpoints):

1. **Section Container**
   - `<section>` with `aria-labelledby="services-heading"`

2. **Top Border**
   - Border div (absolute positioned)

3. **Content Column** (First child in DOM grid)
   - Container div
   - Accent line decoration (`hidden lg:block` - CSS-only, element exists)
   - `<h2>` with `id="services-heading"`
   - `<p>` subtitle
   - `<ul>` services list
     - Multiple `<li>` items (all services)
       - Each with icon and text

4. **Image Column** (Second child in DOM grid)
   - Container div
   - `<img>` services image
   - White overlay div
   - GradientBlendOverlay component

5. **Bottom Border**
   - Border div (absolute positioned)

### DOM Order (Must be consistent):
```
<section>
  <div> <!-- top border -->
  <div> <!-- container -->
    <div> <!-- services-grid -->
      <div> <!-- content column - FIRST -->
        <div> <!-- accent line -->
        <h2>
        <p>
        <ul>
          <li> <!-- service 1 -->
          <li> <!-- service 2 -->
          <!-- ... all services ... -->
      </div>
      <div> <!-- image column - SECOND -->
        <img>
        <div> <!-- overlay -->
        <GradientBlendOverlay>
      </div>
    </div>
  </div>
  <div> <!-- bottom border -->
</section>
```

### CSS-Only Differences (Acceptable):
- Grid layout: `grid` (mobile) → `lg:grid-cols-2` (desktop)
- Visual order: CSS Grid column positioning via `.services-grid` utility
- Typography: `clamp()` scales smoothly
- Spacing: `clamp()` scales smoothly
- Service list grid: `grid-cols-1` (mobile) → `sm:grid-cols-2` (desktop)
- Accent line visibility: `hidden lg:block` (CSS-only)

---

## Verification Checklist

### At Each Breakpoint (375px, 430px, 768px, 1024px, 1440px):

#### Hero Section:
- [ ] Section element exists
- [ ] H1 element exists with same id
- [ ] Subheadline paragraph exists
- [ ] Primary CTA button exists
- [ ] Phone icon button exists
- [ ] Email icon button exists
- [ ] Hero image exists
- [ ] All overlay elements exist
- [ ] DOM order: Content first, Image second
- [ ] No conditional rendering (`{condition && ...}`)
- [ ] No mobile-only/desktop-only components

#### Services Section:
- [ ] Section element exists
- [ ] Top border element exists
- [ ] H2 element exists with same id
- [ ] Subtitle paragraph exists
- [ ] Services list (`<ul>`) exists
- [ ] All service items (`<li>`) exist (18 items)
- [ ] Services image exists
- [ ] Bottom border element exists
- [ ] DOM order: Content first, Image second
- [ ] No conditional rendering (`{condition && ...}`)
- [ ] No mobile-only/desktop-only components

---

## Expected Visual Differences (CSS-Only):

### Hero:
- **375px-767px**: Single column, content stacked above image
- **768px-1023px**: Single column, content stacked above image
- **1024px+**: Two columns, content left, image right

### Services:
- **375px-767px**: Single column, content stacked above image
- **768px-1023px**: Single column, content stacked above image
- **1024px+**: Two columns, image left, content right (CSS Grid reordering)

---

## Remaining Divergences

### None Found ✅
- All elements exist in DOM at all breakpoints
- No conditional rendering based on screen size
- No mobile-only/desktop-only components
- Only CSS handles layout differences

---

## Quick Verification Script

To verify DOM parity programmatically, run in browser console:

```javascript
// Check Hero section DOM parity
function checkHeroParity() {
  const hero = document.querySelector('section[aria-labelledby="hero-heading"]');
  if (!hero) return { error: 'Hero section not found' };
  
  const checks = {
    h1: !!hero.querySelector('h1#hero-heading'),
    subheadline: !!hero.querySelector('p'),
    primaryCTA: !!hero.querySelector('a.btn-primary'),
    phoneCTA: !!hero.querySelector('a[aria-label*="Call"]'),
    emailCTA: !!hero.querySelector('a[aria-label*="Email"]'),
    image: !!hero.querySelector('img'),
    contentFirst: hero.querySelector('div > div > div:first-child')?.textContent.includes(hero.querySelector('h1')?.textContent || ''),
    imageSecond: hero.querySelector('div > div > div:last-child')?.querySelector('img') !== null
  };
  
  return checks;
}

// Check Services section DOM parity
function checkServicesParity() {
  const services = document.querySelector('section[aria-labelledby="services-heading"]');
  if (!services) return { error: 'Services section not found' };
  
  const checks = {
    h2: !!services.querySelector('h2#services-heading'),
    subtitle: !!services.querySelector('p'),
    servicesList: !!services.querySelector('ul'),
    serviceItems: services.querySelectorAll('ul > li').length === 18,
    image: !!services.querySelector('img'),
    topBorder: !!services.querySelector('div[class*="absolute top-0"]'),
    bottomBorder: !!services.querySelector('div[class*="absolute bottom-0"]'),
    contentFirst: services.querySelector('.services-grid > div:first-child')?.querySelector('h2') !== null,
    imageSecond: services.querySelector('.services-grid > div:last-child')?.querySelector('img') !== null
  };
  
  return checks;
}

// Run checks at current viewport
console.log('Hero DOM Parity:', checkHeroParity());
console.log('Services DOM Parity:', checkServicesParity());
```

---

## Notes

- All layout changes are CSS-only (Grid, Flexbox, media queries)
- Typography uses `clamp()` for fluid scaling
- Spacing uses `clamp()` for fluid scaling
- No JavaScript conditional rendering
- No duplicate components for mobile/desktop
- Visual order changes handled via CSS Grid column positioning

---

## Verification Results

**Verified:** 2025-12-23  
**Breakpoints Checked:** 375px, 430px, 768px, 1024px, 1440px

### Hero Section ✅
- ✅ All elements present at all breakpoints
- ✅ DOM order consistent: Content first, Image second
- ✅ No conditional rendering found
- ✅ All CTAs always present (primary, phone, email)
- ✅ H1, subheadline, image always in DOM

### Services Section ✅
- ✅ All elements present at all breakpoints
- ✅ DOM order consistent: Content first, Image second
- ✅ All 18 service items present at all breakpoints
- ✅ Borders (top/bottom) present at all breakpoints
- ✅ No conditional rendering found
- ✅ H2, subtitle, image always in DOM

### CSS-Only Differences (Acceptable) ✅
- Grid layout: `grid` → `lg:grid-cols-2`
- Visual order swap: CSS Grid column positioning (Services)
- Typography scaling: `clamp()` functions
- Spacing scaling: `clamp()` functions
- Accent line visibility: `hidden lg:block` (CSS-only)

### Remaining Divergences: None ✅
All DOM elements are identical across all breakpoints. Only CSS handles visual differences.

---

## How to Verify

1. **Manual Verification:**
   - Open Chrome DevTools (F12)
   - Toggle Device Toolbar (Ctrl+Shift+M)
   - Set custom width: 375px, 430px, 768px, 1024px, 1440px
   - Inspect Elements panel
   - Verify all elements listed above exist

2. **Automated Verification:**
   - Open browser console
   - Copy/paste contents of `scripts/verify-dom-parity.js`
   - Run script
   - Check console output for parity results
   - Repeat at each breakpoint

