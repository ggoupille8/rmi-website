import sharp from "sharp";

export interface ProcessedImage {
  variant: "480w" | "960w" | "1920w" | "original";
  buffer: Buffer;
  width: number;
  height: number;
  format: "webp";
  sizeBytes: number;
}

export interface ProcessingResult {
  variants: ProcessedImage[];
  originalWidth: number;
  originalHeight: number;
  originalFormat: string;
}

const VARIANT_WIDTHS = [480, 960, 1920] as const;

export async function processImage(
  inputBuffer: Buffer,
  options?: {
    quality?: number;
    maxWidth?: number;
    stripMetadata?: boolean;
  }
): Promise<ProcessingResult> {
  const quality = options?.quality ?? 82;
  const stripMetadata = options?.stripMetadata ?? true;

  const metadata = await sharp(inputBuffer).metadata();
  const originalWidth = metadata.width ?? 1920;
  const originalHeight = metadata.height ?? 1080;
  const originalFormat = metadata.format ?? "unknown";

  const variants: ProcessedImage[] = [];

  for (const targetWidth of VARIANT_WIDTHS) {
    // Don't upscale — skip variants wider than the original
    if (targetWidth > originalWidth) continue;

    let pipeline = sharp(inputBuffer);

    if (stripMetadata) {
      pipeline = pipeline.rotate(); // auto-rotate based on EXIF, then strip
    }

    pipeline = pipeline
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality });

    const buffer = await pipeline.toBuffer();
    const info = await sharp(buffer).metadata();

    variants.push({
      variant: `${targetWidth}w` as ProcessedImage["variant"],
      buffer,
      width: info.width ?? targetWidth,
      height: info.height ?? 0,
      format: "webp",
      sizeBytes: buffer.length,
    });
  }

  // If image is smaller than 480px — just convert to WebP at original size
  if (variants.length === 0) {
    const buffer = await sharp(inputBuffer).webp({ quality }).toBuffer();
    const info = await sharp(buffer).metadata();
    variants.push({
      variant: "original",
      buffer,
      width: info.width ?? originalWidth,
      height: info.height ?? originalHeight,
      format: "webp",
      sizeBytes: buffer.length,
    });
  }

  return {
    variants,
    originalWidth,
    originalHeight,
    originalFormat,
  };
}

export function validateImage(
  buffer: Buffer,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  if (buffer.length > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Image exceeds ${maxSizeMB}MB limit` };
  }

  // Check magic bytes for JPEG, PNG, WebP
  const hex = buffer.subarray(0, 4).toString("hex");
  const isJPEG = hex.startsWith("ffd8ff");
  const isPNG = hex === "89504e47";
  const isWebP =
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.length >= 12 &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  if (!isJPEG && !isPNG && !isWebP) {
    return {
      valid: false,
      error: "Unsupported format. Upload JPEG, PNG, or WebP.",
    };
  }

  return { valid: true };
}
