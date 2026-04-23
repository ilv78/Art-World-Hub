import { slugify } from "./artwork-slug";

export function makeArtistSlug(name: string, id: string): string {
  const base = slugify(name) || "artist";
  const suffix = id.replace(/-/g, "").slice(0, 8);
  return `${base}-${suffix}`;
}
