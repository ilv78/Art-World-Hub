import { describe, it, expect } from "vitest";
import {
  clampZoom,
  baseArtworkSizePx,
  panBy,
  zoomBy,
  renderedRect,
  touchDistance,
  MIN_ZOOM,
  MAX_ZOOM,
  IDENTITY_TRANSFORM,
} from "../ar-scale";

describe("clampZoom", () => {
  it("clamps to bounds", () => {
    expect(clampZoom(0.001)).toBe(MIN_ZOOM);
    expect(clampZoom(100)).toBe(MAX_ZOOM);
    expect(clampZoom(2)).toBe(2);
  });
  it("falls back to 1 on non-finite", () => {
    expect(clampZoom(NaN)).toBe(1);
    expect(clampZoom(Infinity)).toBe(MAX_ZOOM);
  });
});

describe("baseArtworkSizePx", () => {
  it("derives pixel size from physical cm against wall width", () => {
    // 60cm wide artwork on a 300cm wall shown 900px wide => 3px/cm => 180px.
    const r = baseArtworkSizePx({ widthCm: 60, heightCm: 80, canvasWidthPx: 900, wallWidthCm: 300 });
    expect(r.width).toBeCloseTo(180);
    expect(r.height).toBeCloseTo(240);
  });
  it("preserves aspect ratio", () => {
    const r = baseArtworkSizePx({ widthCm: 100, heightCm: 50, canvasWidthPx: 1000, wallWidthCm: 250 });
    expect(r.width / r.height).toBeCloseTo(2);
  });
  it("falls back to 40% canvas when physical data missing", () => {
    expect(baseArtworkSizePx({ widthCm: null, heightCm: null, canvasWidthPx: 1000, wallWidthCm: 300 }).width).toBe(400);
    expect(baseArtworkSizePx({ widthCm: 0, heightCm: 80, canvasWidthPx: 1000, wallWidthCm: 300 }).width).toBe(400);
    expect(baseArtworkSizePx({ widthCm: 60, heightCm: 80, canvasWidthPx: 1000, wallWidthCm: 0 }).width).toBe(400);
  });
});

describe("panBy / zoomBy", () => {
  it("accumulates pan deltas", () => {
    const t = panBy(panBy(IDENTITY_TRANSFORM, { x: 10, y: 5 }), { x: -3, y: 2 });
    expect(t.offset).toEqual({ x: 7, y: 7 });
  });
  it("multiplies and clamps zoom", () => {
    expect(zoomBy(IDENTITY_TRANSFORM, 2).zoom).toBe(2);
    expect(zoomBy({ ...IDENTITY_TRANSFORM, zoom: 5 }, 4).zoom).toBe(MAX_ZOOM);
  });
});

describe("renderedRect", () => {
  it("centres the artwork at identity transform", () => {
    const rect = renderedRect({ width: 100, height: 100 }, IDENTITY_TRANSFORM, { width: 800, height: 600 });
    expect(rect.left).toBe(350);
    expect(rect.top).toBe(250);
    expect(rect.width).toBe(100);
  });
  it("applies zoom and offset", () => {
    const rect = renderedRect(
      { width: 100, height: 100 },
      { offset: { x: 20, y: -10 }, zoom: 2 },
      { width: 800, height: 600 },
    );
    expect(rect.width).toBe(200);
    expect(rect.left).toBe(800 / 2 - 100 + 20); // 320
    expect(rect.top).toBe(600 / 2 - 100 - 10); // 190
  });
});

describe("touchDistance", () => {
  it("computes euclidean distance", () => {
    expect(touchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
