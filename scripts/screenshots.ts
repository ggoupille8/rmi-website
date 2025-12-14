import { chromium } from "playwright";
import { promises as fs } from "fs";
import { join } from "path";

const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

const colorSchemes = ["light", "dark"] as const;

const baseURL = "http://localhost:4321";
const outputDir = join(process.cwd(), "artifacts", "screenshots");

async function generateScreenshots() {
  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });

  // Generate timestamp for filenames
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();

  console.log(`Generating screenshots...`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Base URL: ${baseURL}\n`);

  const screenshots: string[] = [];

  // Generate screenshots for each viewport and color scheme
  for (const [deviceName, viewport] of Object.entries(viewports)) {
    for (const colorScheme of colorSchemes) {
      const page = await context.newPage();

      // Set viewport
      await page.setViewportSize(viewport);

      // Set color scheme
      await page.emulateMedia({ colorScheme });

      // Navigate to homepage
      await page.goto(baseURL);

      // Wait for page to be fully loaded
      await page.waitForLoadState("networkidle");

      // Generate filename with timestamp
      const filename = `${deviceName}-${colorScheme}-${timestamp}.png`;
      const filepath = join(outputDir, filename);

      // Take full page screenshot
      await page.screenshot({
        path: filepath,
        fullPage: true,
        animations: "disabled",
      });

      screenshots.push(filename);
      console.log(`✓ ${filename}`);

      await page.close();
    }
  }

  await browser.close();

  console.log(`\n✅ Generated ${screenshots.length} screenshots:`);
  screenshots.forEach((filename) => {
    console.log(`   - ${filename}`);
  });
  console.log(`\nScreenshots saved to: ${outputDir}`);
}

// Run the script
generateScreenshots().catch((error) => {
  console.error("Error generating screenshots:", error);
  process.exit(1);
});
