# Gallery Templates

**Status:** Implemented
**Issue:** #14

## Overview

Artists can choose from 8 visual gallery templates for their 3D exhibition rooms. Each template defines wall/floor/ceiling colors, lighting, fog, and floor material type.

## Templates

| ID | Name | Floor | Mood |
|----|------|-------|------|
| contemporary | Contemporary | Wood planks | Minimalist white, natural light |
| classical | Classical Museum | Marble tiles | Warm cream/gold, European museum |
| industrial | Industrial | Concrete | Dark warehouse, dramatic spots |
| luxury | Luxury | Marble | Soft beige, gold accents |
| futuristic | Futuristic | Glossy | Cool white, LED lighting |
| japanese | Japanese Minimalist | Stone tiles | Warm plaster, diffused light |
| brutalist | Brutalist | Concrete | Raw concrete, dramatic shadows |
| outdoor | Sculpture Garden | Stone | Open-air, bright daylight |

## Schema

`artists.gallery_template` — `varchar`, default `'contemporary'`.

## Key Files

- `client/src/lib/gallery-templates.ts` — Template definitions (`GalleryTemplate` interface, `GALLERY_TEMPLATES` map, `getTemplate()`)
- `client/src/components/maze-gallery-3d.tsx` — 3D renderer (accepts `galleryTemplate` prop, replaces legacy `whiteRoom` boolean)
- `client/src/pages/artist-dashboard.tsx` — Template selector UI (color-preview radio cards)
- `shared/schema.ts` — `galleryTemplate` column on artists table
- `migrations/0004_nice_flatman.sql` — Schema migration

## How It Works

1. Artist selects a template in their dashboard profile settings
2. Template ID is stored in `artists.gallery_template`
3. When rendering the 3D room (`MazeGallery3D`), the template config is looked up via `getTemplate()`
4. All visual properties (colors, lighting, floor texture, fog, door style) come from the template config
5. Floor textures are generated procedurally on a canvas (wood, marble, concrete, stone patterns)

## Backward Compatibility

The `whiteRoom` prop on `MazeGallery3D` is preserved for backward compatibility. If `galleryTemplate` is not provided, `whiteRoom={true}` maps to `"contemporary"` and `whiteRoom={false}` falls back to the default dark room style.
