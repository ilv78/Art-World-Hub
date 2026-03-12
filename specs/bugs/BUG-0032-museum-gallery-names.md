# BUG-0032: Museum Gallery Artist Names

**Status:** Open
**Severity:** Medium
**Last Updated:** 2026-03-12
**Reporter:** User

## Description

In the museum hallway gallery, artist names are not visible when walking through the hallway. Names only become visible when exiting a room. The hallway should have:
- Indicators hanging from the ceiling with artist names at each room entrance
- Directional indicators on walls pointing visitors toward artist galleries

Currently, name plaques exist but are not prominent enough or positioned correctly for hallway navigation.

## Reproduction Steps

1. Navigate to `/gallery` and enter 3D mode
2. Walk through the hallway
3. Observe that artist room names are difficult to see
4. Enter a room and then exit — names become visible on exit
5. Expected: Clear hanging signs and wall indicators visible while walking the hallway

## Root Cause

Name plaques in `hallway-gallery-3d.tsx` are positioned at room entrances but may be oriented incorrectly or too small. No ceiling-hanging indicators or wall-mounted directional signs exist.

## Fix

Not yet resolved. Requires updates to `hallway-gallery-3d.tsx`:
- Add ceiling-mounted hanging signs with artist names
- Add wall-mounted directional indicators
- Improve name plaque visibility (size, positioning, lighting)

## Workaround

No workaround. Visitors must explore rooms to discover which artist's gallery they are entering.
