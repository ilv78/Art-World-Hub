# Feature: Blog System

**Status:** Active
**Last Updated:** 2026-04-17
**Owner:** Architecture

## Summary

Artist blogging system where each artist can create, edit, publish, and delete blog posts. Posts support cover images (uploaded via dedicated endpoint) and a publish toggle that controls public visibility. Published posts appear on the main blog page and the artist's profile blog tab.

## User Story

As an artist, I want to write and publish blog posts, so that I can share my thoughts, process, and updates with visitors.

## Acceptance Criteria

- [x] Blog list page (`/blog`) displays all published posts in a 3-column grid
- [x] Post detail page (`/blog/:id`) shows full content with cover image and artist link
- [x] Dashboard blog tab splits posts into **Published** and **Drafts** sub-tabs with status badges and inline publish/unpublish
- [x] Create post dialog: title, excerpt, cover image upload, content, publish toggle
- [x] Edit post: same form pre-populated, partial updates via PATCH
- [x] Delete post: permanent removal
- [x] Draft posts hidden from public `/blog` but visible in dashboard
- [x] Cover images optional (fallback icon if missing)
- [x] `updatedAt` auto-set on edits
- [x] Artist profile blog tab shows only published posts

## Technical Design

### Database Table

`blog_posts` — `id`, `artistId`, `title`, `content`, `excerpt`, `coverImageUrl`, `isPublished` (boolean), `createdAt`, `updatedAt`

### Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/blog` | No | List all published posts (with artist name) |
| GET | `/api/blog/:id` | No | Single post detail; returns 404 for drafts unless the viewer is the owning artist |
| GET | `/api/artists/:id/blog` | No | Posts by artist — includes drafts when the authenticated viewer is the owning artist, otherwise published-only |
| POST | `/api/blog` | Yes | Create blog post |
| PATCH | `/api/blog/:id` | Yes | Update post fields |
| DELETE | `/api/blog/:id` | Yes | Delete post |

### Cover Image Upload

- Endpoint: `POST /api/upload/blog-cover`
- Storage: `uploads/blog-covers/` with UUID filenames
- Max size: 10 MB
- Accepted types: JPEG, PNG, WebP, GIF

### Content Format

Content stored as plain text. No server-side markdown rendering. Frontend displays content as-is with CSS formatting.

## Dependencies

- Authentication feature — CRUD operations require login
- Image upload system — Blog cover image uploads
- Artist dashboards feature — Blog management in dashboard tab

## Open Questions

None — feature is stable and deployed.
