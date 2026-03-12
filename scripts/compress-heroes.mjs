/**
 * Re-compress hero images to close PageSpeed gap.
 *
 * Key issues:
 * - hero-6 is portrait (960x1280) — crop to landscape for all breakpoints
 * - hero-4 is portrait (960x1280 at 960w) — crop to landscape
 * - hero-6-960w.webp is 295 KB (4x larger than any other 960w) — biggest win
 * - All hero images sit behind dark gradient overlays, so subtle blur is invisible
 *
 * Strategy: gentle blur (sigma 0.5-0.8) + lower quality + landscape crop for
 * portrait images. Re-encodes from existing WebP files (no originals available).
 *
 * Usage: node scripts/compress-heroes.mjs
 */
import sharp from 'sharp';
import { readdir, stat, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const HERO_DIR = 'public/images/hero';

// Per-file compression config: { quality, blur, crop?: [w, h] }
// Portrait images (hero-4, hero-6) get cropped to landscape.
// Files not listed are skipped (already well-optimized).
const CONFIG = {
  // hero-1: landscape, already lean (add 960w to shave a few KB for total target)
  'hero-1-960w.webp':   { quality: 60, blur: 0.3 },          // 36→~34 KB (target <40)
  'hero-1.webp':        { quality: 60, blur: 0.5 },          // 137→~96 KB (target <100)

  // hero-2: landscape
  'hero-2-480w.webp':   { quality: 55, blur: 0.5 },          // 27→~20 KB (target <20)
  'hero-2-960w.webp':   { quality: 52, blur: 0.5 },          // 73→~54 KB (target <55)
  'hero-2-1280w.webp':  { quality: 55, blur: 0.5 },          // 113→~? KB
  'hero-2.webp':        { quality: 50, blur: 0.8 },          // 189→~? KB (target <120)

  // hero-3: landscape
  'hero-3-480w.webp':   { quality: 55, blur: 0.5 },          // 19→~15 KB (target <15)
  'hero-3-960w.webp':   { quality: 52, blur: 0.5 },          // 50→~37 KB (target <40)
  'hero-3-1280w.webp':  { quality: 55, blur: 0.5 },          // 79→~? KB
  'hero-3.webp':        { quality: 55, blur: 0.5 },          // 107→~77 KB (target <80)

  // hero-4: PORTRAIT — crop to landscape
  'hero-4-480w.webp':   { quality: 60, blur: 0.5, crop: [480, 320] },   // 28→~? KB (target <20)
  'hero-4-960w.webp':   { quality: 60, blur: 0.5, crop: [960, 640] },   // 92→~46 KB (target <60)
  'hero-4-1280w.webp':  { quality: 60, blur: 0.5, crop: [1280, 853] },  // 130→~? KB
  'hero-4.webp':        { quality: 55, blur: 0.5, crop: [1536, 1024] }, // 173→~76 KB (target <120)

  // hero-5: landscape, but large
  'hero-5-480w.webp':   { quality: 55, blur: 0.5 },          // 23→~18 KB (target <18)
  'hero-5-960w.webp':   { quality: 52, blur: 0.5 },          // 77→~54 KB (target <55)
  'hero-5-1280w.webp':  { quality: 55, blur: 0.5 },          // 140→~? KB
  'hero-5.webp':        { quality: 55, blur: 0.8 },          // 295→~114 KB (target <150)

  // hero-6: PORTRAIT — crop to landscape (source is only 960px wide)
  'hero-6-480w.webp':   { quality: 55, blur: 0.8, crop: [480, 320] },   // 49→~19 KB (target <25)
  'hero-6-960w.webp':   { quality: 60, blur: 0.8, crop: [960, 640] },   // 295→~72 KB (target <90)
  'hero-6-1280w.webp':  { quality: 60, blur: 0.8, crop: [960, 640] },   // 269→~71 KB (same source)
  'hero-6.webp':        { quality: 60, blur: 0.8, crop: [960, 640] },   // 269→~71 KB (target <160)
};

async function main() {
  const files = (await readdir(HERO_DIR)).filter(f => f.endsWith('.webp')).sort();

  console.log('=== Hero Image Re-Compression ===\n');

  const beforeSizes = {};
  for (const f of files) {
    const s = await stat(join(HERO_DIR, f));
    beforeSizes[f] = s.size;
  }

  console.log('Processing...\n');

  let totalBefore = 0;
  let totalAfter = 0;

  for (const f of files) {
    const filePath = join(HERO_DIR, f);
    const originalSize = beforeSizes[f];
    totalBefore += originalSize;

    const config = CONFIG[f];
    if (!config) {
      console.log(`  SKIP  ${f.padEnd(22)} ${Math.round(originalSize / 1024)} KB (already optimized)`);
      totalAfter += originalSize;
      continue;
    }

    const inputBuffer = await readFile(filePath);
    let pipeline = sharp(inputBuffer);

    // Crop portrait images to landscape
    if (config.crop) {
      pipeline = pipeline.resize(config.crop[0], config.crop[1], {
        fit: 'cover',
        position: 'centre',
      });
    }

    // Apply subtle blur to smooth lossy-to-lossy re-encoding artifacts
    if (config.blur > 0) {
      pipeline = pipeline.blur(config.blur);
    }

    const outputBuffer = await pipeline
      .webp({ quality: config.quality, effort: 6 })
      .toBuffer();

    if (outputBuffer.length < originalSize) {
      await writeFile(filePath, outputBuffer);
      const savings = originalSize - outputBuffer.length;
      const pct = Math.round((savings / originalSize) * 100);
      console.log(`  DONE  ${f.padEnd(22)} ${Math.round(originalSize / 1024)} KB → ${Math.round(outputBuffer.length / 1024)} KB  (-${Math.round(savings / 1024)} KB, -${pct}%)`);
      totalAfter += outputBuffer.length;
    } else {
      console.log(`  KEEP  ${f.padEnd(22)} ${Math.round(originalSize / 1024)} KB (re-encode would be larger)`);
      totalAfter += originalSize;
    }
  }

  console.log('\n=== Overall Summary ===');
  console.log(`  Total before: ${Math.round(totalBefore / 1024)} KB`);
  console.log(`  Total after:  ${Math.round(totalAfter / 1024)} KB`);
  console.log(`  Saved:        ${Math.round((totalBefore - totalAfter) / 1024)} KB (${Math.round((1 - totalAfter / totalBefore) * 100)}%)`);

  // 960w breakpoint report (LCP-critical)
  console.log('\n=== 960w Breakpoint (LCP) ===');
  let total960Before = 0;
  let total960After = 0;
  for (const f of files) {
    if (f.includes('-960w')) {
      const afterSize = (await stat(join(HERO_DIR, f))).size;
      total960Before += beforeSizes[f];
      total960After += afterSize;
      console.log(`  ${f.padEnd(22)} ${Math.round(beforeSizes[f] / 1024)} KB → ${Math.round(afterSize / 1024)} KB`);
    }
  }
  console.log(`  Total 960w:  ${Math.round(total960Before / 1024)} KB → ${Math.round(total960After / 1024)} KB`);

  // Verification checks
  console.log('\n=== Verification ===');
  const checks = [
    ['hero-6-960w.webp', 90],
    ['hero-6.webp', 160],
    ['hero-6-480w.webp', 30],
    ['hero-5-960w.webp', 55],
    ['hero-2-960w.webp', 55],
  ];
  let allPass = true;
  for (const [file, targetKB] of checks) {
    const size = (await stat(join(HERO_DIR, file))).size;
    const sizeKB = Math.round(size / 1024);
    const pass = sizeKB < targetKB;
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${file.padEnd(22)} ${sizeKB} KB (target < ${targetKB} KB)`);
    if (!pass) allPass = false;
  }
  console.log(`  Total 960w < 300 KB: ${total960After < 300 * 1024 ? 'PASS' : 'FAIL'} (${Math.round(total960After / 1024)} KB)`);
  if (total960After >= 300 * 1024) allPass = false;

  if (!allPass) {
    console.log('\n  WARNING: Some targets not met. Review settings.');
  } else {
    console.log('\n  All targets met!');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
