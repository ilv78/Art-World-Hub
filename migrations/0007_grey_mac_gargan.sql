ALTER TABLE "artworks" ADD COLUMN "is_published" boolean DEFAULT false;
--> statement-breakpoint
-- Backfill existing artworks as published so they stay visible post-deploy (#513).
UPDATE "artworks" SET "is_published" = true WHERE "is_published" = false;