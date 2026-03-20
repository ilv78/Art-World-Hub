# BUG-0172: Mobile Adaptation

**Status:** Resolved
**Priority:** Critical
**Issue:** #172

## Problem

1. **3D maze gallery not visible on mobile** — Pointer Lock API doesn't exist on mobile devices, so the gallery was permanently stuck on the "Click to Enter" overlay. No touch controls existed.
2. **2D/Classic view not functional on mobile** — Navigation was keyboard-only (arrow keys), artwork info label overflowed off-screen on narrow viewports.

## Root Causes

- `requestPointerLock()` is a desktop-only API; mobile browsers don't support it
- No touch event handlers (`touchstart`, `touchmove`, `touchend`) in 3D components
- Fixed `600px` container height caused layout issues on small viewports
- Classic view relied entirely on keyboard for navigation (no swipe)
- Artwork info label positioned with `left-full` (off-screen on mobile)

## Fix

### 3D Galleries (`maze-gallery-3d.tsx` + `hallway-gallery-3d.tsx`)

- **Mobile detection**: `"ontouchstart" in window || navigator.maxTouchPoints > 0`
- **Touch-to-look**: Single-finger drag rotates camera (using `touchstart`/`touchmove`/`touchend`)
- **On-screen D-pad**: 4-button directional pad in bottom-left corner for movement
- **Tap-to-select**: Touch raycasting to select artworks
- **Bypass pointer lock on mobile**: Gallery enters directly without pointer lock
- **Exit button**: Mobile gets an explicit "Exit" button (no ESC key on mobile)
- **Responsive container**: Changed from `style={{ height: "600px" }}` to `h-[60vh] min-h-[300px] max-h-[600px]`
- **Mobile-adapted entry overlay**: Simpler instructions (Drag/Tap instead of WASD/Mouse/Click)

### Classic View (`gallery.tsx`)

- **Swipe navigation**: Horizontal swipe (>50px, more horizontal than vertical) navigates between artworks
- **Responsive image sizing**: `max-w-[70vw] sm:max-w-lg max-h-[50vh] sm:max-h-[60vh]`
- **Responsive info label**: Positioned below artwork on mobile, beside it on desktop
- **Reduced padding**: `p-4 sm:p-8` and `gap-2 sm:gap-4` for smaller screens
