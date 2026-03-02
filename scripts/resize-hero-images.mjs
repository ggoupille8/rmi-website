import sharp from "sharp";
import fs from "fs";
import path from "path";

const HERO_DIR = "public/images/hero";
const WIDTHS = [960, 480];

// Only process base hero images (hero-N.webp and hero-N.jpg)
const basePattern = /^hero-\d+\.(webp|jpg)$/;

const files = fs.readdirSync(HERO_DIR).filter((f) => basePattern.test(f));

for (const file of files) {
  const ext = path.extname(file);
  const base = path.basename(file, ext);
  const srcPath = path.join(HERO_DIR, file);

  for (const w of WIDTHS) {
    const outName = `${base}-${w}w${ext}`;
    const outPath = path.join(HERO_DIR, outName);

    if (fs.existsSync(outPath)) {
      console.log(`  skip ${outName} (exists)`);
      continue;
    }

    const img = sharp(srcPath).resize({ width: w, withoutEnlargement: true });

    if (ext === ".webp") {
      await img.webp({ quality: 80 }).toFile(outPath);
    } else {
      await img.jpeg({ quality: 85 }).toFile(outPath);
    }

    const stat = fs.statSync(outPath);
    console.log(`  ${outName} — ${(stat.size / 1024).toFixed(0)}KB`);
  }
}

console.log("Done.");
