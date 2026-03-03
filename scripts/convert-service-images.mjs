import sharp from "sharp";
import { readdir, stat, unlink, rename as fsRename } from "fs/promises";
import { join, extname, basename } from "path";

const SERVICES_DIR = "public/images/services";
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 80;
const JPG_QUALITY = 85;

async function processFolder(folderPath) {
  const files = await readdir(folderPath);
  // Only process original images (not already-converted .webp or our .tmp files)
  const imageFiles = files.filter(
    (f) => /\.(jpe?g|png)$/i.test(f) && !f.endsWith(".webp")
  );
  let totalBefore = 0;
  let totalAfter = 0;
  const toDelete = [];

  for (const file of imageFiles) {
    const inputPath = join(folderPath, file);
    const ext = extname(file);
    const base = basename(file, ext);
    const webpPath = join(folderPath, `${base}.webp`);
    const jpgPath = join(folderPath, `${base}.jpg`);

    const beforeStat = await stat(inputPath);
    totalBefore += beforeStat.size;

    // Create WebP
    await sharp(inputPath)
      .rotate()
      .resize(MAX_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpPath);

    // Create optimized JPG — write to temp first to avoid overwriting source
    const tmpJpg = join(folderPath, `${base}.tmp.jpg`);
    await sharp(inputPath)
      .rotate()
      .resize(MAX_WIDTH, null, { withoutEnlargement: true })
      .jpeg({ quality: JPG_QUALITY })
      .toFile(tmpJpg);

    // Schedule original for deletion if it's not the same as our target .jpg
    const isAlreadyJpg = ext.toLowerCase() === ".jpg";
    if (!isAlreadyJpg) {
      toDelete.push(inputPath);
    }
    // We'll rename tmp to final after deleting originals
    toDelete.push({ tmpJpg, jpgPath, deleteOriginal: isAlreadyJpg ? inputPath : null });

    const webpStat = await stat(webpPath);
    const tmpStat = await stat(tmpJpg);
    totalAfter += webpStat.size + tmpStat.size;

    console.log(
      `  ${file} (${(beforeStat.size / 1024).toFixed(0)}KB) → ${base}.webp (${(webpStat.size / 1024).toFixed(0)}KB) + ${base}.jpg (${(tmpStat.size / 1024).toFixed(0)}KB)`
    );
  }

  // Now do file cleanup: delete originals, rename temps
  for (const item of toDelete) {
    if (typeof item === "string") {
      // Delete original non-.jpg file
      try {
        await unlink(item);
      } catch (e) {
        console.log(`  ⚠ Could not delete ${item}: ${e.message}`);
      }
    } else {
      // Rename tmp.jpg → .jpg (delete original .jpg first if needed)
      if (item.deleteOriginal) {
        try {
          await unlink(item.deleteOriginal);
        } catch (e) {
          console.log(`  ⚠ Could not delete ${item.deleteOriginal}: ${e.message}`);
        }
      }
      try {
        await fsRename(item.tmpJpg, item.jpgPath);
      } catch (e) {
        console.log(`  ⚠ Could not rename ${item.tmpJpg}: ${e.message}`);
      }
    }
  }

  return { before: totalBefore, after: totalAfter, count: imageFiles.length };
}

async function main() {
  const folders = await readdir(SERVICES_DIR);
  let grandBefore = 0;
  let grandAfter = 0;
  let grandCount = 0;

  for (const folder of folders.sort()) {
    const folderPath = join(SERVICES_DIR, folder);
    const folderStat = await stat(folderPath);
    if (!folderStat.isDirectory()) continue;

    console.log(`\n📁 ${folder}/`);
    const result = await processFolder(folderPath);
    grandBefore += result.before;
    grandAfter += result.after;
    grandCount += result.count;
    console.log(
      `  Subtotal: ${result.count} images, ${(result.before / 1024 / 1024).toFixed(1)}MB → ${(result.after / 1024 / 1024).toFixed(1)}MB`
    );
  }

  console.log(`\n========================================`);
  console.log(`Total: ${grandCount} images processed`);
  console.log(`Before: ${(grandBefore / 1024 / 1024).toFixed(1)}MB`);
  console.log(`After:  ${(grandAfter / 1024 / 1024).toFixed(1)}MB (WebP + JPG combined)`);
  console.log(
    `Savings: ${(((grandBefore - grandAfter) / grandBefore) * 100).toFixed(0)}%`
  );
}

main().catch(console.error);
