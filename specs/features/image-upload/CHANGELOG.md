# Image Upload and Proxy — Changelog

## 2026-03-11
- Deduplicated upload code across artwork and blog cover endpoints (PR #18, closes #17)

## 2026-02 (Initial)
- Artwork image upload via multer with UUID filenames
- Blog cover image upload via dedicated endpoint
- Static file serving at `/uploads/*`
- Image proxy at `/api/image-proxy` for external CORS-blocked images
- Redirect following, 24-hour cache, 10-second timeout
