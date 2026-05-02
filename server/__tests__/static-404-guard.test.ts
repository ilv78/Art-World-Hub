import { describe, it, expect } from "vitest";
import { __testing } from "../static";

const { shouldReturn404ForStaticMiss, STATIC_404_PREFIXES } = __testing;

describe("static-404 guard (#567)", () => {
  it("matches all expected static-asset prefixes", () => {
    expect(STATIC_404_PREFIXES).toContain("/uploads/");
    expect(STATIC_404_PREFIXES).toContain("/api/");
    expect(STATIC_404_PREFIXES).toContain("/assets/");
  });

  it("returns true for /uploads/* misses (the bogus-cache trap from #566)", () => {
    expect(shouldReturn404ForStaticMiss("/uploads/artworks/abc-1440.webp")).toBe(true);
    expect(shouldReturn404ForStaticMiss("/uploads/avatars/missing.png")).toBe(true);
    expect(shouldReturn404ForStaticMiss("/uploads/blog-covers/x.jpg")).toBe(true);
  });

  it("returns true for unmatched /api/* and /assets/*", () => {
    expect(shouldReturn404ForStaticMiss("/api/this-endpoint-does-not-exist")).toBe(true);
    expect(shouldReturn404ForStaticMiss("/assets/missing-bundle.js")).toBe(true);
  });

  it("returns false for SPA routes that should serve index.html", () => {
    expect(shouldReturn404ForStaticMiss("/")).toBe(false);
    expect(shouldReturn404ForStaticMiss("/gallery")).toBe(false);
    expect(shouldReturn404ForStaticMiss("/artworks/some-slug-abc")).toBe(false);
    expect(shouldReturn404ForStaticMiss("/artists/some-artist-xyz")).toBe(false);
    expect(shouldReturn404ForStaticMiss("/exhibitions")).toBe(false);
    expect(shouldReturn404ForStaticMiss("/auth")).toBe(false);
  });

  it("does not match prefix-collision routes (e.g. /uploadsless)", () => {
    expect(shouldReturn404ForStaticMiss("/uploadsless")).toBe(false);
    expect(shouldReturn404ForStaticMiss("/apinotreal")).toBe(false);
    expect(shouldReturn404ForStaticMiss("/assetsxxx")).toBe(false);
  });

  it("matches /api root (just /api/) but not bare /api with no trailing slash", () => {
    expect(shouldReturn404ForStaticMiss("/api/")).toBe(true);
    // Bare /api without trailing slash is unlikely but we don't need to 404 it
    expect(shouldReturn404ForStaticMiss("/api")).toBe(false);
  });
});
