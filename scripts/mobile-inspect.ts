import { chromium } from "playwright";
import { promises as fs } from "fs";
import { join } from "path";

const viewports = {
  "iphone-se": { width: 375, height: 667 },
  "android-small": { width: 360, height: 640 },
};

const baseURL = "http://localhost:4321";
const outputFile = join(process.cwd(), "artifacts", "mobile-qa", "inspection-report.json");

interface Issue {
  priority: "P0" | "P1" | "P2";
  section: string;
  symptom: string;
  viewport: string;
  reproSteps: string;
  suspectedCause: string;
  candidateFix: string;
  fileReference: string;
  lineReference?: string;
  measurements?: Record<string, number>;
}

async function inspectMobileLayout() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const issues: Issue[] = [];

  console.log(`Inspecting mobile layout...`);
  console.log(`Base URL: ${baseURL}\n`);

  for (const [deviceName, viewport] of Object.entries(viewports)) {
    console.log(`\n=== ${deviceName.toUpperCase()} (${viewport.width}x${viewport.height}) ===`);
    
    const page = await context.newPage();
    await page.setViewportSize(viewport);
    await page.emulateMedia({ 
      colorScheme: "dark",
      reducedMotion: "reduce"
    });

    await page.goto(baseURL);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);

    // Check for horizontal scroll
    const horizontalScroll = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        documentClientWidth: document.documentElement.clientWidth,
        hasHorizontalScroll: document.body.scrollWidth > document.body.clientWidth || 
                            document.documentElement.scrollWidth > document.documentElement.clientWidth
      };
    });

    if (horizontalScroll.hasHorizontalScroll) {
      issues.push({
        priority: "P0",
        section: "Page Layout",
        symptom: `Horizontal scroll detected: body scrollWidth=${horizontalScroll.bodyScrollWidth}, clientWidth=${horizontalScroll.bodyClientWidth}`,
        viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
        reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll position: top`,
        suspectedCause: "Element(s) exceeding viewport width, likely due to fixed widths, negative margins, or overflow",
        candidateFix: "Review all elements with fixed widths, check for negative margins, ensure max-width: 100% on images/containers",
        fileReference: "src/styles/global.css",
        measurements: horizontalScroll
      });
      console.log(`❌ P0: Horizontal scroll detected`);
    } else {
      console.log(`✓ No horizontal scroll`);
    }

    // Inspect Hero section
    const heroSection = page.locator('section[aria-labelledby="hero-heading"]');
    if (await heroSection.count() > 0) {
      const heroIssues = await inspectHero(page, heroSection, deviceName, viewport);
      issues.push(...heroIssues);
    }

    // Inspect Services section
    const servicesSection = page.locator('section[aria-labelledby="services-heading"]');
    if (await servicesSection.count() > 0) {
      const servicesIssues = await inspectServices(page, servicesSection, deviceName, viewport);
      issues.push(...servicesIssues);
    }

    // Inspect Contact Form section
    const contactSection = page.locator('section[aria-labelledby="contact-heading"]');
    if (await contactSection.count() > 0) {
      const contactIssues = await inspectContactForm(page, contactSection, deviceName, viewport);
      issues.push(...contactIssues);
    }

    // Inspect Footer section
    const footerSection = page.locator('footer[aria-label="Site footer"]');
    if (await footerSection.count() > 0) {
      const footerIssues = await inspectFooter(page, footerSection, deviceName, viewport);
      issues.push(...footerIssues);
    }

    // Check for floating/sticky elements
    const floatingElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const floating: Array<{tag: string, position: string, zIndex: string}> = [];
      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
          floating.push({
            tag: el.tagName,
            position: style.position,
            zIndex: style.zIndex
          });
        }
      });
      return floating;
    });

    if (floatingElements.length > 0) {
      console.log(`Found ${floatingElements.length} floating/sticky elements`);
      floatingElements.forEach(el => {
        console.log(`  - ${el.tag} (${el.position}, z-index: ${el.zIndex})`);
      });
    }

    await page.close();
  }

  await browser.close();

  // Save report
  await fs.mkdir(join(process.cwd(), "artifacts", "mobile-qa"), { recursive: true });
  await fs.writeFile(outputFile, JSON.stringify(issues, null, 2));

  console.log(`\n\n=== INSPECTION COMPLETE ===`);
  console.log(`Found ${issues.length} issues`);
  console.log(`Report saved to: ${outputFile}`);

  // Print summary by priority
  const p0 = issues.filter(i => i.priority === "P0");
  const p1 = issues.filter(i => i.priority === "P1");
  const p2 = issues.filter(i => i.priority === "P2");
  
  console.log(`\nPriority breakdown:`);
  console.log(`  P0 (Critical): ${p0.length}`);
  console.log(`  P1 (High): ${p1.length}`);
  console.log(`  P2 (Medium): ${p2.length}`);

  return issues;
}

async function inspectHero(page: any, section: any, deviceName: string, viewport: {width: number, height: number}): Promise<Issue[]> {
  const issues: Issue[] = [];
  console.log(`\nInspecting Hero section...`);

  // Check CTA button tap targets
  const ctaButtons = section.locator('a.btn-primary, a[href^="mailto:"], a[href^="tel:"]');
  const buttonCount = await ctaButtons.count();
  
  for (let i = 0; i < buttonCount; i++) {
    const button = ctaButtons.nth(i);
    const box = await button.boundingBox();
    if (box) {
      const minSize = 44; // iOS/Android minimum tap target
      const minDimension = Math.min(box.width, box.height);
      
      if (minDimension < minSize) {
        issues.push({
          priority: "P0",
          section: "Hero",
          symptom: `CTA button tap target too small: ${Math.round(box.width)}x${Math.round(box.height)}px (minimum: ${minSize}x${minSize}px)`,
          viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
          reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll position: top, locate CTA buttons`,
          suspectedCause: `Button size (${Math.round(box.width)}x${Math.round(box.height)}) below ${minSize}px minimum`,
          candidateFix: "Increase padding or min-height/min-width to ensure 44x44px minimum tap target",
          fileReference: "src/components/landing/Hero.tsx",
          lineReference: "94-128",
          measurements: { width: box.width, height: box.height, minDimension }
        });
        console.log(`❌ P0: CTA button tap target too small: ${Math.round(box.width)}x${Math.round(box.height)}px`);
      } else {
        console.log(`✓ CTA button ${i+1}: ${Math.round(box.width)}x${Math.round(box.height)}px`);
      }
    }
  }

  // Check text wrapping in headline
  const headline = section.locator('h1');
  if (await headline.count() > 0) {
    const headlineBox = await headline.boundingBox();
    const headlineText = await headline.textContent();
    if (headlineBox && headlineText) {
      // Check if text is clipped or awkwardly wrapped
      const textMetrics = await page.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          wordBreak: style.wordBreak,
          overflowWrap: style.overflowWrap
        };
      }, await headline.elementHandle());
      
      // Check for very long words that might cause issues
      const longWords = headlineText.split(/\s+/).filter(word => word.length > 15);
      if (longWords.length > 0 && textMetrics.wordBreak === 'normal' && textMetrics.overflowWrap === 'normal') {
        issues.push({
          priority: "P1",
          section: "Hero",
          symptom: `Headline contains long words (${longWords.join(', ')}) that may cause awkward wrapping`,
          viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
          reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll position: top`,
          suspectedCause: "Long words without word-break or overflow-wrap handling",
          candidateFix: "Add word-break: break-word or overflow-wrap: break-word to headline styles",
          fileReference: "src/components/landing/Hero.tsx",
          lineReference: "82-88"
        });
        console.log(`⚠️ P1: Long words in headline may cause wrapping issues`);
      }
    }
  }

  return issues;
}

async function inspectServices(page: any, section: any, deviceName: string, viewport: {width: number, height: number}): Promise<Issue[]> {
  const issues: Issue[] = [];
  console.log(`\nInspecting Services section...`);

  // Check service list items for text wrapping/truncation
  const serviceItems = section.locator('li');
  const itemCount = await serviceItems.count();
  
  for (let i = 0; i < itemCount; i++) {
    const item = serviceItems.nth(i);
    const text = await item.textContent();
    const box = await item.boundingBox();
    
    if (box && text) {
      // Check if text is clipped
      const isClipped = await page.evaluate((el) => {
        return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      }, await item.elementHandle());

      if (isClipped) {
        issues.push({
          priority: "P1",
          section: "Services",
          symptom: `Service item "${text.substring(0, 50)}..." text is clipped or truncated`,
          viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
          reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll to Services section`,
          suspectedCause: "Text overflow without proper word-break or container width constraints",
          candidateFix: "Ensure break-words class is applied and container has proper max-width constraints",
          fileReference: "src/components/landing/Services.tsx",
          lineReference: "310-324"
        });
        console.log(`⚠️ P1: Service item text clipped: "${text.substring(0, 40)}..."`);
      }

      // Check for very long service titles
      const longTitles = text.split('\n').filter(line => line.trim().length > 50);
      if (longTitles.length > 0) {
        const textMetrics = await page.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            fontSize: style.fontSize,
            wordBreak: style.wordBreak,
            overflowWrap: style.overflowWrap,
            whiteSpace: style.whiteSpace
          };
        }, await item.locator('span').elementHandle());

        if (textMetrics.wordBreak === 'normal' && textMetrics.overflowWrap === 'normal') {
          issues.push({
            priority: "P2",
            section: "Services",
            symptom: `Service title "${text.substring(0, 60)}..." is very long (${text.trim().length} chars) and may wrap awkwardly`,
            viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
            reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll to Services section, item ${i+1}`,
            suspectedCause: "Long service titles without proper word-break handling",
            candidateFix: "Verify break-words class is working correctly, consider reducing font size on mobile",
            fileReference: "src/components/landing/Services.tsx",
            lineReference: "321"
          });
        }
      }
    }
  }

  // Check container padding/spacing (use first container)
  const container = section.locator('.container-custom').first();
  if (await container.count() > 0) {
    const containerBox = await container.boundingBox();
    const padding = await page.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        paddingLeft: parseInt(style.paddingLeft),
        paddingRight: parseInt(style.paddingRight)
      };
    }, await container.elementHandle());

    if (containerBox && (padding.paddingLeft < 16 || padding.paddingRight < 16)) {
      issues.push({
        priority: "P2",
        section: "Services",
        symptom: `Container horizontal padding may be too tight: ${padding.paddingLeft}px left, ${padding.paddingRight}px right`,
        viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
        reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll to Services section`,
        suspectedCause: "Container padding below recommended 16px minimum on mobile",
        candidateFix: "Ensure container-custom has at least px-4 (16px) on mobile",
        fileReference: "src/styles/global.css",
        lineReference: "208-210"
      });
    }
  }

  console.log(`✓ Inspected ${itemCount} service items`);

  return issues;
}

