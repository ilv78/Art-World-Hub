import { slugify } from "./artwork-slug";

// Curator galleries are what the public "/exhibitions" pages actually render
// (see specs/features/exhibitions/SPEC.md) — the slug mirrors makeArtworkSlug().
export function makeCuratorGallerySlug(name: string, id: string): string {
  const base = slugify(name) || "exhibition";
  const suffix = id.replace(/-/g, "").slice(0, 8);
  return `${base}-${suffix}`;
}
