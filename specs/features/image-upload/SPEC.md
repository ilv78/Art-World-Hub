# Feature: Image Upload and Proxy

**Status:** Active
**Last Updated:** 2026-03-13
**Owner:** Architecture

## Summary

Image handling system with two capabilities: file upload for artwork and blog cover images (multer-based, disk storage with UUID filenames), and an image proxy for fetching external images with CORS headers. Uploaded images are served as static files via Express.

## User Story

As an artist, I want to upload images for my artworks and blog posts, so that they display in the gallery and store.

As a visitor, I want external images to load without CORS issues, so that I can see all artwork in the 3D gallery.

## Acceptance Criteria

- [x] Upload artwork images via `POST /api/upload/artwork` (authenticated)
- [x] Upload blog cover images via `POST /api/upload/blog-cover` (authenticated)
- [x] Max file size: 10 MB
- [x] Accepted types: JPEG, PNG, WebP, GIF
- [x] UUID-based filenames prevent collisions
- [x] Uploaded files served as static assets at `/uploads/*`
- [x] Image proxy at `GET /api/image-proxy?url=...` for external images
- [x] Proxy handles redirects, sets CORS headers, caches for 24 hours
- [x] Proxy timeout: 10 seconds (504 on timeout)

## Technical Design

### Upload Architecture

- **Middleware:** multer v2.1.1 with `diskStorage`
- **Storage directories:** `uploads/artworks/`, `uploads/blog-covers/`
- **Filename:** `crypto.randomUUID() + originalExtension`
- **Response:** `{ imageUrl: "/uploads/{subdir}/{uuid}.{ext}" }`
- **Static serving:** `express.static("uploads")` mounted at `/uploads`

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/upload/artwork` | Yes | Upload artwork image |
| POST | `/api/upload/blog-cover` | Yes | Upload blog cover image |
| GET | `/api/image-proxy` | No | Proxy external image with CORS |

### Image Proxy

- Query param: `url` (external image URL)
- **SSRF protection:** Before fetching, the proxy validates the target URL against a blocklist of private/internal addresses. Blocked ranges include `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254` (cloud metadata), and `metadata.google.internal`. Requests to blocked hosts return `403 Forbidden`. (P0 fix — 2026-03-13, PR #84)
- Follows HTTP redirects (3xx) — redirect targets are also validated against the SSRF blocklist
- Sets response headers: `Content-Type`, `Cache-Control: public, max-age=86400`, `Access-Control-Allow-Origin: *`
- Timeout: 10 seconds (returns 504)
- Error handling: 502 on connection errors, forwards 4xx/5xx from remote

### File Upload Validation

- **MIME type:** multer `fileFilter` accepts `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- **Magic byte validation:** After upload, the first bytes of the file are checked against known image file signatures to ensure the file content matches the claimed MIME type. This prevents uploading malicious files (e.g., scripts) renamed with image extensions. Supported magic bytes:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47`
  - GIF: `47 49 46 38`
  - WebP: `52 49 46 46`
- Files that fail magic byte validation are deleted and the upload returns `400 Bad Request`. (P1 fix — 2026-03-13, PR #85)

### Database Storage

Image URLs stored as text in:
- `artworks.imageUrl` — Artwork image (required)
- `artists.avatarUrl` — Artist profile picture (optional)
- `blog_posts.coverImageUrl` — Blog cover (optional)

### Client Integration

`FileUploadField` component in artist dashboard provides:
- File input accepting image MIME types
- Loading spinner during upload
- Image preview after upload
- `handleImageUpload()` utility: FormData POST → parse response → update state

## Dependencies

- `multer` v2.1.1 — File upload middleware
- Express static middleware — File serving
- Authentication feature — Upload routes require login

## Open Questions

None — feature is stable and deployed.
