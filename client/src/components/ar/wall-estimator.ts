// Pure wall-scale estimation for the AR "View in my room" composite (#634,
// Phase 1b). Given objects detected in the room photo (coco-ssd output) plus a
// table of their typical real-world widths, work out how wide the photographed
// wall is in centimetres — replacing the manual wall-width slider with an
// automatic guess. Kept browser-free so it can be unit-tested in isolation; the
// actual TensorFlow.js detection lives in ./detect-objects.ts.

/** A single object detection in coco-ssd's shape. bbox = [x, y, width, height] in px. */
export interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export interface WallEstimate {
  /** Estimated real width of the wall shown in the photo, in centimetres. */
  wallWidthCm: number;
  /** Human-readable label of what drove the estimate (e.g. "couch"). */
  reference: string;
  /** 0..1 rough confidence, for deciding whether to trust/show the estimate. */
  confidence: number;
}

/**
 * Typical real-world WIDTH (cm) of common coco-ssd classes, paired with a
 * reliability weight (0..1) reflecting how consistent that width is across the
 * real world. A couch is almost always ~2m wide (high weight); a TV or potted
 * plant varies wildly (low weight). Only classes plausibly seen in a room/wall
 * photo are listed — detections of anything else are ignored.
 */
export const REFERENCE_WIDTHS_CM: Record<string, { widthCm: number; weight: number }> = {
  couch: { widthCm: 200, weight: 0.9 },
  bed: { widthCm: 160, weight: 0.75 },
  "dining table": { widthCm: 150, weight: 0.7 },
  chair: { widthCm: 50, weight: 0.6 },
  refrigerator: { widthCm: 70, weight: 0.6 },
  person: { widthCm: 45, weight: 0.45 },
  "potted plant": { widthCm: 35, weight: 0.4 },
  tv: { widthCm: 110, weight: 0.4 },
};

/** Plausible wall widths — clamps wild estimates to the same range as the manual slider. */
export const MIN_WALL_CM = 100;
export const MAX_WALL_CM = 600;

/** Minimum detection score we trust as a scale reference. */
export const MIN_REFERENCE_SCORE = 0.4;

/** Weighted median: robust against a single mis-sized outlier detection. */
function weightedMedian(samples: { value: number; weight: number }[]): number {
  const sorted = [...samples].sort((a, b) => a.value - b.value);
  const total = sorted.reduce((s, x) => s + x.weight, 0);
  let acc = 0;
  for (const s of sorted) {
    acc += s.weight;
    if (acc >= total / 2) return s.value;
  }
  return sorted[sorted.length - 1].value;
}

/**
 * Estimate how wide the photographed wall is, in cm, from detected objects.
 *
 * For each usable detection: impliedWall = photoWidthPx × (realWidthCm /
 * bboxWidthPx). Because it's a ratio, the absolute photo resolution cancels
 * out. We combine implied widths with a weighted median (weight = detection
 * score × class reliability) so one oddly-cropped object can't dominate.
 *
 * Returns null when nothing usable was detected — the caller should then fall
 * back to the manual slider default.
 */
export function estimateWallWidthCm(
  detections: Detection[],
  photoWidthPx: number,
): WallEstimate | null {
  if (photoWidthPx <= 0) return null;

  const samples: { value: number; weight: number; class: string }[] = [];
  for (const d of detections) {
    const ref = REFERENCE_WIDTHS_CM[d.class];
    if (!ref) continue;
    if (d.score < MIN_REFERENCE_SCORE) continue;
    const bboxWidthPx = d.bbox[2];
    if (bboxWidthPx <= 0) continue;

    const impliedWall = photoWidthPx * (ref.widthCm / bboxWidthPx);
    samples.push({ value: impliedWall, weight: d.score * ref.weight, class: d.class });
  }

  if (samples.length === 0) return null;

  const median = weightedMedian(samples);
  const wallWidthCm = Math.round(Math.min(MAX_WALL_CM, Math.max(MIN_WALL_CM, median)));

  // Reference label: the highest-weighted contributing class.
  const best = samples.reduce((a, b) => (b.weight > a.weight ? b : a));
  // Confidence: scale total evidence toward 1, capped. More/heavier detections → higher.
  const totalWeight = samples.reduce((s, x) => s + x.weight, 0);
  const confidence = Math.min(1, totalWeight / 1.2);

  return { wallWidthCm, reference: best.class, confidence };
}
