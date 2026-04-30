-- Add artist slug for public /artists/:slug URLs (#537).
-- Three-step: add nullable, backfill, then enforce NOT NULL + unique.
-- Mirrors migrations/0008_superb_silver_centurion.sql for artworks.

ALTER TABLE "artists" ADD COLUMN "slug" text;--> statement-breakpoint

-- Backfill: slugify(name) + '-' + first 8 hex chars of UUID.
-- Mirrors makeArtistSlug() in shared/artist-slug.ts.
UPDATE "artists"
SET "slug" = concat(
  COALESCE(
    NULLIF(
      substr(
        trim(both '-' from regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')),
        1, 60
      ),
      ''
    ),
    'artist'
  ),
  '-',
  substr(replace("id"::text, '-', ''), 1, 8)
)
WHERE "slug" IS NULL;--> statement-breakpoint

ALTER TABLE "artists" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "artists" ADD CONSTRAINT "artists_slug_unique" UNIQUE("slug");
