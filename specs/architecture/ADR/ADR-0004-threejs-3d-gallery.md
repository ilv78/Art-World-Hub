# ADR-0004: Three.js for 3D Gallery Rendering

**Status:** Active
**Date:** 2026-02-01
**Owner:** Architecture

## Context

ArtVerse's core differentiator is a 3D virtual museum where visitors walk through gallery rooms and view artworks on walls. The rendering solution must work in browsers without plugins, support texture loading from various image sources, and integrate with React.

## Options Considered

1. **Three.js (raw)** — Direct WebGL rendering library
   - Pros: Full control, lightweight, massive community, good React integration via refs
   - Cons: More boilerplate than frameworks, manual scene management
2. **React Three Fiber (R3F)** — React renderer for Three.js
   - Pros: Declarative, React-native feel, ecosystem (drei helpers)
   - Cons: Abstraction overhead, harder to debug, less control over render loop
3. **Babylon.js** — Full 3D engine
   - Pros: Built-in physics, GUI system, playground
   - Cons: Heavier bundle, different paradigm, smaller React community
4. **A-Frame** — HTML-based 3D framework
   - Pros: Easy to learn, declarative
   - Cons: Limited control, VR-focused, performance concerns

## Decision

Raw Three.js v0.182.0 integrated with React via `useRef` and `useEffect` hooks. Two main components: `HallwayGallery3D` (museum hallway) and `MazeGallery3D` (artist rooms). Server-side layout generation ensures consistent room geometry.

## Consequences

- Positive: Full control over rendering, lighting, and camera; efficient texture caching; custom collision detection
- Negative: Large component files (~1,200 lines each); manual scene lifecycle management
- Risks: WebGL performance on mobile devices; texture loading reliability for external images

## References

- `client/src/components/hallway-gallery-3d.tsx` — Museum hallway component
- `client/src/components/maze-gallery-3d.tsx` — Artist room component
- `server/storage.ts` — `generateWhiteRoomLayout()` algorithm
- `specs/features/3d-gallery/SPEC.md` — Feature specification
