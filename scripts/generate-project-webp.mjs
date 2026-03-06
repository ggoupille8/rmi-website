import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public/images/projects');

const images = [
  'henry-ford-hospital',
  'michigan-central-station',
  'ford-hub-dearborn',
];

for (const name of images) {
  const input = path.join(publicDir, `${name}.jpg`);
  const output = path.join(publicDir, `${name}-960w.webp`);
  await sharp(input)
    .resize({ width: 960, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  console.log(`Done: ${name}-960w.webp`);
}
