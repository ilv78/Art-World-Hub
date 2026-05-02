import { describe, it, expect } from "vitest";
import {
  getResponsivePictureSources,
  getArtworkTextureUrl,
  RESPONSIVE_IMAGE_PREFIXES,
  BLOG_SIZES,
  ARTWORK_SIZES,
} from "../../shared/responsive-image";

describe("RESPONSIVE_IMAGE_PREFIXES", () => {
  it("includes both artworks and blog-covers (#573)", () => {
    expect(RESPONSIVE_IMAGE_PREFIXES).toContain("/uploads/artworks/");
    expect(RESPONSIVE_IMAGE_PREFIXES).toContain("/uploads/blog-covers/");
  });
});

describe("getResponsivePictureSources", () => {
  it("derives variant URLs for /uploads/artworks/", () => {
    const sources = getResponsivePictureSources("/uploads/artworks/abc-uuid.jpg");
    expect(sources).not.toBeNull();
    expect(sources!.webpSrcSet).toContain("/uploads/artworks/abc-uuid-480.webp 480w");
    expect(sources!.webpSrcSet).toContain("/uploads/artworks/abc-uuid-2400.webp 2400w");
    expect(sources!.jpegSrcSet).toContain("/uploads/artworks/abc-uuid-960.jpg 960w");
    expect(sources!.fallbackSrc).toBe("/uploads/artworks/abc-uuid-960.jpg");
  });

  it("derives variant URLs for /uploads/blog-covers/ (#573)", () => {
    const sources = getResponsivePictureSources("/uploads/blog-covers/post-uuid.jpg");
    expect(sources).not.toBeNull();
    expect(sources!.webpSrcSet).toContain("/uploads/blog-covers/post-uuid-480.webp 480w");
    expect(sources!.webpSrcSet).toContain("/uploads/blog-covers/post-uuid-1440.webp 1440w");
    expect(sources!.webpSrcSet).toContain("/uploads/blog-covers/post-uuid-2400.webp 2400w");
    expect(sources!.jpegSrcSet).toContain("/uploads/blog-covers/post-uuid-960.jpg 960w");
    expect(sources!.fallbackSrc).toBe("/uploads/blog-covers/post-uuid-960.jpg");
  });

  it("returns null for external URLs (e.g. Google Photos imports)", () => {
    expect(getResponsivePictureSources("https://lh3.googleusercontent.com/pw/abc")).toBeNull();
  });

  it("returns null for /uploads/avatars/ (not currently in the responsive set)", () => {
    expect(getResponsivePictureSources("/uploads/avatars/avatar.png")).toBeNull();
  });

  it("returns null when given an already-derived variant URL (no double-derivation)", () => {
    expect(getResponsivePictureSources("/uploads/artworks/abc-1440.webp")).toBeNull();
    expect(getResponsivePictureSources("/uploads/blog-covers/post-960.jpg")).toBeNull();
  });

  it("handles different file extensions on the original (jpg, jpeg, png, gif, webp)", () => {
    expect(getResponsivePictureSources("/uploads/artworks/abc.png")).not.toBeNull();
    expect(getResponsivePictureSources("/uploads/blog-covers/post.gif")).not.toBeNull();
    expect(getResponsivePictureSources("/uploads/blog-covers/post.webp")).not.toBeNull();
    expect(getResponsivePictureSources("/uploads/artworks/abc.jpeg")).not.toBeNull();
  });
});

describe("getArtworkTextureUrl (3D gallery, single fixed-width URL)", () => {
  it("returns the variant URL at the requested width", () => {
    expect(getArtworkTextureUrl("/uploads/artworks/abc.jpg", 1440)).toBe(
      "/uploads/artworks/abc-1440.webp",
    );
  });

  it("works for blog covers too (#573)", () => {
    expect(getArtworkTextureUrl("/uploads/blog-covers/post.jpg", 960)).toBe(
      "/uploads/blog-covers/post-960.webp",
    );
  });

  it("returns the original URL unchanged for external/unrecognized URLs", () => {
    expect(getArtworkTextureUrl("https://lh3.googleusercontent.com/pw/abc")).toBe(
      "https://lh3.googleusercontent.com/pw/abc",
    );
  });
});

describe("size presets", () => {
  it("ARTWORK_SIZES exposes hero / card / detail / thumbnail", () => {
    expect(ARTWORK_SIZES.hero).toBe("100vw");
    expect(ARTWORK_SIZES.card).toBeDefined();
    expect(ARTWORK_SIZES.detail).toBeDefined();
    expect(ARTWORK_SIZES.thumbnail).toBeDefined();
  });

  it("BLOG_SIZES exposes hero / listFeatured / listCard (#573)", () => {
    expect(BLOG_SIZES.hero).toBe("100vw");
    expect(BLOG_SIZES.listFeatured).toBeDefined();
    expect(BLOG_SIZES.listCard).toBeDefined();
  });
});
