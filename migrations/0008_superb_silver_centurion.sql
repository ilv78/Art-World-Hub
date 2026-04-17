-- Add artwork slug for public /artworks/:slug URLs (#503).
-- Three-step: add nullable, backfill, then enforce NOT NULL + unique.

ALTER TABLE "artworks" ADD COLUMN "slug" text;--> statement-breakpoint

-- Backfill: slugify(title) + '-' + first 8 hex chars of UUID.
-- Mirrors makeArtworkSlug() in shared/artwork-slug.ts.
UPDATE "artworks"
SET "slug" = concat(
  COALESCE(
    NULLIF(
      substr(
        trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g')),
        1, 60
      ),
      ''
    ),
    'artwork'
  ),
  '-',
  substr(replace("id"::text, '-', ''), 1, 8)
)
WHERE "slug" IS NULL;--> statement-breakpoint

ALTER TABLE "artworks" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_slug_unique" UNIQUE("slug");