async function inspectContactForm(page: any, section: any, deviceName: string, viewport: {width: number, height: number}): Promise<Issue[]> {
  const issues: Issue[] = [];
  console.log(`\nInspecting Contact Form section...`);

  // Check form input tap targets
  const inputs = section.locator('input, textarea, select, button');
  const inputCount = await inputs.count();
  
  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    const box = await input.boundingBox();
    const tagName = await input.evaluate(el => el.tagName.toLowerCase());
    
    if (box) {
      const minSize = 44;
      const minDimension = Math.min(box.width, box.height);
      
      if (minDimension < minSize) {
        issues.push({
          priority: "P0",
          section: "Contact Form",
          symptom: `${tagName} tap target too small: ${Math.round(box.width)}x${Math.round(box.height)}px (minimum: ${minSize}x${minSize}px)`,
          viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
          reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll to Contact Form section`,
          suspectedCause: `Form ${tagName} size (${Math.round(box.width)}x${Math.round(box.height)}) below ${minSize}px minimum`,
          candidateFix: "Increase padding (py-3 minimum) or min-height to ensure 44px minimum tap target",
          fileReference: "src/components/landing/ContactForm.tsx",
          lineReference: "178-379",
          measurements: { width: box.width, height: box.height, minDimension, tagName }
        });
        console.log(`❌ P0: ${tagName} tap target too small: ${Math.round(box.width)}x${Math.round(box.height)}px`);
      }
    }
  }

  // Check form grid layout on mobile
  const grid = section.locator('.grid');
  if (await grid.count() > 0) {
    const gridClasses = await grid.getAttribute('class');
    if (gridClasses && gridClasses.includes('sm:grid-cols-2')) {
      // Check if grid collapses properly on mobile
      const gridBox = await grid.boundingBox();
      if (gridBox) {
        console.log(`✓ Form grid layout checked`);
      }
    }
  }

  // Check submit button
  const submitButton = section.locator('button[type="submit"]');
  if (await submitButton.count() > 0) {
    const buttonBox = await submitButton.boundingBox();
    if (buttonBox) {
      const minSize = 44;
      const minDimension = Math.min(buttonBox.width, buttonBox.height);
      if (minDimension < minSize) {
        issues.push({
          priority: "P0",
          section: "Contact Form",
          symptom: `Submit button tap target too small: ${Math.round(buttonBox.width)}x${Math.round(buttonBox.height)}px`,
          viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
          reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll to Contact Form section`,
          suspectedCause: "Submit button padding insufficient for 44px minimum",
          candidateFix: "Ensure submit button has py-3 or min-height: 44px",
          fileReference: "src/components/landing/ContactForm.tsx",
          lineReference: "371-378"
        });
      } else {
        console.log(`✓ Submit button: ${Math.round(buttonBox.width)}x${Math.round(buttonBox.height)}px`);
      }
    }
  }

  return issues;
}

