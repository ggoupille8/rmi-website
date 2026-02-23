import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { spawn } from 'child_process';

const prefix = process.argv[2] || 'before';
const outDir = `docs/screenshots/${prefix}`;
mkdirSync(outDir, { recursive: true });

// Start dev server
const server = spawn('npx', ['astro', 'dev', '--port', '4322'], {
  stdio: 'pipe',
  shell: true,
  cwd: process.cwd(),
});

// Wait for server to be ready
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Server start timeout')), 30000);
  server.stdout.on('data', (data) => {
    if (data.toString().includes('4322')) {
      clearTimeout(timeout);
      setTimeout(resolve, 2000); // Extra wait for hydration readiness
    }
  });
  server.stderr.on('data', (data) => {
    const str = data.toString();
    if (str.includes('4322')) {
      clearTimeout(timeout);
      setTimeout(resolve, 2000);
    }
  });
});

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();

try {
  await page.goto('http://localhost:4322/', { waitUntil: 'networkidle', timeout: 15000 });

  // Full page
  await page.screenshot({ path: `${outDir}/mobile-fullpage.png`, fullPage: true });

  // Hero (top of page)
  await page.screenshot({ path: `${outDir}/mobile-hero.png` });

  // Services
  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/mobile-services.png` });

  // About
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/mobile-about.png` });

  // Contact
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/mobile-contact.png` });

  // Footer
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/mobile-footer.png` });

  console.log(`Screenshots saved to ${outDir}/`);
} finally {
  await browser.close();
  server.kill();
}
process.exit(0);
