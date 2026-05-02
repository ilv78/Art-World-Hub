import fs from "fs";
import path from "path";
import {
  ARTWORK_VARIANTS,
  generateArtworkVariants,
  variantPath,
} from "../server/lib/artwork-image";

const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const VARIANT_PATTERN = /-\d+\.(webp|jpg)$/i;

function isBaseUpload(filename: string): boolean {
  if (VARIANT_PATTERN.test(filename)) return false;
  const ext = path.extname(filename).toLowerCase();
  return ALLOWED_EXTS.has(ext);
}

function expectedVariantPaths(destDir: string, uuid: string): string[] {
  return ARTWORK_VARIANTS.map((spec) => variantPath(destDir, uuid, spec.width, spec.format));
}

async function backfill(uploadsDir: string): Promise<void> {
  const absDir = path.resolve(uploadsDir);
  if (!fs.existsSync(absDir)) {
    console.error(`[backfill] directory does not exist: ${absDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(absDir);
  const baseFiles = entries.filter(isBaseUpload);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`[backfill] scanning ${absDir}: ${baseFiles.length} base uploads found`);

  for (const filename of baseFiles) {
    const sourcePath = path.join(absDir, filename);
    const uuid = path.basename(filename, path.extname(filename));

    const expected = expectedVariantPaths(absDir, uuid);
    const missing = expected.filter((p) => !fs.existsSync(p));

    if (missing.length === 0) {
      skipped++;
      continue;
    }

    try {
      const result = await generateArtworkVariants(sourcePath, uuid, absDir);
      console.log(
        `[backfill] ${filename}: generated ${result.generated}, failed ${result.failed}`,
      );
      if (result.failed > 0) errors++;
      processed++;
    } catch (err) {
      console.error(`[backfill] ${filename} failed: ${err instanceof Error ? err.message : String(err)}`);
      errors++;
    }
  }

  console.log(`[backfill] done: processed=${processed}, skipped=${skipped}, errors=${errors}`);
  if (errors > 0) process.exit(1);
}

const target = process.argv[2] ?? path.join(process.cwd(), "uploads", "artworks");
backfill(target).catch((err) => {
  console.error("[backfill] fatal error:", err);
  process.exit(1);
});
