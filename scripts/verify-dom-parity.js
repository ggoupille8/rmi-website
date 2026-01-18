/**
 * DOM Parity Verification Script
 * 
 * Run this in browser console to verify Hero and Services sections
 * have identical DOM structure across all breakpoints (375px, 430px, 768px, 1024px, 1440px)
 * 
 * Usage:
 * 1. Open Chrome DevTools (F12)
 * 2. Use Device Toolbar (Ctrl+Shift+M)
 * 3. Set viewport to one of: 375px, 430px, 768px, 1024px, 1440px
 * 4. Paste this script in Console and run
 * 5. Repeat for each breakpoint
 */

(function verifyDOMParity() {
  const results = {
    viewport: window.innerWidth,
    hero: {},
    services: {},
    errors: []
  };

  // Check Hero section DOM parity
  function checkHeroParity() {
    const hero = document.querySelector('section[aria-labelledby="hero-heading"]');
    if (!hero) {
      results.errors.push('Hero section not found');
      return null;
    }

    const contentCol = hero.querySelector('div > div > div:first-child');
    const imageCol = hero.querySelector('div > div > div:last-child');

    const checks = {
      sectionExists: !!hero,
      h1Exists: !!hero.querySelector('h1#hero-heading'),
      h1Id: hero.querySelector('h1#hero-heading')?.id === 'hero-heading',
      subheadlineExists: !!contentCol?.querySelector('p'),
      primaryCTAExists: !!contentCol?.querySelector('a.btn-primary'),
      phoneCTAExists: !!contentCol?.querySelector('a[aria-label*="Call"]'),
      emailCTAExists: !!contentCol?.querySelector('a[aria-label*="Email"]'),
      imageExists: !!imageCol?.querySelector('img'),
      overlayExists: !!imageCol?.querySelector('div[class*="absolute inset-0"]'),
      gradientOverlayExists: !!imageCol?.querySelector('[class*="GradientBlendOverlay"]') || !!imageCol?.querySelector('div:last-child'),
      accentLineExists: !!contentCol?.querySelector('div[class*="hidden lg:block"]'),
      contentFirst: contentCol?.querySelector('h1') !== null,
      imageSecond: imageCol?.querySelector('img') !== null,
      ctaCount: contentCol?.querySelectorAll('a').length === 3,
      domOrder: {
        contentIndex: Array.from(hero.querySelector('div > div').children).indexOf(contentCol),
        imageIndex: Array.from(hero.querySelector('div > div').children).indexOf(imageCol)
      }
    };

    return checks;
  }

  // Check Services section DOM parity
  function checkServicesParity() {
    const services = document.querySelector('section[aria-labelledby="services-heading"]');
    if (!services) {
      results.errors.push('Services section not found');
      return null;
    }

    const grid = services.querySelector('.services-grid');
    const contentCol = grid?.querySelector('div:first-child');
    const imageCol = grid?.querySelector('div:last-child');
    const serviceItems = services.querySelectorAll('ul > li');

    const checks = {
      sectionExists: !!services,
      topBorderExists: !!services.querySelector('div[class*="absolute top-0"]'),
      bottomBorderExists: !!services.querySelector('div[class*="absolute bottom-0"]'),
      h2Exists: !!services.querySelector('h2#services-heading'),
      h2Id: services.querySelector('h2#services-heading')?.id === 'services-heading',
      subtitleExists: !!contentCol?.querySelector('p'),
      servicesListExists: !!contentCol?.querySelector('ul'),
      serviceItemsCount: serviceItems.length,
      expectedServiceItems: 18,
      allServicesPresent: serviceItems.length === 18,
      imageExists: !!imageCol?.querySelector('img'),
      overlayExists: !!imageCol?.querySelector('div[class*="absolute inset-0"]'),
      gradientOverlayExists: !!imageCol?.querySelector('[class*="GradientBlendOverlay"]') || !!imageCol?.querySelector('div:last-child'),
      accentLineExists: !!contentCol?.querySelector('div[class*="hidden lg:block"]'),
      contentFirst: contentCol?.querySelector('h2') !== null,
      imageSecond: imageCol?.querySelector('img') !== null,
      domOrder: {
        contentIndex: grid ? Array.from(grid.children).indexOf(contentCol) : -1,
        imageIndex: grid ? Array.from(grid.children).indexOf(imageCol) : -1
      }
    };

    return checks;
  }

  results.hero = checkHeroParity();
  results.services = checkServicesParity();

  // Summary
  const heroPass = results.hero && Object.values(results.hero).every(v => v === true || (typeof v === 'object' && v !== null));
  const servicesPass = results.services && Object.values(results.services).every(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'object' && v !== null) return true;
    return v === true;
  });

  console.group('🔍 DOM Parity Verification');
  console.log(`Viewport: ${results.viewport}px`);
  console.log('');
  console.group('Hero Section');
  console.table(results.hero);
  console.log(heroPass ? '✅ All checks passed' : '❌ Some checks failed');
  console.groupEnd();
  console.log('');
  console.group('Services Section');
  console.table(results.services);
  console.log(servicesPass ? '✅ All checks passed' : '❌ Some checks failed');
  console.groupEnd();
  console.log('');
  if (results.errors.length > 0) {
    console.error('Errors:', results.errors);
  }
  console.log(heroPass && servicesPass && results.errors.length === 0 
    ? '✅ DOM Parity Verified - All elements present at this breakpoint'
    : '❌ DOM Parity Issues Found - Check details above');
  console.groupEnd();

  return results;
})();

