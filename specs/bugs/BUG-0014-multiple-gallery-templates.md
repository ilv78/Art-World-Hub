# BUG-0014: Multiple Gallery Templates

**Status:** Open
**Severity:** Low
**Last Updated:** 2026-03-12
**Reporter:** User

## Description

Currently all artist galleries use the same auto-generated white room layout (`generateWhiteRoomLayout`). The system should offer multiple gallery templates for artists to choose from, providing visual variety across the museum.

## Reproduction Steps

N/A — this is an enhancement request, not a reproducible bug.

## Root Cause

N/A — only one layout algorithm exists (`generateWhiteRoomLayout` in `server/storage.ts`).

## Fix

Not yet resolved. Requires:
- Multiple layout generation algorithms (e.g., dark room, L-shaped, circular)
- Template selection UI in artist dashboard
- Template preference stored on artist record
- Layout regeneration using selected template

## Workaround

No workaround. All galleries use the single white room template. The `MazeGallery3D` component supports white/dark room modes, but the server only generates white room layouts.
