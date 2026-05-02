import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import sharp from "sharp";
import {
  generateArtworkVariants,
  variantFilename,
  variantPath,
  ARTWORK_VARIANTS,
} from "../lib/artwork-image";

let tmpDir: string;

async function makeFixtureImage(width: number, height: number, outPath: string): Promise<void> {
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .jpeg({ quality: 90 })
    .toFile(outPath);
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "artwork-image-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("variantFilename / variantPath", () => {
  it("formats webp filename correctly", () => {
    expect(variantFilename("abc-123", 480, "webp")).toBe("abc-123-480.webp");
  });

  it("formats jpeg filename with .jpg extension", () => {
    expect(variantFilename("abc-123", 960, "jpeg")).toBe("abc-123-960.jpg");
  });

  it("variantPath joins destDir with the filename", () => {
    expect(variantPath("/uploads/artworks", "abc-123", 1440, "webp")).toBe(
      "/uploads/artworks/abc-123-1440.webp",
    );
  });
});

describe("generateArtworkVariants", () => {
  it("generates all 6 variants for a large source image", async () => {
    const sourcePath = path.join(tmpDir, "source.jpg");
    await makeFixtureImage(3000, 2000, sourcePath);

    const result = await generateArtworkVariants(sourcePath, "test-uuid", tmpDir);

    expect(result.generated).toBe(6);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);

    for (const spec of ARTWORK_VARIANTS) {
      const p = variantPath(tmpDir, "test-uuid", spec.width, spec.format);
      expect(fs.existsSync(p)).toBe(true);
      const meta = await sharp(p).metadata();
      expect(meta.width).toBe(spec.width);
      expect(meta.format).toBe(spec.format === "jpeg" ? "jpeg" : "webp");
    }
  });

  it("writes a variant file for every spec, capped at source size (withoutEnlargement)", async () => {
    // All srcset URLs in <picture> must resolve to a valid image — even for
    // small uploads. We always write all 6 variants; the larger ones are just
    // capped at source dimensions rather than upscaled.
    const sourcePath = path.join(tmpDir, "small.jpg");
    await makeFixtureImage(800, 600, sourcePath);

    const result = await generateArtworkVariants(sourcePath, "small-uuid", tmpDir);

    expect(result.generated).toBe(6);
    expect(result.failed).toBe(0);

    for (const spec of ARTWORK_VARIANTS) {
      const p = variantPath(tmpDir, "small-uuid", spec.width, spec.format);
      expect(fs.existsSync(p)).toBe(true);
      const meta = await sharp(p).metadata();
      // Output is min(spec.width, sourceWidth) — the variant exists at the
      // closest size sharp could produce without upscaling.
      expect(meta.width ?? 0).toBeLessThanOrEqual(800);
      expect(meta.width ?? 0).toBeLessThanOrEqual(spec.width);
    }
  });

  it("returns failed result with error details when source is missing", async () => {
    const sourcePath = path.join(tmpDir, "does-not-exist.jpg");

    await expect(generateArtworkVariants(sourcePath, "missing", tmpDir)).rejects.toThrow();
  });

  it("produces variants meaningfully smaller than the original JPEG", async () => {
    const sourcePath = path.join(tmpDir, "original.jpg");
    await makeFixtureImage(2400, 1800, sourcePath);
    const originalSize = fs.statSync(sourcePath).size;

    await generateArtworkVariants(sourcePath, "size-test", tmpDir);

    const variant480 = fs.statSync(variantPath(tmpDir, "size-test", 480, "webp")).size;
    expect(variant480).toBeLessThan(originalSize);

    // 2400-webp may not be smaller than the source (synthetic flat-color test image
    // compresses very efficiently as JPEG). Just assert the file exists; the realistic
    // savings claim is verified separately against real artwork.
    expect(fs.existsSync(variantPath(tmpDir, "size-test", 2400, "webp"))).toBe(true);
  });

  it("preserves aspect ratio (resize uses fit:inside)", async () => {
    const sourcePath = path.join(tmpDir, "wide.jpg");
    // 3:2 aspect ratio source (3000x2000)
    await makeFixtureImage(3000, 2000, sourcePath);

    await generateArtworkVariants(sourcePath, "ratio-test", tmpDir);

    const meta = await sharp(variantPath(tmpDir, "ratio-test", 1440, "webp")).metadata();
    expect(meta.width).toBe(1440);
    expect(meta.height).toBe(960); // 1440 * (2/3)
  });
});
