export const ARTWORKS_PREFIX = "/uploads/artworks/";

export const WEBP_WIDTHS = [480, 960, 1440, 2400] as const;
export const JPEG_WIDTHS = [960, 2400] as const;

export const ARTWORK_SIZES = {
  hero: "100vw",
  card: "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw",
  detail: "(max-width: 1024px) 100vw, 80vw",
  thumbnail: "120px",
} as const;

export interface ArtworkPictureSources {
  webpSrcSet: string;
  jpegSrcSet: string;
  fallbackSrc: string;
}

function parseArtworkUrl(imageUrl: string): { uuid: string; ext: string } | null {
  if (!imageUrl.startsWith(ARTWORKS_PREFIX)) return null;
  const filename = imageUrl.slice(ARTWORKS_PREFIX.length);
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx <= 0) return null;
  const uuid = filename.slice(0, dotIdx);
  const ext = filename.slice(dotIdx + 1).toLowerCase();
  if (uuid.includes("-") && /-\d+$/.test(uuid)) return null; // already a variant
  return { uuid, ext };
}

export function getArtworkPictureSources(imageUrl: string): ArtworkPictureSources | null {
  const parsed = parseArtworkUrl(imageUrl);
  if (!parsed) return null;
  const { uuid } = parsed;
  return {
    webpSrcSet: WEBP_WIDTHS.map((w) => `${ARTWORKS_PREFIX}${uuid}-${w}.webp ${w}w`).join(", "),
    jpegSrcSet: JPEG_WIDTHS.map((w) => `${ARTWORKS_PREFIX}${uuid}-${w}.jpg ${w}w`).join(", "),
    fallbackSrc: `${ARTWORKS_PREFIX}${uuid}-960.jpg`,
  };
}

export function getArtworkTextureUrl(imageUrl: string, targetWidth: 960 | 1440 = 1440): string {
  const parsed = parseArtworkUrl(imageUrl);
  if (!parsed) return imageUrl;
  return `${ARTWORKS_PREFIX}${parsed.uuid}-${targetWidth}.webp`;
}
