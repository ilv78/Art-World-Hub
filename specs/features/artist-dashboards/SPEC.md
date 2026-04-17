# Feature: Artist Dashboards

**Status:** Active
**Last Updated:** 2026-04-17
**Owner:** Architecture

## Summary

Authenticated artist dashboard providing tabbed management of profile, artworks, blog posts, and orders. Artist profiles are auto-created on first login. The dashboard supports avatar upload, 11 social media platform links, artwork CRUD with exhibition controls, and order status management.

## User Story

As an artist, I want a dashboard to manage my profile, artworks, blog posts, and orders, so that I can maintain my presence on the platform and fulfill purchases.

## Acceptance Criteria

- [x] Dashboard at `/artist-dashboard` (requires authentication)
- [x] Artist auto-created on first login via `/api/artists/me`
- [x] Profile tab: edit name, bio, country, specialization, email, avatar, 11 social links
- [x] Artworks tab: CRUD with image upload, publish/sale/exhibition toggles, exhibition ordering, Published/Drafts sub-tabs
- [x] Blog tab: create/edit/delete posts with cover image upload, publish toggle, Published/Drafts sub-tabs
- [x] Orders tab: view/filter/search orders, update status through workflow
- [x] Gallery regeneration triggered when exhibition settings change
- [x] Public artist profile at `/artists/:id` with gallery, artworks, and blog tabs (drafts filtered out)

## Technical Design

### Dashboard Tabs

| Tab | Capabilities |
|-----|-------------|
| Profile | Edit name, bio, country, specialization, email, avatar (upload), 11 social platform links |
| Artworks | Create/edit/delete artworks; image upload; toggle `isPublished`, `isForSale`, `isReadyForExhibition`; set `exhibitionOrder`; Published/Drafts sub-tabs with inline publish/unpublish |
| Blog | Create/edit/delete posts; cover image upload; toggle `isPublished`; Published/Drafts sub-tabs with inline publish/unpublish |
| Orders | View orders for own artworks; filter by status; search by buyer; update status |

### Social Links

Stored as JSONB on `artists.socialLinks`. Supported platforms: Instagram, X (Twitter), Facebook, YouTube, TikTok, LinkedIn, Behance, Dribbble, DeviantArt, Pinterest, Website.

### Artwork Management

- Image upload via `POST /api/upload/artwork`
- `isPublished` is the master visibility gate — drafts (`isPublished=false`) default on create; the three flags below are clamped to `false` while the artwork is a draft (server enforces on create and on unpublish)
- `isForSale` toggle controls marketplace visibility (disabled in the UI when unpublished)
- `isInGallery` toggle controls 2D gallery visibility (disabled when unpublished)
- `isReadyForExhibition` toggle gates 3D gallery display (disabled when unpublished)
- `exhibitionOrder` field (shown only when ready) controls wall placement order — preserved across an unpublish so re-publishing restores the slot
- Changing exhibition settings (including the flip caused by an unpublish) triggers `regenerateArtistGallery()` server-side
- Deletion cascades to orders, bids, auctions, exhibition_artworks
- Dashboard lists artworks in two sub-tabs: **Published** and **Drafts**; each card has an inline Publish/Unpublish button

### Draft vs Published

- New artworks and blog posts default to drafts (`isPublished=false`)
- Public GET `/api/artworks`, `/api/blog` exclude drafts
- Public GET `/api/artworks/:id`, `/api/blog/:id` return 404 for drafts (owner artist sees own drafts — passport.session populates `req.user` on the public route)
- `/api/artists/:id/artworks` and `/api/artists/:id/blog` include drafts only when the authenticated viewer is the owning artist
- The public artist profile page filters drafts client-side as belt-and-suspenders so an artist's own drafts never show on their public page

### Key Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/artists/me` | Get/create artist profile |
| PATCH | `/api/artists/:id` | Update artist profile |
| POST | `/api/artworks` | Create artwork |
| PATCH | `/api/artworks/:id` | Update artwork |
| DELETE | `/api/artworks/:id` | Delete artwork (cascades) |
| GET | `/api/artists/:id/orders` | Get artist's orders |
| PATCH | `/api/orders/:id/status` | Update order status |

### Key Files

- `client/src/pages/artist-dashboard.tsx` — Dashboard UI (55.6 KB, tabbed interface)
- `client/src/pages/artist-profile.tsx` — Public artist profile (15.5 KB)
- `server/routes.ts` — API endpoints for all CRUD operations
- `server/storage.ts` — Database queries and gallery regeneration

## Dependencies

- Authentication feature — Dashboard requires login
- Image upload system — Avatar and artwork image uploads
- 3D Gallery feature — Layout regeneration on exhibition changes
- Marketplace feature — Order management
- Blog feature — Blog post management

## Open Questions

None — feature is stable and deployed.
