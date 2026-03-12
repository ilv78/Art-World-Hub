# BUG-0008: Admin Section

**Status:** Open
**Severity:** High
**Last Updated:** 2026-03-12
**Reporter:** User

## Description

Need to create an admin role and admin section with the ability to:
- Delete artworks
- Delete artists
- Delete galleries

Currently there is no admin role or administrative interface. All management is done through individual artist dashboards or direct database access.

## Reproduction Steps

N/A — this is a feature request, not a reproducible bug.

## Root Cause

N/A — feature not yet implemented.

## Fix

Not yet resolved. Requires admin role in user model, admin middleware, admin routes, and admin UI.

## Workaround

Administrative operations (deletion of artworks, artists, galleries) can be performed via direct database queries or MCP tools (`delete_artwork`). No user-facing admin interface exists.
