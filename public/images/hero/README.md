# Hero Images

This folder contains hero section images for the landing page.

## Image Specifications

### Recommended Image Count

- **Minimum:** 1 image (required)
- **Maximum:** 3 images (optional - though only the first image is displayed)
- **Desktop:** Shows one large image (first image from array)
- **Mobile:** Shows one image (first image from array)

### Image Requirements

#### File Format

- **Format:** JPG or WebP (WebP preferred for better compression)
- **Quality:** High quality (80-90% for JPG, 85-95% for WebP)

#### Dimensions

- **Aspect Ratio:** 1:1 (square) recommended for best results
- **Minimum Size:** 1200x1200px
- **Optimal Size:** 1600x1600px or larger
- **Max File Size:** 500KB per image (optimize for web)

#### Content Guidelines

- Showcase mechanical insulation work, piping, ductwork, tanks, or equipment
- Professional, high-quality photography
- Good lighting and clear focus
- Avoid text overlays or watermarks
- Ensure images represent your services accurately

## Placeholder Filenames

Use these filenames when adding your images:

1. **hero-1.jpg** (or hero-1.webp) - Primary hero image (required)
2. **hero-2.jpg** (or hero-2.webp) - Secondary image (optional)
3. **hero-3.jpg** (or hero-3.webp) - Tertiary image (optional)

## Usage

The Hero component automatically uses images from this folder. Update the `images` prop in `src/pages/index.astro`:

### Single Image (Default)

```tsx
<Hero
  images={["/images/hero/hero-1.jpg"]}
  // ... other props
/>
```

### Multiple Images (Optional)

Note: Only the first image in the array will be displayed. Additional images can be provided for future use or easy switching.

```tsx
<Hero
  images={[
    "/images/hero/hero-1.jpg",
    "/images/hero/hero-2.jpg", // Optional - not displayed
    "/images/hero/hero-3.jpg", // Optional - not displayed
  ]}
  // ... other props
/>
```

## Image Optimization Tips

1. **Use WebP format** when possible for better compression
2. **Compress images** using tools like:
   - Squoosh (https://squoosh.app/)
   - ImageOptim
   - TinyPNG
3. **Test on different devices** to ensure images load quickly
4. **Consider using srcset** for responsive images (can be added later if needed)

## Current Status

Placeholder images are expected at:

- `/images/hero/hero-1.jpg` (required)
- `/images/hero/hero-2.jpg` (optional)
- `/images/hero/hero-3.jpg` (optional)

Replace these placeholder filenames with your actual hero images.
