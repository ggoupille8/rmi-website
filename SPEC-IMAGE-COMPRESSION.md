# SPEC: Image Re-Compression

## CONTEXT
PageSpeed flags "Improve image delivery" as a red-triangle insight on both mobile (357 KiB savings) and desktop (643 KiB savings). The WebP files were converted at too-high a quality setting. The biggest offenders:

- `hero-6-960w.webp` — 297 KiB, 155 KiB saveable
- `michigan-central-station-960w.webp` — 119 KiB, 65 KiB saveable
- `hero-5-960w.webp` — 84 KiB, 39 KiB saveable
- `hero-2-960w.webp` — 80 KiB, 35 KiB saveable
- `hero-3-960w.webp` — 54 KiB, 31 KiB saveable
- `cta-project-1920w.webp` — ~335 KiB decoded

These are industrial job-site photos — they tolerate aggressive compression without visible quality loss.

## FILES
- `public/images/hero/*.webp` (all 480w, 960w, and full-size variants)
- `public/images/projects/*.webp` (all project images)
- `public/images/cta/*.webp` (CTA image)

## DO NOT TOUCH
- Any source code file (`.tsx`, `.astro`, `.ts`)
- JPG fallback files (keep originals as-is)
- Logo images (`public/images/logo/`)
- Image filenames — keep ALL filenames identical
- `public/images/hero/*.jpg` — leave these untouched

## TASK 1: Install cwebp if Not Available

### Approach
1. Check if `cwebp` is available: `which cwebp`
2. If not, install: `sudo apt-get update && sudo apt-get install -y webp` (or use `npm install -g cwebp-bin`)
3. Verify: `cwebp -version`

### Error Recovery
- If `apt-get` fails, try: `npm install -g sharp-cli` and use sharp instead
- If neither works, use Node.js with the `sharp` package: `npm install sharp` in the project root, then write a script

## TASK 2: Re-Compress All Hero WebP Images

### Approach
1. Back up originals: `mkdir -p /tmp/webp-backup && cp public/images/hero/*.webp /tmp/webp-backup/`
2. For each WebP file in `public/images/hero/`, re-encode from the corresponding JPG source at quality 75:

```bash
for jpg in public/images/hero/*.jpg; do
  base=$(basename "$jpg" .jpg)
  cwebp -q 75 "$jpg" -o "public/images/hero/${base}.webp"
done
```

If `cwebp` can't read the JPG for any reason, use the sharp approach:

```javascript
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const heroDir = 'public/images/hero';
const files = fs.readdirSync(heroDir).filter(f => f.endsWith('.jpg'));

for (const file of files) {
  const base = file.replace('.jpg', '');
  const webpPath = path.join(heroDir, `${base}.webp`);
  if (fs.existsSync(webpPath)) {
    await sharp(path.join(heroDir, file))
      .webp({ quality: 75 })
      .toFile(webpPath + '.tmp');
    fs.renameSync(webpPath + '.tmp', webpPath);
    console.log(`Compressed: ${base}.webp`);
  }
}
```

3. Quality 75 is the target. This is well-tested for photographic content and is Google's recommendation for WebP.

### Verification
- Compare file sizes before/after:
  - `hero-6-960w.webp` should drop from ~297 KiB to ~140-160 KiB
  - `hero-5-960w.webp` should drop from ~84 KiB to ~45-55 KiB
- Open each image and visually verify no obvious artifacts at full size
- `ls -la public/images/hero/*.webp` — all files should be smaller

## TASK 3: Re-Compress All Project WebP Images

### Approach
Same process for `public/images/projects/`:

```bash
for jpg in public/images/projects/*.jpg; do
  base=$(basename "$jpg" .jpg)
  webp="public/images/projects/${base}.webp"
  if [ -f "$webp" ]; then
    cwebp -q 75 "$jpg" -o "$webp"
  fi
done
```

### Verification
- `michigan-central-station-960w.webp` should drop from ~119 KiB to ~55-70 KiB
- All 3 project WebP files should be smaller

## TASK 4: Re-Compress CTA WebP Image

### Approach
```bash
cwebp -q 75 public/images/cta/cta-project.jpeg -o public/images/cta/cta-project-1920w.webp
```

### Verification
- `cta-project-1920w.webp` should drop significantly from its current size

## TASK 5: Verify Build Still Works

### Approach
```bash
npm run build
```

### Verification
- Build passes with zero errors
- No broken image references (images are static files, filenames unchanged, so this should be fine)

## GIT WORKFLOW
```
git checkout -b feat/image-compression
git add -A
git commit -m "perf: re-compress WebP images at q75 for 350+ KiB savings"
# Do NOT merge to main — Graham will merge
```

## DEFINITION OF DONE
- [ ] All hero WebP files re-compressed at quality 75
- [ ] All project WebP files re-compressed at quality 75
- [ ] CTA WebP file re-compressed at quality 75
- [ ] Total size reduction of at least 300 KiB across all WebP files
- [ ] No filename changes
- [ ] No source code changes
- [ ] `npm run build` passes
- [ ] Backups exist in /tmp/webp-backup/
