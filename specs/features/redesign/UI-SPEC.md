# UI Redesign Specification

**Status:** Draft
**Created:** 2026-03-24

---

## 1. Motivation

The current ArtVerse layout uses a sidebar-first navigation pattern across all pages. Research into 8 major art platforms revealed that this pattern is not used by any successful art gallery or marketplace website. A full layout redesign will align the platform with industry standards while preserving its unique 3D gallery experience.

---

## 2. Research: Industry Analysis

### Sites Analyzed

| Site | Type | Navigation | Hero | Grid Pattern | Color | Typography |
|------|------|-----------|------|-------------|-------|-----------|
| **Artsy** | Marketplace | Top nav, sticky | Editorial curated | Horizontal scroll shelves + grids | White bg, blue accent (#1023D7) | Sans-serif |
| **MoMA** | Museum | Top nav, mega menu | Full-bleed featured exhibition | Variable density (3/5/8 col) | White bg, black text | Sans-serif |
| **Gagosian** | Elite gallery | Minimal top nav | Cinematic carousel (pan/zoom) | Sparse, whitespace-heavy | White bg, blue accent (#0F2994) | Serif headlines |
| **Tate** | Museum | Top nav, mega menu | Full-bleed featured art | Mixed grid densities | White bg, minimal color | Sans-serif |
| **Artnet** | Market + auctions | Top nav, dense | News-style editorial | Magazine grid layout | White bg, blue accents | Sans-serif |
| **DeviantArt** | Artist community | Top nav + tag bar | Feed-based, dark theme | Masonry/waterfall | Dark bg, green accent | Sans-serif |
| **Behance** | Portfolio platform | Top nav, sticky | Curated project grid | Masonry with hover overlays | White bg, blue (#0057FF) | Sans-serif (100+ design tokens) |
| **Saatchi Art** | Marketplace | Top nav, filters | Curated featured art | Uniform grid + filters | White bg, blue (#2ea3f2) | Sans-serif |

### Key Findings

1. **White space is sacred** — All 8 sites default to white/light backgrounds. The artwork provides the color. The layout recedes so art stands forward.

2. **Sans-serif dominates, but serif = premium** — 7 of 8 sites are pure sans-serif. Only Gagosian (the most elite gallery) uses serif for headlines. Our Playfair Display + Inter combination positions us in premium territory — worth keeping.

3. **No sidebar navigation** — Zero art platforms use sidebar nav for public browsing. All use top navigation bars (sticky or fixed). Sidebars are reserved for dashboard/admin interfaces.

4. **Grid variety creates rhythm** — MoMA uses different column densities per section (3-col, 5-col, 8-col). Artsy mixes horizontal scroll shelves with grids. No successful site uses a single uniform grid throughout.

5. **Full-bleed heroes sell the art** — Gagosian's cinematic carousel with pan/zoom animations, Artsy's editorial heroes. Visual impact in the first viewport is critical.

6. **Horizontal scroll shelves** — Artsy's signature pattern. Perfect for discovery sections: "Featured Artworks," "New This Week," artist spotlights.

7. **Orange is a differentiator** — Every major competitor uses blue accents. Our #F97316 orange is unique in the market. Keep it.

8. **Substantial footers** — MoMA, Tate, Artsy all have multi-column footers with membership info, social links, legal, newsletter signup.

9. **Mobile is primary** — Saatchi Art reports mobile users exceeded desktop since 2019. Responsive design is non-negotiable.

10. **Each platform has one distinctive UX feature** — Saatchi: AR "View In A Room". Artsy: horizontal shelves. Gagosian: cinematic animations. Ours: 3D virtual museum.

---

## 3. Design Direction

### 3.1 Split Layout Shells

Two distinct layout shells instead of one:

**Public Shell** (gallery, store, exhibitions, artists, blog, home):
- Top navigation bar (sticky)
- Full-width content area
- Substantial footer
- No sidebar

**Dashboard Shell** (artist dashboard, curator dashboard, admin panel):
- Sidebar navigation (keep current pattern)
- This is the industry standard for management UIs

### 3.2 Top Navigation Bar

Inspired by Artsy + Gagosian:
- Sticky top bar
- Left: Logo + brand name
- Center: Main nav links (Gallery, Exhibitions, Store, Artists, Blog)
- Right: Search, Cart, Theme toggle, User menu (avatar dropdown)
- Mobile: Hamburger menu or bottom tab bar
- Clean, minimal — let the art breathe

### 3.3 Home Page Hero

Replace gradient + text hero with a visual-first approach:
- Full-bleed featured artwork or 3D gallery preview
- Cinematic transitions (inspired by Gagosian)
- Minimal overlay text — let art be the hero
- CTA buttons overlaid on visual content
- The 3D gallery is our differentiator — consider featuring it prominently

### 3.4 Grid Variety

Replace uniform `sm:2 lg:3` grids with mixed layouts:
- **Horizontal scroll shelves** for discovery sections (featured, new, trending)
- **Variable column density** per section (2-col featured, 3-col store, 4-col artists)
- **Masonry/waterfall option** for gallery views (respect artwork aspect ratios)
- **Full-bleed hero cards** for exhibitions and featured content

### 3.5 Footer

Multi-column footer inspired by MoMA/Tate:
- Column 1: Brand + tagline + social links
- Column 2: Navigation links
- Column 3: For Artists (join, dashboard, resources)
- Column 4: Newsletter signup
- Bottom bar: Copyright, legal links, version

### 3.6 3D Gallery Integration

The 3D museum is our unique feature — enhance, not hide it:
- **Full-screen immersive mode** toggle (no chrome, pure 3D)
- Keep dual-mode (3D + classic) for accessibility
- Home page could feature a 3D mini-preview or teaser
- Gallery page: 3D takes full viewport width (no sidebar eating space)

### 3.7 Typography & Color (Retain)

- **Keep:** Playfair Display (serif) + Inter (sans-serif) — positions us as premium
- **Keep:** Orange #F97316 primary accent — unique differentiator vs. blue competitors
- **Keep:** Light/dark mode support
- **Keep:** Palette picker feature

### 3.8 Mobile Strategy

- Top nav collapses to hamburger or bottom tab bar
- Touch-friendly card sizes
- 3D gallery defaults to classic view on mobile (existing behavior)
- Responsive breakpoints: maintain current Tailwind sm/md/lg/xl system

---

## 4. Current vs. Proposed Comparison

| Aspect | Current | Proposed |
|--------|---------|----------|
| Navigation (public) | Collapsible sidebar | Sticky top nav bar |
| Navigation (dashboard) | Sidebar | Sidebar (unchanged) |
| Layout shells | Single shell for all pages | Two shells: public + dashboard |
| Home hero | Gradient + text | Full-bleed art/3D visual |
| Content width | Reduced by sidebar | Full viewport width |
| Grid patterns | Uniform sm:2 lg:3 | Mixed: shelves, masonry, variable cols |
| Footer | Version number only | Multi-column with nav, social, newsletter |
| 3D gallery | Constrained in sidebar layout | Full-width + immersive mode |
| Mobile nav | Collapsed sidebar | Hamburger menu / bottom tabs |

---

## 5. Implementation Phases

To be broken into separate GitHub issues:

1. **Navigation restructure** — Top nav component, split layout shells, route updates
2. **Footer component** — Multi-column footer, social links, newsletter
3. **Home page redesign** — Full-bleed hero, horizontal shelves, mixed grids
4. **Gallery page** — Full-width 3D, immersive mode toggle
5. **Store page** — Variable grid, improved filters
6. **Other pages** — Artists, exhibitions, blog grid improvements
7. **Rebrand** — New name, logo, color refinements (see NAMING-SPEC.md)
8. **Mobile polish** — Bottom tab bar, touch optimizations

---

## 6. Assets to Preserve

- 3D gallery components (hallway-gallery-3d.tsx, maze-gallery-3d.tsx)
- Shadcn UI component library
- Tailwind CSS v4 setup
- Theme system (light/dark + palette picker)
- Playfair Display + Inter typography
- Orange #F97316 accent
- All dashboard layouts (artist, curator, admin)
