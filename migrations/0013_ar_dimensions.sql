ALTER TABLE "artworks" ADD COLUMN IF NOT EXISTS "width_cm" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN IF NOT EXISTS "height_cm" numeric(7, 2);--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN IF NOT EXISTS "dimension_unit" text DEFAULT 'cm';--> statement-breakpoint

-- Backfill structured size from the legacy free-text `dimensions` column (#634).
-- Matches "<w> [x|×|*] <h>" with optional spaces and an optional unit token,
-- mirroring shared/dimensions.ts. Only rows still NULL are touched, so this is
-- safe to re-run. Unit conversion: in -> *2.54, mm -> *0.1, default cm.
UPDATE "artworks" SET
  "width_cm" = ROUND(replace((regexp_match(btrim("dimensions"), '^([0-9]+(?:[.,][0-9]+)?)\s*(?:x|×|X|\*|by)\s*([0-9]+(?:[.,][0-9]+)?)\s*(cm|mm|in|inch|inches|"|”)?$', 'i'))[1], ',', '.')::numeric
                      * CASE lower(coalesce((regexp_match(btrim("dimensions"), '(cm|mm|in|inch|inches|"|”)$', 'i'))[1], 'cm'))
                          WHEN 'mm' THEN 0.1 WHEN 'in' THEN 2.54 WHEN 'inch' THEN 2.54 WHEN 'inches' THEN 2.54 WHEN '"' THEN 2.54 WHEN '”' THEN 2.54 ELSE 1 END, 2),
  "height_cm" = ROUND(replace((regexp_match(btrim("dimensions"), '^([0-9]+(?:[.,][0-9]+)?)\s*(?:x|×|X|\*|by)\s*([0-9]+(?:[.,][0-9]+)?)\s*(cm|mm|in|inch|inches|"|”)?$', 'i'))[2], ',', '.')::numeric
                      * CASE lower(coalesce((regexp_match(btrim("dimensions"), '(cm|mm|in|inch|inches|"|”)$', 'i'))[1], 'cm'))
                          WHEN 'mm' THEN 0.1 WHEN 'in' THEN 2.54 WHEN 'inch' THEN 2.54 WHEN 'inches' THEN 2.54 WHEN '"' THEN 2.54 WHEN '”' THEN 2.54 ELSE 1 END, 2)
WHERE "width_cm" IS NULL
  AND "dimensions" IS NOT NULL
  AND btrim("dimensions") ~* '^[0-9]+(?:[.,][0-9]+)?\s*(?:x|×|X|\*|by)\s*[0-9]+(?:[.,][0-9]+)?\s*(?:cm|mm|in|inch|inches|"|”)?$';
