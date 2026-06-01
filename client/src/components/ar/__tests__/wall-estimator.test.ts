import { describe, it, expect } from "vitest";
import {
  estimateWallWidthCm,
  REFERENCE_WIDTHS_CM,
  MIN_WALL_CM,
  MAX_WALL_CM,
  type Detection,
} from "../wall-estimator";

function det(cls: string, score: number, bboxWidth: number): Detection {
  return { class: cls, score, bbox: [0, 0, bboxWidth, bboxWidth] };
}

describe("estimateWallWidthCm", () => {
  it("returns null when no usable detections", () => {
    expect(estimateWallWidthCm([], 1000)).toBeNull();
    // unknown class is ignored
    expect(estimateWallWidthCm([det("banana", 0.9, 100)], 1000)).toBeNull();
  });

  it("returns null when photo width is non-positive", () => {
    expect(estimateWallWidthCm([det("couch", 0.9, 200)], 0)).toBeNull();
  });

  it("ignores detections below the score threshold", () => {
    expect(estimateWallWidthCm([det("couch", 0.2, 200)], 1000)).toBeNull();
  });

  it("ignores zero-width bounding boxes", () => {
    expect(estimateWallWidthCm([det("couch", 0.9, 0)], 1000)).toBeNull();
  });

  it("computes wall width from a single reference via the ratio", () => {
    // couch ~200cm wide fills half of a 1000px-wide photo → wall ≈ 400cm.
    const r = estimateWallWidthCm([det("couch", 0.95, 500)], 1000);
    expect(r).not.toBeNull();
    expect(r!.wallWidthCm).toBe(400);
    expect(r!.reference).toBe("couch");
    expect(r!.confidence).toBeGreaterThan(0);
  });

  it("clamps implausible estimates into the slider range", () => {
    // A couch occupying only 5px of a 1000px photo implies a 40m wall → clamp.
    const tiny = estimateWallWidthCm([det("couch", 0.95, 5)], 1000);
    expect(tiny!.wallWidthCm).toBe(MAX_WALL_CM);
    // A couch wider than the whole photo implies a sub-1m wall → clamp.
    const huge = estimateWallWidthCm([det("couch", 0.95, 4000)], 1000);
    expect(huge!.wallWidthCm).toBe(MIN_WALL_CM);
  });

  it("uses a weighted median so one outlier can't dominate", () => {
    // Two couches agree on ~400cm; one mis-sized chair disagrees wildly.
    const r = estimateWallWidthCm(
      [det("couch", 0.95, 500), det("couch", 0.9, 500), det("chair", 0.9, 5)],
      1000,
    );
    expect(r!.wallWidthCm).toBe(400);
  });

  it("labels the estimate with the highest-weighted class", () => {
    const r = estimateWallWidthCm(
      [det("potted plant", 0.9, 100), det("couch", 0.9, 500)],
      1000,
    );
    expect(r!.reference).toBe("couch");
  });

  it("keeps every reference width positive and weighted in (0,1]", () => {
    for (const { widthCm, weight } of Object.values(REFERENCE_WIDTHS_CM)) {
      expect(widthCm).toBeGreaterThan(0);
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(1);
    }
  });
});
