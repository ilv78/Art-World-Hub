// TensorFlow.js object detection for AR wall-scale auto-detect (#634, Phase 1b).
// Isolated in its own module so the heavy model code (tfjs + coco-ssd, several
// MB) is only pulled in via dynamic import() when the buyer actually opens the
// AR view — never on initial page load. The pure scale math lives in
// ./wall-estimator.ts and is what gets unit-tested; this file is the thin,
// browser-only adapter around the model.

import type { Detection } from "./wall-estimator";

// coco-ssd's ObjectDetection type, kept loose to avoid eagerly importing types.
type CocoModel = { detect: (img: HTMLImageElement | HTMLCanvasElement) => Promise<Detection[]> };

let modelPromise: Promise<CocoModel> | null = null;

/**
 * Load (and memoise) the coco-ssd model. The lite_mobilenet_v2 base keeps the
 * download small and inference fast enough for a one-shot detection on a phone.
 */
async function loadModel(): Promise<CocoModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      // Dynamic imports so the bundler splits these into a lazy chunk.
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      return (await cocoSsd.load({ base: "lite_mobilenet_v2" })) as unknown as CocoModel;
    })();
  }
  return modelPromise;
}

/**
 * Run object detection on an already-loaded image element. Returns the raw
 * coco-ssd detections (class/score/bbox) for ./wall-estimator to interpret.
 * Never throws to the caller — detection is best-effort; on any failure it
 * resolves to an empty array so the UI just falls back to the manual slider.
 */
export async function detectObjects(img: HTMLImageElement): Promise<Detection[]> {
  try {
    const model = await loadModel();
    return await model.detect(img);
  } catch {
    return [];
  }
}
