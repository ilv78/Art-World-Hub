# ADR-0010: AR "View in My Room"

**Status:** Accepted
**Date:** 2026-05-31
**Issue:** [#634](https://github.com/ilv78/Art-World-Hub/issues/634)

## Context

Collectors can't judge how an artwork will look on their own wall from a product
photo alone. We want an augmented-reality "view in my room" capability. The space
splits into three families: (A) photo-upload compositing, (B) live marker-less
WebAR, (C) native AR via ARKit/ARCore. They trade off device coverage, realism,
effort, cost, and privacy. This is a major, net-new capability and the headline
feature of the next major version (v4.0.0), developed on the long-lived `v4`
branch with `main` kept as the v3 maintenance line.

## Decision

1. **Ship Option A (photo composite) + Option C (native `<model-viewer>`) in v1;
   defer Option B (live WebAR).** A covers 100% of devices including desktop, is
   fully client-side, and satisfies the exact ask. C adds best-in-class native
   tracking on phones with no app install. B's marker-less iOS support requires a
   paid SLAM SDK (8th Wall) that sends camera frames to a third party — not worth
   the cost/privacy trade until usage justifies it.
2. **Structured physical dimensions are a prerequisite.** The legacy
   `artworks.dimensions` is free-form text and can't drive believable scale.
   Added nullable `width_cm`/`height_cm`/`dimension_unit` (Phase 0) with a
   backfill — nullable to keep existing rows valid and survive preview's push-mode
   migration (lesson from #543).
3. **Scale via CV auto-detect, with a manual fallback.** Wall scale is estimated
   from the photo (MediaPipe / TensorFlow.js); a manual wall-width control is the
   fallback and ships first (Phase 1a) so the feature works before the CV layer.
4. **Client-side only.** The room photo and composite never leave the browser —
   best privacy, no storage cost, simplest.
5. **react-three-fiber + drei** for rendering, over the existing `three` dep, with
   the WebGL canvas `React.lazy`-loaded so three.js doesn't bloat initial load.

## Consequences

- A new buyer-facing surface on the artwork detail page; new media/CV pipeline.
- Bundle: three.js (~600 KB) is code-split behind the AR dialog; main bundle
  unaffected (verified — main chunk unchanged, separate `room-canvas` chunk).
- Phase 0 schema change is documented in `DATA-MODEL.md`; migration 0013 is
  idempotent and backfills from `dimensions`.
- Option C will require a per-artwork USDZ/glTF generation step (future PR).
- If we later adopt a paid SLAM SDK for Option B, that needs its own ADR + a
  privacy review (camera frames to a third party).
