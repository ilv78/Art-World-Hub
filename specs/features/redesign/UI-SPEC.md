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

## 5. Implementation Plan

### Dependency Graph

```
Phase 1: Foundation
  Issue 1 (Split layout shells)
    ├── Issue 2 (Top nav)        ← depends on Issue 1
    ├── Issue 3 (Footer)         ← depends on Issue 1, parallel with Issue 2
    │
Phase 2: Page Redesigns          ← after Issues 2 & 3 are merged
    ├── Issue 4 (Home page)      ← parallel
    ├── Issue 5 (Gallery + 3D)   ← parallel
    ├── Issue 6 (Store page)     ← parallel
    ├── Issue 7 (Other pages)    ← parallel
    │
Phase 3: Polish                   ← after page redesigns stabilize
    ├── Issue 8 (Mobile nav)
    └── Issue 9 (Rebrand)        ← last
```

### Phase 1: Foundation

These changes are structural and must land first. Everything else depends on them.

#### Issue 1 — Split Layout Shells

**Priority:** Critical — all other issues depend on this.

**Scope:**
- Create `PublicLayout` component: top-level wrapper with slot for top nav, full-width `<main>`, slot for footer
- Create `DashboardLayout` component: wraps existing `SidebarProvider` + `AppSidebar` pattern
- Update `App.tsx` routing to assign each page to the correct shell:
  - **Public:** `/` (home), `/gallery`, `/exhibitions`, `/store`, `/artists`, `/artists/:id`, `/blog`, `/blog/:id`, `/auctions`, `/changelog`, `/auth`, `/auth/set-password`
  - **Dashboard:** `/dashboard` (artist), `/curator`, `/curator-gallery/:id`, `/admin`
- Preserve all existing functionality — this is a structural refactor, not a visual change yet
- The public shell renders without sidebar; the dashboard shell keeps the current sidebar

**Key files to modify:**
- `client/src/App.tsx` — routing and layout shell assignment
- `client/src/components/public-layout.tsx` — new file
- `client/src/components/dashboard-layout.tsx` — new file (extracts current sidebar pattern)
- `client/src/components/app-sidebar.tsx` — moved into dashboard shell only

**Acceptance criteria:**
- Public pages render full-width without sidebar
- Dashboard pages render with sidebar exactly as before
- No visual regressions on dashboard pages
- All routes still work, auth still works

---

#### Issue 2 — Top Navigation Bar

**Priority:** High — depends on Issue 1.

**Scope:**
- Build `TopNav` component for the public layout shell
- Sticky top bar with structure:
  - Left: Logo (orange circle "A") + brand name (Playfair Display serif)
  - Center: Nav links — Gallery, Exhibitions, Store, Artists, Blog
  - Right: Search icon, Cart button (with badge count from Zustand store), Palette picker, Theme toggle, User menu (avatar + dropdown with dashboard link + logout)
- Active link highlighting (uses Wouter `useLocation`)
- Unauthenticated state: Login button instead of user menu
- Role-aware: dashboard link in user menu points to correct dashboard (artist/curator/admin)
- Responsive: collapses to hamburger menu on mobile (< md breakpoint)

**Key files to create/modify:**
- `client/src/components/top-nav.tsx` — new file
- `client/src/components/public-layout.tsx` — integrate TopNav
- Reuse existing: `CartSheet`, `PalettePicker`, `ThemeToggle` components

**Design reference:** Artsy (clean, sticky) + Gagosian (minimal, serif brand)

**Acceptance criteria:**
- All public pages have a top nav instead of sidebar
- Cart, theme, palette features still work
- Navigation between all public pages works
- Auth state correctly reflected (login button vs user menu)
- Mobile hamburger menu works

---

#### Issue 3 — Footer Component

**Priority:** High — depends on Issue 1, can be built in parallel with Issue 2.

**Scope:**
- Build `Footer` component for the public layout shell
- Multi-column layout (responsive: 1 col mobile → 4 col desktop):
  - Column 1: Brand name + tagline ("Discover. Collect. Create.") + social media icons
  - Column 2: Navigation links (Gallery, Store, Exhibitions, Artists, Blog)
  - Column 3: For Artists (Join as Artist, Artist Dashboard, Curator Dashboard)
  - Column 4: Newsletter signup (email input + subscribe button — can be placeholder initially)
- Bottom bar: Copyright year, Privacy Policy link, Terms link, version number + changelog link
- Respects current theme (light/dark mode)

**Key files to create/modify:**
- `client/src/components/footer.tsx` — new file
- `client/src/components/public-layout.tsx` — integrate Footer

**Design reference:** MoMA (substantial, multi-column) + Tate (clean, organized)

**Acceptance criteria:**
- Footer appears on all public pages
- Footer does NOT appear on dashboard pages
- Responsive: stacks on mobile, 4 columns on desktop
- Links work, theme-aware

---

### Phase 2: Page Redesigns

These issues can be worked on in parallel once the public shell, top nav, and footer are in place. Each issue is independent.

#### Issue 4 — Home Page Redesign

**Priority:** High — biggest visual impact.

**Scope:**
- **Hero section:** Replace gradient + text with full-bleed visual approach
  - Option A: Featured artwork carousel with cinematic transitions (Gagosian-style pan/zoom)
  - Option B: 3D gallery teaser/preview embedded in hero
  - Minimal overlay text, CTAs overlaid on visual content
