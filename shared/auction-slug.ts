import { slugify } from "./artwork-slug";

// Auctions have no title of their own — they wrap an artwork — so the slug is
// derived from the artwork's title, mirroring makeArtworkSlug().
export function makeAuctionSlug(artworkTitle: string, id: string): string {
  const base = slugify(artworkTitle) || "auction";
  const suffix = id.replace(/-/g, "").slice(0, 8);
  return `${base}-${suffix}`;
}
