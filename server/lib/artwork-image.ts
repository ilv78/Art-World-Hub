import path from "path";
import sharp from "sharp";

export type VariantFormat = "webp" | "jpeg";

export interface VariantSpec {
  width: number;
  format: VariantFormat;
}

export const ARTWORK_VARIANTS: VariantSpec[] = [
  { width: 480, format: "webp" },
  { width: 960, format: "webp" },
  { width: 1440, format: "webp" },
  { width: 2400, format: "webp" },
  { width: 960, format: "jpeg" },
  { width: 2400, format: "jpeg" },
];

export function variantFilename(uuid: string, width: number, format: VariantFormat): string {
  const ext = format === "jpeg" ? "jpg" : "webp";
  return `${uuid}-${width}.${ext}`;
}

export function variantPath(destDir: string, uuid: string, width: number, format: VariantFormat): string {
  return path.join(destDir, variantFilename(uuid, width, format));
}

export interface VariantResult {
  generated: number;
  skipped: number;
  failed: number;
  errors: Array<{ width: number; format: VariantFormat; message: string }>;
}

export async function generateArtworkVariants(
  sourcePath: string,
  uuid: string,
  destDir: string,
): Promise<VariantResult> {
  const result: VariantResult = { generated: 0, skipped: 0, failed: 0, errors: [] };

  // Read metadata up-front so the call fails fast if the source is unreadable.
  await sharp(sourcePath).metadata();

  for (const spec of ARTWORK_VARIANTS) {
    const outPath = variantPath(destDir, uuid, spec.width, spec.format);
    try {
      // withoutEnlargement keeps the original size when the source is smaller
      // than the target width. The file is still written, so every URL in the
      // <picture> srcset resolves to a valid image — even for small uploads.
      const pipeline = sharp(sourcePath).resize(spec.width, null, {
        fit: "inside",
        withoutEnlargement: true,
      });
      if (spec.format === "webp") {
        await pipeline.webp({ quality: 80 }).toFile(outPath);
      } else {
        await pipeline.jpeg({ quality: 80, progressive: true, mozjpeg: true }).toFile(outPath);
      }
      result.generated++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        width: spec.width,
        format: spec.format,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
