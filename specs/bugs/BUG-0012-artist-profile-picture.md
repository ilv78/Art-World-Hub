# BUG-0012: Artist Profile Picture Upload

**Status:** Resolved
**Severity:** Low
**Last Updated:** 2026-03-13
**Reporter:** User

## Description

In the artist profile edit form, the profile picture field accepts a URL link instead of providing an image upload field. It should be changed to use a local image upload (like artwork images) instead of requiring a manual URL.

Currently, `artists.avatarUrl` stores external URLs (typically from OAuth providers). The field should use the same upload mechanism as artwork images (`/api/upload/artwork`).

## Reproduction Steps

1. Log in and go to artist dashboard
2. Open Profile tab
3. Observe that the avatar/profile picture field is a text input for a URL
4. Expected: An image upload field with file picker (like artwork images)

## Root Cause

The profile picture field was originally designed for OIDC provider avatar URLs (Google profile pictures). When local upload was added for artworks, the avatar field was not updated to use the same upload mechanism.

## Fix

Not yet resolved. Change the avatar field in the dashboard Profile tab from a URL text input to a `FileUploadField` component that uploads via `/api/upload/artwork` and stores the local path.

## Workaround

Artists can manually upload an image via the artwork upload endpoint and paste the resulting URL into the avatar field.
