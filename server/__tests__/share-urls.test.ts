import { describe, expect, it } from "vitest";
import { buildShareUrl, buildNativeShareData, withUtm } from "@shared/share-urls";
import type { ShareTarget } from "@shared/share-urls";

const target: ShareTarget = {
  url: "https://vernis9.art/artworks/some-piece",
  title: "Some Piece by Alex",
  description: "An evocative oil painting.",
  imageUrl: "https://vernis9.art/uploads/artworks/abc.jpg",
  itemType: "artwork",
};

describe("withUtm", () => {
  it("adds utm params to a bare URL", () => {
    const out = withUtm("https://example.com/foo", "facebook", "artwork");
    expect(out).toBe(
      "https://example.com/foo?utm_source=facebook&utm_medium=share&utm_campaign=artwork",
    );
  });

  it("preserves existing non-utm query params", () => {
    const out = withUtm("https://example.com/foo?ref=abc", "x", "blog");
    expect(out).toContain("ref=abc");
    expect(out).toContain("utm_source=x");
    expect(out).toContain("utm_medium=share");
    expect(out).toContain("utm_campaign=blog");
  });

  it("replaces incoming utm params instead of duplicating them", () => {
    const out = withUtm(
      "https://example.com/foo?utm_source=facebook&utm_medium=share&utm_campaign=blog&ref=xx",
      "linkedin",
      "artist",
    );
    // Should appear exactly once each
    expect(out.match(/utm_source=/g)).toHaveLength(1);
    expect(out.match(/utm_medium=/g)).toHaveLength(1);
    expect(out.match(/utm_campaign=/g)).toHaveLength(1);
    expect(out).toContain("utm_source=linkedin");
    expect(out).toContain("utm_campaign=artist");
    expect(out).toContain("ref=xx");
  });

  it("preserves the hash fragment", () => {
    const out = withUtm("https://example.com/foo#section", "x", "blog");
    expect(out.endsWith("#section")).toBe(true);
    expect(out).toContain("utm_source=x");
  });
});

describe("buildShareUrl", () => {
  it("builds Facebook sharer URL with the tagged URL", () => {
    const out = buildShareUrl("facebook", target);
    expect(out.startsWith("https://www.facebook.com/sharer/sharer.php?u=")).toBe(true);
    const decoded = decodeURIComponent(out.split("u=")[1]);
    expect(decoded).toContain("utm_source=facebook");
    expect(decoded).toContain("utm_campaign=artwork");
  });

  it("builds LinkedIn share URL", () => {
    const out = buildShareUrl("linkedin", target);
    expect(out.startsWith("https://www.linkedin.com/sharing/share-offsite/?url=")).toBe(true);
    const decoded = decodeURIComponent(out.split("url=")[1]);
    expect(decoded).toContain("utm_source=linkedin");
  });

  it("builds Pinterest URL with media + description", () => {
    const out = buildShareUrl("pinterest", target);
    expect(out).toContain("pinterest.com/pin/create/button/");
    expect(out).toContain(`media=${encodeURIComponent(target.imageUrl!)}`);
    expect(out).toContain(`description=${encodeURIComponent(target.description!)}`);
    // utm_source is inside the encoded `url=` param
    const urlParam = decodeURIComponent(out.match(/[?&]url=([^&]+)/)![1]);
    expect(urlParam).toContain("utm_source=pinterest");
  });

  it("Pinterest falls back to title when description is missing", () => {
    const out = buildShareUrl("pinterest", { ...target, description: undefined });
    expect(out).toContain(`description=${encodeURIComponent(target.title)}`);
  });

  it("builds X/Twitter intent with text + tagged URL", () => {
    const out = buildShareUrl("x", target);
    expect(out.startsWith("https://twitter.com/intent/tweet?url=")).toBe(true);
    expect(out).toContain(`text=${encodeURIComponent(target.title)}`);
    const urlParam = decodeURIComponent(out.split("url=")[1].split("&")[0]);
    expect(urlParam).toContain("utm_source=x");
  });

  it("builds Bluesky compose with title + tagged URL combined", () => {
    const out = buildShareUrl("bluesky", target);
    expect(out.startsWith("https://bsky.app/intent/compose?text=")).toBe(true);
    const decoded = decodeURIComponent(out.split("text=")[1]);
    expect(decoded.startsWith(target.title)).toBe(true);
    expect(decoded).toContain("utm_source=bluesky");
  });
});

describe("buildNativeShareData", () => {
  it("returns title/text/url payload", () => {
    const out = buildNativeShareData(target);
    expect(out.title).toBe(target.title);
    expect(out.text).toBe(target.description);
    expect(out.url).toContain("utm_source=native");
    expect(out.url).toContain("utm_campaign=artwork");
  });

  it("falls back to title for text when description is missing", () => {
    const out = buildNativeShareData({ ...target, description: undefined });
    expect(out.text).toBe(target.title);
  });
});
