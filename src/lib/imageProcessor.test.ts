import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { processImage, validateImage } from "./imageProcessor";

// Create test images programmatically
async function createTestJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 64, b: 32 },
    },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function createTestPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 128, g: 64, b: 32, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe("validateImage", () => {
  it("accepts a valid JPEG", async () => {
    const jpeg = await createTestJpeg(100, 100);
    expect(validateImage(jpeg)).toEqual({ valid: true });
  });

  it("accepts a valid PNG", async () => {
    const png = await createTestPng(100, 100);
    expect(validateImage(png)).toEqual({ valid: true });
  });

  it("accepts a valid WebP", async () => {
    const webp = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .webp()
      .toBuffer();
    expect(validateImage(webp)).toEqual({ valid: true });
  });

  it("rejects non-image data", () => {
    const textBuffer = Buffer.from("This is not an image file");
    const result = validateImage(textBuffer);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported format");
  });

  it("rejects files over size limit", async () => {
    // Create a buffer slightly over 1MB and test with 1MB limit
    const buf = Buffer.alloc(1.5 * 1024 * 1024, 0xff);
    // Set JPEG magic bytes so format check passes
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    buf[3] = 0xe0;
    const result = validateImage(buf, 1);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceeds 1MB");
  });
});

describe("processImage", () => {
  it("generates 3 WebP variants for a large JPEG", async () => {
    const jpeg = await createTestJpeg(2000, 1500);
    const result = await processImage(jpeg);

    expect(result.originalWidth).toBe(2000);
    expect(result.originalHeight).toBe(1500);
    expect(result.originalFormat).toBe("jpeg");
    expect(result.variants).toHaveLength(3);

    const variantNames = result.variants.map((v) => v.variant);
    expect(variantNames).toContain("480w");
    expect(variantNames).toContain("960w");
    expect(variantNames).toContain("1920w");

    for (const variant of result.variants) {
      expect(variant.format).toBe("webp");
      expect(variant.sizeBytes).toBeGreaterThan(0);
      expect(variant.width).toBeGreaterThan(0);
      expect(variant.height).toBeGreaterThan(0);
    }
  });

  it("skips variants wider than original (no upscale)", async () => {
    const jpeg = await createTestJpeg(800, 600);
    const result = await processImage(jpeg);

    // 800px original: only 480w generated (skip 960w and 1920w)
    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].variant).toBe("480w");
    expect(result.variants[0].width).toBe(480);
  });

  it("produces 'original' variant for images smaller than 480px", async () => {
    const jpeg = await createTestJpeg(200, 150);
    const result = await processImage(jpeg);

    expect(result.variants).toHaveLength(1);
    expect(result.variants[0].variant).toBe("original");
    expect(result.variants[0].format).toBe("webp");
  });

  it("outputs WebP format for all variants", async () => {
    const png = await createTestPng(1000, 1000);
    const result = await processImage(png);

    for (const variant of result.variants) {
      expect(variant.format).toBe("webp");
      // Verify the buffer is actually WebP
      const meta = await sharp(variant.buffer).metadata();
      expect(meta.format).toBe("webp");
    }
  });

  it("accepts custom quality without error", async () => {
    const jpeg = await createTestJpeg(1000, 1000);

    const result95 = await processImage(jpeg, { quality: 95 });
    const result30 = await processImage(jpeg, { quality: 30 });

    // Both should produce valid WebP variants
    expect(result95.variants.length).toBeGreaterThan(0);
    expect(result30.variants.length).toBeGreaterThan(0);
    for (const v of result95.variants) {
      expect(v.format).toBe("webp");
    }
    for (const v of result30.variants) {
      expect(v.format).toBe("webp");
    }
  });

  it("produces smaller WebP than source PNG", async () => {
    const png = await createTestPng(960, 720);
    const result = await processImage(png);

    const webpSize = result.variants[0].sizeBytes;
    expect(webpSize).toBeLessThan(png.length);
  });
});
