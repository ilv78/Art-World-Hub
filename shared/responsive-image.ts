// Responsive image rendering helper. Used by both server (preload tag in
// meta.ts) and client (<ResponsiveImage> component) so preload and
// <picture> select from the same variant URL set.
//
// Originally artwork-only (#564, #567); generalized in #573 to also cover
// blog covers. Future image types (avatars, etc.) can be added by listing
// their /uploads/<subdir>/ prefix below.

export const RESPONSIVE_IMAGE_PREFIXES = [
  "/uploads/artworks/",
  "/uploads/blog-covers/",
] as const;

export const WEBP_WIDTHS = [480, 960, 1440, 2400] as const;
export const JPEG_WIDTHS = [960, 2400] as const;

// Sizes presets — what fraction of the viewport the image actually occupies
// at each breakpoint. Picked to match the rendered layout of each call site.
export const ARTWORK_SIZES = {
  hero: "100vw",
  card: "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw",
  detail: "(max-width: 1024px) 100vw, 80vw",
  thumbnail: "120px",
} as const;

export const BLOG_SIZES = {
  hero: "100vw",                                                          // /blog/<slug> detail hero
  listFeatured: "(max-width: 768px) 100vw, 60vw",                         // first post on /blog
  listCard: "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",  // grid cards (blog list, home, artist profile)
} as const;

export interface ResponsivePictureSources {
  webpSrcSet: string;
  jpegSrcSet: string;
  fallbackSrc: string;
}

// Backwards-compat alias — pre-#573 code referenced this name.
export type ArtworkPictureSources = ResponsivePictureSources;

function parseImageUrl(imageUrl: string): { prefix: string; uuid: string; ext: string } | null {
  const prefix = RESPONSIVE_IMAGE_PREFIXES.find((p) => imageUrl.startsWith(p));
  if (!prefix) return null;
  const filename = imageUrl.slice(prefix.length);
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const uuid = filename.slice(0, dotIdx);
  const ext = filename.slice(dotIdx + 1).toLowerCase();
  if (uuid.includes("-") && /-\d+$/.test(uuid)) return null; // already a variant
  return { prefix, uuid, ext };
}

export function getResponsivePictureSources(imageUrl: string): ResponsivePictureSources | null {
  const parsed = parseImageUrl(imageUrl);
  if (!parsed) return null;
  const { prefix, uuid } = parsed;
  return {
    webpSrcSet: WEBP_WIDTHS.map((w) => `${prefix}${uuid}-${w}.webp ${w}w`).join(", "),
    jpegSrcSet: JPEG_WIDTHS.map((w) => `${prefix}${uuid}-${w}.jpg ${w}w`).join(", "),
    fallbackSrc: `${prefix}${uuid}-960.jpg`,
  };
}

// Backwards-compat alias — pre-#573 code referenced this name.
export const getArtworkPictureSources = getResponsivePictureSources;

export function getArtworkTextureUrl(imageUrl: string, targetWidth: 960 | 1440 = 1440): string {
  const parsed = parseImageUrl(imageUrl);
  if (!parsed) return imageUrl;
  return `${parsed.prefix}${parsed.uuid}-${targetWidth}.webp`;
}