- **Featured artworks:** Replace static 4-card grid with horizontal scroll shelf (Artsy pattern)
  - Snap scrolling, arrow navigation, drag/swipe on mobile
- **Features section:** Redesign 3-column cards with better visual hierarchy
- **Additional sections to consider:**
  - "New This Week" horizontal shelf
  - Featured exhibition spotlight (full-bleed card)
  - Artist spotlight section
- **CTA section:** More visual, less text-heavy

**Key files to modify:**
- `client/src/pages/home.tsx` — full page restructure
- New component: `client/src/components/horizontal-shelf.tsx` — reusable scroll shelf
- New component: `client/src/components/hero-carousel.tsx` — hero with transitions

**Design reference:** Gagosian (hero), Artsy (shelves), MoMA (section variety)

**Acceptance criteria:**
- Hero makes strong visual first impression
- Horizontal shelf is smooth and responsive
- Page has visual rhythm — no single repeated grid pattern
- All existing CTAs and links still work

---

#### Issue 5 — Gallery Page: Full-Width 3D + Immersive Mode

**Priority:** High — our key differentiator.

**Scope:**
- 3D gallery now renders full viewport width (no sidebar constraint)
- **Immersive mode toggle:** Button to enter full-screen mode
  - Hides top nav and footer
  - 3D canvas fills entire viewport
  - Floating exit button (top-right corner) or ESC key to exit
  - Uses browser Fullscreen API where supported
- Classic gallery view also benefits from full width
- Tab switching between 3D/Classic remains

**Key files to modify:**
- `client/src/pages/gallery.tsx` — layout adjustments, immersive mode state
- `client/src/components/hallway-gallery-3d.tsx` — respond to full-width/immersive
- `client/src/components/maze-gallery-3d.tsx` — same treatment for artist galleries

**Acceptance criteria:**
- 3D gallery uses full viewport width
- Immersive mode hides all chrome, ESC/button exits
- Classic view also full-width
- No regressions in 3D navigation (WASD, mouse look)

---

#### Issue 6 — Store Page Grid Improvements

**Priority:** Medium.

**Scope:**
- Variable column density: featured/promoted artworks get larger cards
- Consider masonry layout option for artwork grid (respects natural aspect ratios)
- Improved filter panel: sidebar filters on desktop (left side), sheet/drawer on mobile
- Horizontal shelf for "Recently Added" or "Staff Picks" at top
- Keep existing search, category, sort functionality

**Key files to modify:**
- `client/src/pages/store.tsx` — grid layout changes
- `client/src/components/artwork-card.tsx` — possible size variants (small/medium/large)

**Acceptance criteria:**
- Store grid has visual variety
- Filters work on desktop and mobile
- All existing functionality preserved (search, sort, cart, detail dialog)

---

#### Issue 7 — Other Page Improvements

**Priority:** Medium. Can be split into sub-issues if needed.

**Scope:**
- **Artists page:** Larger artist cards, hover to preview portfolio, variable grid
- **Exhibitions page:** Full-bleed exhibition hero cards, better visual hierarchy for active vs upcoming
- **Blog page:** Magazine-style layout — lead article full-width, rest in grid
- **Artist profile page:** Full-width 3D gallery, better tab layout

**Key files to modify:**
- `client/src/pages/artists.tsx`
- `client/src/pages/exhibitions.tsx`
- `client/src/pages/blog.tsx`
- `client/src/pages/artist-profile.tsx`

---

### Phase 3: Polish

#### Issue 8 — Mobile Navigation

**Priority:** Medium — after page layouts stabilize.

**Scope:**
- Evaluate: bottom tab bar vs improved hamburger menu
- Bottom tab bar (if chosen): 4-5 tabs — Home, Gallery, Store, Artists, Cart
  - Visible on mobile only (< md breakpoint)
  - Active tab highlighting
  - Cart tab shows badge count
- Hamburger menu refinements: full-screen overlay with large touch targets
- Touch-optimized card sizes across all pages

**Key files to create/modify:**
- `client/src/components/bottom-tabs.tsx` — new file (if bottom tab approach)
- `client/src/components/top-nav.tsx` — mobile menu improvements
- `client/src/components/public-layout.tsx` — conditional bottom tabs

---

#### Issue 9 — Rebrand

**Priority:** Medium — deliberately last, easier once layout is settled.

**Scope:**
- Apply new brand name: **Vernis9** (see `NAMING-SPEC.md` — decided 2026-03-28)
- Update logo, favicon, meta tags, OpenGraph images
- Update sidebar brand section (dashboard shell)
- Update top nav brand section (public shell)
- Update footer brand section
- Update `<title>` tags across pages
- SEO: update meta descriptions, structured data
- Consider color refinements if name inspires a shift

**Key files to modify:**
- `client/index.html` — title, favicon, meta
- `client/src/components/top-nav.tsx` — brand name/logo
- `client/src/components/app-sidebar.tsx` — brand name/logo
- `client/src/components/footer.tsx` — brand name
- All page components with hardcoded "ArtVerse" references

**Brand name:** Vernis9 (from "vernissage" — art gallery opening night). See NAMING-SPEC.md.

---

## 6. Assets to Preserve

- 3D gallery components (hallway-gallery-3d.tsx, maze-gallery-3d.tsx)
- Shadcn UI component library
- Tailwind CSS v4 setup
- Theme system (light/dark + palette picker)
- Playfair Display + Inter typography
- Orange #F97316 accent
- All dashboard layouts (artist, curator, admin)
