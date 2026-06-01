# Feature: AR "View in My Room"

**Status:** In progress (v4 line → v4.0.0)
**Issue:** [#634](https://github.com/ilv78/Art-World-Hub/issues/634)
**Owner:** Architecture

---

## Summary

Let a collector see how an artwork would look on their own wall before buying. The
user uploads a photo of their room/wall (or uses their camera), the artwork is
composited onto it at a believable physical scale, and they can drag to position
and pinch/scroll to zoom. Headline feature of the next major version (v4.0.0).

## Approach (decided on #634)

| Aspect | Decision |
|--------|----------|
| v1 surfaces | **Option A** (photo-upload composite) **+ Option C** (native `<model-viewer>` AR). Option B (live marker-less WebAR) deferred. |
| Scale calibration | **CV auto-detect** of wall scale (MediaPipe / TensorFlow.js), with a manual wall-width slider fallback. |
| Privacy | **Client-side only** — the room photo and composite never leave the browser. |
| Rendering | **react-three-fiber + drei** over the existing `three` dependency. |

## Phases

- **Phase 0 — DONE** ([PR #637](https://github.com/ilv78/Art-World-Hub/pull/637)): structured physical
  size on `artworks` (`width_cm` / `height_cm` / `dimension_unit`, nullable),
  migration 0013 with backfill from the legacy free-text `dimensions`, shared
  `parseDimensions()` util, artist-dashboard editor fields. See `DATA-MODEL.md`.
- **Phase 1a — THIS PR**: photo-upload composite. Entry button on the artwork
  detail page → dialog → upload room photo → r3f canvas with the artwork as a
  textured plane over the room photo, drag to position, pinch/scroll/buttons to
  zoom, save the composite as PNG. Scale derives from the artwork's real cm size
  vs. an estimated wall width (manual slider for now).
- **Phase 1b — THIS PR**: CV auto-detect of wall scale. When the buyer picks a
  room photo, a TensorFlow.js (coco-ssd) model detects common objects; their
  known typical real-world widths back out an estimated wall width, which seeds
  the slider automatically. The slider remains as a manual override.
- **Phase 2**: native AR via `<model-viewer ar>` (auto-generated USDZ + glTF).

## Architecture (Phase 1a)

```
client/src/components/ar/
  ar-scale.ts            Pure transform/scale math (px-per-cm, pan, zoom clamp). Unit-tested.
  use-pan-zoom.ts        Pointer/touch/wheel gestures → Transform state.
  room-canvas.tsx        r3f Canvas (orthographic, px-mapped): room plane + artwork plane.
  view-in-room-dialog.tsx  Entry button + upload step + composite + controls + PNG export.
```

- **Scale model**: `pxPerCm = canvasWidthPx / wallWidthCm`; artwork base size =
  `widthCm * pxPerCm`. User zoom multiplies on top. Falls back to ~40% of canvas
  width when an artwork has no structured size.
- **Coordinate space**: r3f orthographic camera maps world units → pixels, centred
  at the origin (y-up). Screen y is negated. Keeps `ar-scale.ts` browser-free and
  testable.
- **Privacy**: room photo loaded via `URL.createObjectURL` and revoked on
  replace/close; nothing is uploaded.
- **Bundle**: `room-canvas` (three.js + r3f, ~600 KB) is `React.lazy`-loaded so it
  only downloads when a buyer opens the AR view — the main bundle is unaffected.
- **Save**: the r3f canvas uses `preserveDrawingBuffer` so `toDataURL` can export
  the composite as a PNG download.

## Architecture (Phase 1b — CV auto-detect)

```
client/src/components/ar/
  wall-estimator.ts      Pure: detections + known object widths → wall width (cm). Unit-tested.
  detect-objects.ts      Browser-only adapter: lazy-loads tfjs + coco-ssd, runs detection.
```

- **Estimation model**: for each recognised object, `impliedWallCm =
  photoWidthPx × (typicalObjectWidthCm / objectBboxWidthPx)`. Because it's a
  ratio, photo resolution cancels out. Multiple detections are combined with a
  **weighted median** (weight = detection score × per-class reliability) so one
  oddly-cropped object can't skew the estimate. Result is clamped to the slider's
  `100–600 cm` range.
- **Reference table** (`REFERENCE_WIDTHS_CM`): only classes plausibly seen in a
  room photo, each with a reliability weight — a couch (~2 m, consistent) is
  trusted far more than a TV or potted plant (highly variable).
- **Bundle**: `detect-objects.ts` (tfjs + coco-ssd, several MB) is `import()`-ed
  dynamically only when a photo is picked, so it splits into its own lazy chunk
  and never touches the main bundle or even the dialog chunk.
- **Best-effort**: detection never blocks or throws to the UI — on model-load
  failure or no recognisable object, it silently falls back to the manual slider.
- **UX**: a "Measuring your wall…" spinner during detection; on success, a "Scale
  auto-detected from the &lt;object&gt;" hint. Touching the slider clears the hint
  (manual override wins).

## Out of scope (v1)

Multi-artwork walls, persisting placements to the account, frame/matting selection,
occlusion behind furniture, relighting.