async function inspectFooter(page: any, section: any, deviceName: string, viewport: {width: number, height: number}): Promise<Issue[]> {
  const issues: Issue[] = [];
  console.log(`\nInspecting Footer section...`);

  // Check footer CTA buttons
  const ctaButtons = section.locator('a[href^="mailto:"], a[href^="tel:"], a[href="#contact"]');
  const buttonCount = await ctaButtons.count();
  
  for (let i = 0; i < buttonCount; i++) {
    const button = ctaButtons.nth(i);
    const box = await button.boundingBox();
    
    if (box) {
      const minSize = 44;
      const minDimension = Math.min(box.width, box.height);
      
      if (minDimension < minSize) {
        issues.push({
          priority: "P0",
          section: "Footer",
          symptom: `Footer CTA button tap target too small: ${Math.round(box.width)}x${Math.round(box.height)}px`,
          viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
          reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll to bottom`,
          suspectedCause: "Footer button padding insufficient for 44px minimum",
          candidateFix: "Ensure footer buttons have py-2.5 or min-height: 44px",
          fileReference: "src/components/landing/Footer.tsx",
          lineReference: "84-106"
        });
        console.log(`❌ P0: Footer CTA button ${i+1} tap target too small`);
      } else {
        console.log(`✓ Footer CTA button ${i+1}: ${Math.round(box.width)}x${Math.round(box.height)}px`);
      }
    }
  }

  // Check footer grid layout
  const grid = section.locator('.grid');
  if (await grid.count() > 0) {
    const gridBox = await grid.boundingBox();
    if (gridBox) {
      // Check if columns stack properly on mobile
      const columnCount = await page.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.gridTemplateColumns.split(' ').length;
      }, await grid.elementHandle());
      
      if (columnCount > 1 && viewport.width < 640) {
        issues.push({
          priority: "P1",
          section: "Footer",
          symptom: `Footer grid shows ${columnCount} columns on mobile (${viewport.width}px), may be cramped`,
          viewport: `${deviceName} (${viewport.width}x${viewport.height})`,
          reproSteps: `Viewport: ${viewport.width}x${viewport.height}, scroll to bottom`,
          suspectedCause: "Grid columns not collapsing to single column on small screens",
          candidateFix: "Ensure grid uses grid-cols-1 on mobile, sm:grid-cols-2 for larger screens",
          fileReference: "src/components/landing/Footer.tsx",
          lineReference: "11"
        });
      }
    }
  }

  return issues;
}

// Run inspection
inspectMobileLayout().catch((error) => {
  console.error("Error during inspection:", error);
  process.exit(1);
});

