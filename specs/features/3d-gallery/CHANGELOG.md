# 3D Gallery — Changelog

## 2026-03-11
- Fixed missing artworks in gallery due to slot count mismatch (PR #30, closes #25)
- Fixed stale gallery layouts in museum hallway (PR #29, closes #28)
- Added auto-regeneration on hallway load when slot count mismatches artwork count
- Fixed classic view gallery arrow navigation (PR #31, closes #9)

## 2026-02 (Initial)
- Hallway gallery: central corridor with per-artist rooms
- Maze gallery: individual artist exhibition rooms with white/dark modes
- Server-side layout generation algorithm (`generateWhiteRoomLayout`)
- First-person navigation with WASD + mouse look (pointer lock)
- Collision detection against walls
- Texture loading with retry logic and caching
- Image proxy for CORS-blocked external images
- Artist poster and name plaques
- Classic 2D carousel fallback view
