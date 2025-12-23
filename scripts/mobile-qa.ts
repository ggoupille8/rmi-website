import { chromium } from "playwright";
import { promises as fs } from "fs";
import { join } from "path";

const viewports = {
  "iphone-se": { width: 375, height: 667 }, // iPhone SE/8/11
  "android-small": { width: 360, height: 640 }, // Small Android
};

const baseURL = "http://localhost:4321";
const outputDir = join(process.cwd(), "artifacts", "mobile-qa");

async function captureMobileScreenshots() {
  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });

  // Generate timestamp for filenames
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();

  console.log(`Capturing mobile QA screenshots...`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Base URL: ${baseURL}\n`);

  const screenshots: string[] = [];

  // Generate screenshots for each viewport
  for (const [deviceName, viewport] of Object.entries(viewports)) {
    const page = await context.newPage();

    // Set viewport
    await page.setViewportSize(viewport);

    // Set dark mode (as per user requirement)
    await page.emulateMedia({ 
      colorScheme: "dark",
      reducedMotion: "reduce"
    });

    // Navigate to homepage
    await page.goto(baseURL);

    // Wait for network to be idle
    await page.waitForLoadState("networkidle");
    
    // Wait for fonts to be loaded
    await page.evaluate(() => document.fonts.ready);
    
    // Small delay to ensure all rendering is complete
    await page.waitForTimeout(500);

    // Capture full page screenshot
    const filename = `mobile-${deviceName}-dark-${timestamp}.png`;
    const filepath = join(outputDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: true,
      animations: "disabled",
    });

    screenshots.push(filename);
    console.log(`✓ ${filename}`);

    // Capture Hero section specifically
    const heroFilename = `mobile-${deviceName}-hero-${timestamp}.png`;
    const heroFilepath = join(outputDir, heroFilename);
    const heroSection = await page.locator('section[aria-labelledby="hero-heading"]');
    if (await heroSection.count() > 0) {
      await heroSection.screenshot({
        path: heroFilepath,
        animations: "disabled",
      });
      screenshots.push(heroFilename);
      console.log(`✓ ${heroFilename}`);
    }

    // Capture Services section
    const servicesFilename = `mobile-${deviceName}-services-${timestamp}.png`;
    const servicesFilepath = join(outputDir, servicesFilename);
    const servicesSection = await page.locator('section[aria-labelledby="services-heading"]');
    if (await servicesSection.count() > 0) {
      await servicesSection.screenshot({
        path: servicesFilepath,
        animations: "disabled",
      });
      screenshots.push(servicesFilename);
      console.log(`✓ ${servicesFilename}`);
    }

    // Capture Contact Form section
    const contactFilename = `mobile-${deviceName}-contact-${timestamp}.png`;
    const contactFilepath = join(outputDir, contactFilename);
    const contactSection = await page.locator('section[aria-labelledby="contact-heading"]');
    if (await contactSection.count() > 0) {
      await contactSection.screenshot({
        path: contactFilepath,
        animations: "disabled",
      });
      screenshots.push(contactFilename);
      console.log(`✓ ${contactFilename}`);
    }

    // Capture Footer section
    const footerFilename = `mobile-${deviceName}-footer-${timestamp}.png`;
    const footerFilepath = join(outputDir, footerFilename);
    const footerSection = await page.locator('footer[aria-label="Site footer"]');
    if (await footerSection.count() > 0) {
      await footerSection.screenshot({
        path: footerFilepath,
        animations: "disabled",
      });
      screenshots.push(footerFilename);
      console.log(`✓ ${footerFilename}`);
    }

    // Scroll to bottom to check for any floating elements
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    
    const scrollFilename = `mobile-${deviceName}-scrolled-${timestamp}.png`;
    const scrollFilepath = join(outputDir, scrollFilename);
    await page.screenshot({
      path: scrollFilepath,
      fullPage: false, // Viewport only to check floating elements
      animations: "disabled",
    });
    screenshots.push(scrollFilename);
    console.log(`✓ ${scrollFilename}`);

    await page.close();
  }

  await browser.close();

  console.log(`\n✅ Generated ${screenshots.length} screenshots:`);
  screenshots.forEach((filename) => {
    console.log(`   - ${filename}`);
  });
  console.log(`\nScreenshots saved to: ${outputDir}`);
}

// Run the script
captureMobileScreenshots().catch((error) => {
  console.error("Error capturing mobile screenshots:", error);
  process.exit(1);
});


