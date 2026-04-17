import type { InsertArtwork, Artwork } from "@shared/schema";

// When an artwork is a draft, isForSale/isInGallery/isReadyForExhibition are clamped to false —
// those flags only take effect on published artworks (#513). exhibitionOrder is preserved so
// re-publishing restores the gallery slot.

export function normalizeArtworkForCreate(input: InsertArtwork): InsertArtwork {
  if (input.isPublished) return input;
  return {
    ...input,
    isForSale: false,
    isInGallery: false,
    isReadyForExhibition: false,
  };
}

export function normalizeArtworkForUpdate(
  existing: Pick<Artwork, "isPublished">,
  update: Partial<InsertArtwork>,
): Partial<InsertArtwork> {
  const nextIsPublished = update.isPublished ?? existing.isPublished ?? false;
  if (nextIsPublished) return update;
  return {
    ...update,
    isForSale: false,
    isInGallery: false,
    isReadyForExhibition: false,
  };
}
