// Pure scale/transform math for the AR "View in my room" composite (#634).
// Kept browser-free so it can be unit-tested: given an artwork's real-world
// size in cm and an estimate of how wide the photographed wall is, work out how
// many on-screen pixels the artwork should occupy, then apply user pan/zoom.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Transform {
  /** Pan offset in pixels from the canvas centre. */
  offset: Vec2;
  /** User zoom multiplier on top of the physically-derived base size. */
  zoom: number;
}

export const IDENTITY_TRANSFORM: Transform = { offset: { x: 0, y: 0 }, zoom: 1 };

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

export function clampZoom(z: number): number {
  if (!Number.isFinite(z)) return 1;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

/**
 * Base on-screen size (pixels) of the artwork before user zoom, derived from
 * physical scale: pixels-per-cm = canvasWidthPx / assumedWallWidthCm.
 *
 * Falls back to a sensible fraction of the canvas when physical data is
 * missing, so the composite still renders something draggable.
 */
export function baseArtworkSizePx(params: {
  widthCm: number | null | undefined;
  heightCm: number | null | undefined;
  canvasWidthPx: number;
  /** Estimated real width of the wall shown in the photo, in cm. */
  wallWidthCm: number;
}): { width: number; height: number } {
  const { widthCm, heightCm, canvasWidthPx, wallWidthCm } = params;

  // Fallback: no usable physical size → ~40% of canvas width, 4:3 portrait-ish.
  if (!widthCm || !heightCm || widthCm <= 0 || heightCm <= 0 || wallWidthCm <= 0) {
    const w = canvasWidthPx * 0.4;
    return { width: w, height: w };
  }

  const pxPerCm = canvasWidthPx / wallWidthCm;
  return { width: widthCm * pxPerCm, height: heightCm * pxPerCm };
}

/** Apply a relative pan (e.g. a drag delta) to a transform. */
export function panBy(t: Transform, delta: Vec2): Transform {
  return { ...t, offset: { x: t.offset.x + delta.x, y: t.offset.y + delta.y } };
}

/** Apply a relative zoom factor (e.g. from wheel/pinch), clamped. */
export function zoomBy(t: Transform, factor: number): Transform {
  return { ...t, zoom: clampZoom(t.zoom * factor) };
}

/** Final rendered rect (centre-anchored) for the artwork given a transform. */
export function renderedRect(
  base: { width: number; height: number },
  t: Transform,
  canvas: { width: number; height: number },
): { left: number; top: number; width: number; height: number } {
  const width = base.width * t.zoom;
  const height = base.height * t.zoom;
  const left = canvas.width / 2 - width / 2 + t.offset.x;
  const top = canvas.height / 2 - height / 2 + t.offset.y;
  return { left, top, width, height };
}

/** Pixel distance between two touch points — for pinch-zoom. */
export function touchDistance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
