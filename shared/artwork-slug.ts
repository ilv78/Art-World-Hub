export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function makeArtworkSlug(title: string, id: string): string {
  const base = slugify(title) || "artwork";
  const suffix = id.replace(/-/g, "").slice(0, 8);
  return `${base}-${suffix}`;
}
