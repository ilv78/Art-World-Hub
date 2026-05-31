import { useCallback, useRef, useState } from "react";
import {
  type Transform,
  type Vec2,
  IDENTITY_TRANSFORM,
  panBy,
  zoomBy,
  touchDistance,
} from "./ar-scale";

/**
 * Pointer/touch/wheel gesture handling for the AR composite: one-finger / mouse
 * drag pans the artwork, wheel and two-finger pinch zoom it. Returns a
 * transform plus handlers to spread onto the interaction surface.
 */
export function usePanZoom() {
  const [transform, setTransform] = useState<Transform>(IDENTITY_TRANSFORM);

  // Active single-pointer drag.
  const dragging = useRef(false);
  const lastPoint = useRef<Vec2>({ x: 0, y: 0 });
  // Active two-finger pinch.
  const pinchDist = useRef<number | null>(null);
  // Track live touch points by id for multi-touch.
  const touches = useRef<Map<number, Vec2>>(new Map());

  const reset = useCallback(() => setTransform(IDENTITY_TRANSFORM), []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.current.size === 1) {
      dragging.current = true;
      lastPoint.current = { x: e.clientX, y: e.clientY };
    } else if (touches.current.size === 2) {
      dragging.current = false;
      const [a, b] = [...touches.current.values()];
      pinchDist.current = touchDistance(a, b);
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (touches.current.size >= 2 && pinchDist.current != null) {
      const [a, b] = [...touches.current.values()];
      const dist = touchDistance(a, b);
      if (pinchDist.current > 0) {
        const factor = dist / pinchDist.current;
        setTransform((t) => zoomBy(t, factor));
      }
      pinchDist.current = dist;
      return;
    }

    if (dragging.current) {
      const delta = { x: e.clientX - lastPoint.current.x, y: e.clientY - lastPoint.current.y };
      lastPoint.current = { x: e.clientX, y: e.clientY };
      setTransform((t) => panBy(t, delta));
    }
  }, []);

  const endPointer = useCallback((e: React.PointerEvent) => {
    touches.current.delete(e.pointerId);
    if (touches.current.size < 2) pinchDist.current = null;
    if (touches.current.size === 0) dragging.current = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    // Trackpad/mouse wheel zoom. Down (positive deltaY) zooms out.
    const factor = Math.exp(-e.deltaY * 0.0015);
    setTransform((t) => zoomBy(t, factor));
  }, []);

  return {
    transform,
    reset,
    setZoom: (factor: number) => setTransform((t) => zoomBy(t, factor)),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onWheel,
    },
  };
}
