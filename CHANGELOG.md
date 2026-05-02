# Changelog

All notable changes to [Vernis9](https://github.com/ilv78/Art-World-Hub) will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/). See `specs/workflows/VERSIONING.md` for the full versioning policy.

Deployment tags (`release-{run_number}`) are created automatically on every push to main. Semantic version tags (`vX.Y.Z`) mark meaningful milestones.

## [Unreleased]

_Nothing yet — all recent work included in v3.13.0 below._

## [3.13.0] - 2026-05-02

### Added
- perf(server): inject LCP image preload tag into / HTML so the carousel hero is preload-scannable (sub of #551 P3) ([#560](https://github.com/ilv78/Art-World-Hub/issues/560))
- perf(client): route-level code-split via React.lazy to remove non-home code from the home bundle (sub of #551) ([#558](https://github.com/ilv78/Art-World-Hub/issues/558))
- perf(nginx): enable HTTP/2 + Cache-Control immutable on /assets and /uploads (sub of #551) ([#555](https://github.com/ilv78/Art-World-Hub/issues/555))

### Fixed
- perf(devops): verify Nginx serves gzip/brotli for HTML/JS/CSS on staging + prod ([#550](https://github.com/ilv78/Art-World-Hub/issues/550))

## [3.12.0] - 2026-04-23

### Added
- SEO: rank artist profile on page 1 for full name — Phase 1 (name + sameAs) ([#535](https://github.com/ilv78/Art-World-Hub/issues/535))

### Fixed
- fix(ci): Trivy blocks staging deploy on Go stdlib CVEs in drizzle-kit bundled esbuild ([#540](https://github.com/ilv78/Art-World-Hub/issues/540))

### Security
- chore(security): suspend weekly security scan cron — pending new cadence ([#533](https://github.com/ilv78/Art-World-Hub/issues/533))

### Added
- SEO: `sameAs` on artist Person JSON-LD, derived from `artists.socialLinks`. Primary off-platform ranking signal for personal-name queries. ([#535](https://github.com/ilv78/Art-World-Hub/issues/535))

## [3.11.0] - 2026-04-20

### Added
- Generate webpage for Koningsdag 26 ([#526](https://github.com/ilv78/Art-World-Hub/issues/526))

### Fixed
- bug: /koningsdag 301-loops on staging (directory collides with SPA route) ([#528](https://github.com/ilv78/Art-World-Hub/issues/528))

### Added
- feat: `/koningsdag` welcome landing for the Koningsdag flea-market QR — captures email via existing newsletter signup tagged with a new `source` column; reuses `newsletter_subscribers` ([#526](https://github.com/ilv78/Art-World-Hub/issues/526))
- SEO: image sitemap — `/sitemap.xml` now declares the Google image namespace and emits `<image:image>` entries for artist avatars, published artwork images (title + caption), and blog cover images ([#504](https://github.com/ilv78/Art-World-Hub/issues/504))
### Fixed
- fix: `/koningsdag` 301-loops on staging because the campaign asset sat under a directory that shadowed the SPA route — moved to `/campaigns/koningsdag/alexandra-painting.jpg` ([#528](https://github.com/ilv78/Art-World-Hub/issues/528))

## [3.10.0] - 2026-04-17

### Added
- SEO: add public artwork detail pages (/artworks/:slug) with full meta + VisualArtwork JSON-LD + per-artwork OG image ([#503](https://github.com/ilv78/Art-World-Hub/issues/503))
- SEO: add WebSite + SearchAction and FAQPage JSON-LD on homepage ([#501](https://github.com/ilv78/Art-World-Hub/issues/501))

## [3.9.0] - 2026-04-17

### Added
- feat: draft/published state for artworks + dashboard Drafts tab for portfolio & blog ([#513](https://github.com/ilv78/Art-World-Hub/issues/513))

## [3.8.0] - 2026-04-15

### Added
- iOS home-screen label: set app title to just "Vernis9" ([#493](https://github.com/ilv78/Art-World-Hub/issues/493))
- Add apple-touch-icon for iOS home-screen bookmarks ([#491](https://github.com/ilv78/Art-World-Hub/issues/491))

### Security
- Security headers missing in production response (helmet installed but not taking effect) ([#497](https://github.com/ilv78/Art-World-Hub/issues/497))

## [3.7.0] - 2026-04-14

### Added
- Upgrade React 18 → 19 (deferred from #466 + #482) ([#485](https://github.com/ilv78/Art-World-Hub/issues/485))
- Enlarge artwork detail dialog on desktop ([#455](https://github.com/ilv78/Art-World-Hub/issues/455))

## [3.6.0] - 2026-04-10

### Added
- Add multi-device dev workflow (park / resume / sync between laptop and ilc01node03) ([#444](https://github.com/ilv78/Art-World-Hub/issues/444))
- Epic: SEO — prepare Vernis9 for search engine discovery ([#363](https://github.com/ilv78/Art-World-Hub/issues/363))

### Fixed
- Mobile - 3d maze for exhibition is not ok ([#451](https://github.com/ilv78/Art-World-Hub/issues/451))
- deploy-nginx-config script on VPS is stale (predates #386 + #389) ([#430](https://github.com/ilv78/Art-World-Hub/issues/430))

### Changed
- Clean up pre-migration nginx symlinks on VPS (artverse.idata.ro, staging.artverse.idata.ro, preview.artverse.idata.ro.conf) ([#434](https://github.com/ilv78/Art-World-Hub/issues/434))

## [3.5.1] - 2026-04-09

### Fixed
- Google Search console - not indexing ([#427](https://github.com/ilv78/Art-World-Hub/issues/427))
- doc-agent: dedup audit issues instead of creating one per push ([#415](https://github.com/ilv78/Art-World-Hub/issues/415))

### Security
- security: revert security cron back to weekly Monday ([#425](https://github.com/ilv78/Art-World-Hub/issues/425))
- security: 4 npm audit vulnerabilities (drizzle-orm SQLi, vite path traversal, hono x2) blocking CI ([#417](https://github.com/ilv78/Art-World-Hub/issues/417))

## [3.5.0] - 2026-04-01

### Added
- SEO: block crawlers on non-production environments ([#376](https://github.com/ilv78/Art-World-Hub/issues/376))
- SEO: alt text audit ([#369](https://github.com/ilv78/Art-World-Hub/issues/369))
- SEO: image lazy loading ([#368](https://github.com/ilv78/Art-World-Hub/issues/368))
- SEO: structured data (JSON-LD) ([#367](https://github.com/ilv78/Art-World-Hub/issues/367))
- SEO: server-side meta tag injection + react-helmet-async ([#366](https://github.com/ilv78/Art-World-Hub/issues/366))
- SEO: dynamic sitemap.xml endpoint ([#365](https://github.com/ilv78/Art-World-Hub/issues/365))
- SEO: add robots.txt ([#364](https://github.com/ilv78/Art-World-Hub/issues/364))
- v3: Gallery page full-width 3D + immersive mode ([#240](https://github.com/ilv78/Art-World-Hub/issues/240))
- v3: Home page redesign ([#239](https://github.com/ilv78/Art-World-Hub/issues/239))
- v3: Footer component ([#238](https://github.com/ilv78/Art-World-Hub/issues/238))
- v3: Top navigation bar ([#237](https://github.com/ilv78/Art-World-Hub/issues/237))
- v3: Split layout shells (public + dashboard) ([#236](https://github.com/ilv78/Art-World-Hub/issues/236))
- Epic: Full UI Redesign (v3.0) ([#234](https://github.com/ilv78/Art-World-Hub/issues/234))
- Artworks to be featured in the first page ([#233](https://github.com/ilv78/Art-World-Hub/issues/233))

### Fixed
- fix: "release: next" label not removed after release ([#361](https://github.com/ilv78/Art-World-Hub/issues/361))
- Artist profile image scaling ([#359](https://github.com/ilv78/Art-World-Hub/issues/359))

## [3.4.0] - 2026-03-31

### Added
- Decided on color scheme ([#354](https://github.com/ilv78/Art-World-Hub/issues/354))
- Feature: Logo + Accent Palette Switcher ([#345](https://github.com/ilv78/Art-World-Hub/issues/345))
- In the main page I need a section for exhibitions ([#329](https://github.com/ilv78/Art-World-Hub/issues/329))
- For the main hero a trigger ([#318](https://github.com/ilv78/Art-World-Hub/issues/318))
- On mobile transform the bottom menu link from Gallery to Exhibitions ([#313](https://github.com/ilv78/Art-World-Hub/issues/313))
- Expected details of artwork but gallery page instead ([#312](https://github.com/ilv78/Art-World-Hub/issues/312))
- v3: Merge redesign/v3 branch into main (v3.0.0 release) ([#281](https://github.com/ilv78/Art-World-Hub/issues/281))
- v3: Rebrand (new name, logo, assets) ([#244](https://github.com/ilv78/Art-World-Hub/issues/244))
- v3: Mobile navigation ([#243](https://github.com/ilv78/Art-World-Hub/issues/243))
- v3: Other page improvements (artists, exhibitions, blog) ([#242](https://github.com/ilv78/Art-World-Hub/issues/242))
- v3: Store page grid improvements ([#241](https://github.com/ilv78/Art-World-Hub/issues/241))
- v3: Gallery page full-width 3D + immersive mode ([#240](https://github.com/ilv78/Art-World-Hub/issues/240))
- v3: Home page redesign ([#239](https://github.com/ilv78/Art-World-Hub/issues/239))
- v3: Footer component ([#238](https://github.com/ilv78/Art-World-Hub/issues/238))
- v3: Top navigation bar ([#237](https://github.com/ilv78/Art-World-Hub/issues/237))
- v3: Split layout shells (public + dashboard) ([#236](https://github.com/ilv78/Art-World-Hub/issues/236))
- Epic: Full UI Redesign (v3.0) ([#234](https://github.com/ilv78/Art-World-Hub/issues/234))
- Artworks to be featured in the first page ([#233](https://github.com/ilv78/Art-World-Hub/issues/233))

### Fixed
- mobile : when entering an exhibition use the 2d version ([#320](https://github.com/ilv78/Art-World-Hub/issues/320))
- Check UI , at page change new page is scrolled down ([#310](https://github.com/ilv78/Art-World-Hub/issues/310))
- Blog post image not visible in production ([#307](https://github.com/ilv78/Art-World-Hub/issues/307))
- fix: resolve 3 npm audit vulnerabilities (path-to-regexp, picomatch, brace-expansion) ([#305](https://github.com/ilv78/Art-World-Hub/issues/305))

### Security
- Security - secret scan ([#348](https://github.com/ilv78/Art-World-Hub/issues/348))

### Changed
- Remove color pallete chooser ([#314](https://github.com/ilv78/Art-World-Hub/issues/314))
- Login with Oauth after migration to vernis9.art ([#308](https://github.com/ilv78/Art-World-Hub/issues/308))
- 📋 Docs Audit: 2026-03-29 — 0 errors, 1 warnings, 0 info ([#300](https://github.com/ilv78/Art-World-Hub/issues/300))
- Rebuild and redeploy production to fix stale CHANGELOG.md ([#297](https://github.com/ilv78/Art-World-Hub/issues/297))
- Deploy smoke test: verify /api/version matches deployed tag ([#296](https://github.com/ilv78/Art-World-Hub/issues/296))
- CI: validate CHANGELOG.md contains entry for release version before tagging ([#295](https://github.com/ilv78/Art-World-Hub/issues/295))
- v3: Step 7 — Migrate production to vernis9.art domain ([#288](https://github.com/ilv78/Art-World-Hub/issues/288))
- v3: Step 6 — Post-deploy verification ([#287](https://github.com/ilv78/Art-World-Hub/issues/287))
- v3: Step 5 — Deploy to production ([#286](https://github.com/ilv78/Art-World-Hub/issues/286))
- v3: Step 4 — Version bump to v3.0.0 ([#285](https://github.com/ilv78/Art-World-Hub/issues/285))
- v3: Step 3 — Create merge PR (redesign/v3 → main) ([#284](https://github.com/ilv78/Art-World-Hub/issues/284))
- CI/CD: auto-merge passing PRs and auto-deploy on release ([#249](https://github.com/ilv78/Art-World-Hub/issues/249))

## [3.3.0] - 2026-03-30

### Added
- Feature: Logo + Accent Palette Switcher ([#345](https://github.com/ilv78/Art-World-Hub/issues/345))
- In the main page I need a section for exhibitions ([#329](https://github.com/ilv78/Art-World-Hub/issues/329))
- For the main hero a trigger ([#318](https://github.com/ilv78/Art-World-Hub/issues/318))
- On mobile transform the bottom menu link from Gallery to Exhibitions ([#313](https://github.com/ilv78/Art-World-Hub/issues/313))
- Expected details of artwork but gallery page instead ([#312](https://github.com/ilv78/Art-World-Hub/issues/312))
- v3: Merge redesign/v3 branch into main (v3.0.0 release) ([#281](https://github.com/ilv78/Art-World-Hub/issues/281))
- v3: Rebrand (new name, logo, assets) ([#244](https://github.com/ilv78/Art-World-Hub/issues/244))
- v3: Mobile navigation ([#243](https://github.com/ilv78/Art-World-Hub/issues/243))
- v3: Other page improvements (artists, exhibitions, blog) ([#242](https://github.com/ilv78/Art-World-Hub/issues/242))
- v3: Store page grid improvements ([#241](https://github.com/ilv78/Art-World-Hub/issues/241))
- v3: Gallery page full-width 3D + immersive mode ([#240](https://github.com/ilv78/Art-World-Hub/issues/240))
- v3: Home page redesign ([#239](https://github.com/ilv78/Art-World-Hub/issues/239))
- v3: Footer component ([#238](https://github.com/ilv78/Art-World-Hub/issues/238))
- v3: Top navigation bar ([#237](https://github.com/ilv78/Art-World-Hub/issues/237))
- v3: Split layout shells (public + dashboard) ([#236](https://github.com/ilv78/Art-World-Hub/issues/236))
- Epic: Full UI Redesign (v3.0) ([#234](https://github.com/ilv78/Art-World-Hub/issues/234))
- Artworks to be featured in the first page ([#233](https://github.com/ilv78/Art-World-Hub/issues/233))

### Fixed
- mobile : when entering an exhibition use the 2d version ([#320](https://github.com/ilv78/Art-World-Hub/issues/320))
- Check UI , at page change new page is scrolled down ([#310](https://github.com/ilv78/Art-World-Hub/issues/310))
- Blog post image not visible in production ([#307](https://github.com/ilv78/Art-World-Hub/issues/307))
- fix: resolve 3 npm audit vulnerabilities (path-to-regexp, picomatch, brace-expansion) ([#305](https://github.com/ilv78/Art-World-Hub/issues/305))

### Changed
- Remove color pallete chooser ([#314](https://github.com/ilv78/Art-World-Hub/issues/314))
- Login with Oauth after migration to vernis9.art ([#308](https://github.com/ilv78/Art-World-Hub/issues/308))
- 📋 Docs Audit: 2026-03-29 — 0 errors, 1 warnings, 0 info ([#300](https://github.com/ilv78/Art-World-Hub/issues/300))
- Rebuild and redeploy production to fix stale CHANGELOG.md ([#297](https://github.com/ilv78/Art-World-Hub/issues/297))
- Deploy smoke test: verify /api/version matches deployed tag ([#296](https://github.com/ilv78/Art-World-Hub/issues/296))
- CI: validate CHANGELOG.md contains entry for release version before tagging ([#295](https://github.com/ilv78/Art-World-Hub/issues/295))
- v3: Step 7 — Migrate production to vernis9.art domain ([#288](https://github.com/ilv78/Art-World-Hub/issues/288))
- v3: Step 6 — Post-deploy verification ([#287](https://github.com/ilv78/Art-World-Hub/issues/287))
- v3: Step 5 — Deploy to production ([#286](https://github.com/ilv78/Art-World-Hub/issues/286))
- v3: Step 4 — Version bump to v3.0.0 ([#285](https://github.com/ilv78/Art-World-Hub/issues/285))
- v3: Step 3 — Create merge PR (redesign/v3 → main) ([#284](https://github.com/ilv78/Art-World-Hub/issues/284))
- CI/CD: auto-merge passing PRs and auto-deploy on release ([#249](https://github.com/ilv78/Art-World-Hub/issues/249))

## [3.2.0] - 2026-03-29

### Added
- In the main page I need a section for exhibitions ([#329](https://github.com/ilv78/Art-World-Hub/issues/329))
- For the main hero a trigger ([#318](https://github.com/ilv78/Art-World-Hub/issues/318))
- On mobile transform the bottom menu link from Gallery to Exhibitions ([#313](https://github.com/ilv78/Art-World-Hub/issues/313))
- Expected details of artwork but gallery page instead ([#312](https://github.com/ilv78/Art-World-Hub/issues/312))
- v3: Merge redesign/v3 branch into main (v3.0.0 release) ([#281](https://github.com/ilv78/Art-World-Hub/issues/281))
- v3: Rebrand (new name, logo, assets) ([#244](https://github.com/ilv78/Art-World-Hub/issues/244))
- v3: Mobile navigation ([#243](https://github.com/ilv78/Art-World-Hub/issues/243))
- v3: Other page improvements (artists, exhibitions, blog) ([#242](https://github.com/ilv78/Art-World-Hub/issues/242))
- v3: Store page grid improvements ([#241](https://github.com/ilv78/Art-World-Hub/issues/241))
- v3: Gallery page full-width 3D + immersive mode ([#240](https://github.com/ilv78/Art-World-Hub/issues/240))
- v3: Home page redesign ([#239](https://github.com/ilv78/Art-World-Hub/issues/239))
- v3: Footer component ([#238](https://github.com/ilv78/Art-World-Hub/issues/238))
- v3: Top navigation bar ([#237](https://github.com/ilv78/Art-World-Hub/issues/237))
- v3: Split layout shells (public + dashboard) ([#236](https://github.com/ilv78/Art-World-Hub/issues/236))
- Epic: Full UI Redesign (v3.0) ([#234](https://github.com/ilv78/Art-World-Hub/issues/234))
- Artworks to be featured in the first page ([#233](https://github.com/ilv78/Art-World-Hub/issues/233))

### Fixed
- mobile : when entering an exhibition use the 2d version ([#320](https://github.com/ilv78/Art-World-Hub/issues/320))
- Check UI , at page change new page is scrolled down ([#310](https://github.com/ilv78/Art-World-Hub/issues/310))
- Blog post image not visible in production ([#307](https://github.com/ilv78/Art-World-Hub/issues/307))
- fix: resolve 3 npm audit vulnerabilities (path-to-regexp, picomatch, brace-expansion) ([#305](https://github.com/ilv78/Art-World-Hub/issues/305))

### Changed
- Remove color pallete chooser ([#314](https://github.com/ilv78/Art-World-Hub/issues/314))
- Login with Oauth after migration to vernis9.art ([#308](https://github.com/ilv78/Art-World-Hub/issues/308))
- 📋 Docs Audit: 2026-03-29 — 0 errors, 1 warnings, 0 info ([#300](https://github.com/ilv78/Art-World-Hub/issues/300))
- Rebuild and redeploy production to fix stale CHANGELOG.md ([#297](https://github.com/ilv78/Art-World-Hub/issues/297))
- Deploy smoke test: verify /api/version matches deployed tag ([#296](https://github.com/ilv78/Art-World-Hub/issues/296))
- CI: validate CHANGELOG.md contains entry for release version before tagging ([#295](https://github.com/ilv78/Art-World-Hub/issues/295))
- v3: Step 7 — Migrate production to vernis9.art domain ([#288](https://github.com/ilv78/Art-World-Hub/issues/288))
- v3: Step 6 — Post-deploy verification ([#287](https://github.com/ilv78/Art-World-Hub/issues/287))
- v3: Step 5 — Deploy to production ([#286](https://github.com/ilv78/Art-World-Hub/issues/286))
- v3: Step 4 — Version bump to v3.0.0 ([#285](https://github.com/ilv78/Art-World-Hub/issues/285))
- v3: Step 3 — Create merge PR (redesign/v3 → main) ([#284](https://github.com/ilv78/Art-World-Hub/issues/284))
- CI/CD: auto-merge passing PRs and auto-deploy on release ([#249](https://github.com/ilv78/Art-World-Hub/issues/249))

## [3.1.0] - 2026-03-29

### Added
- For the main hero a trigger ([#318](https://github.com/ilv78/Art-World-Hub/issues/318))
- On mobile transform the bottom menu link from Gallery to Exhibitions ([#313](https://github.com/ilv78/Art-World-Hub/issues/313))
- Expected details of artwork but gallery page instead ([#312](https://github.com/ilv78/Art-World-Hub/issues/312))
- v3: Merge redesign/v3 branch into main (v3.0.0 release) ([#281](https://github.com/ilv78/Art-World-Hub/issues/281))
- v3: Rebrand (new name, logo, assets) ([#244](https://github.com/ilv78/Art-World-Hub/issues/244))
- v3: Mobile navigation ([#243](https://github.com/ilv78/Art-World-Hub/issues/243))
- v3: Other page improvements (artists, exhibitions, blog) ([#242](https://github.com/ilv78/Art-World-Hub/issues/242))
- v3: Store page grid improvements ([#241](https://github.com/ilv78/Art-World-Hub/issues/241))
- v3: Gallery page full-width 3D + immersive mode ([#240](https://github.com/ilv78/Art-World-Hub/issues/240))
- v3: Home page redesign ([#239](https://github.com/ilv78/Art-World-Hub/issues/239))
- v3: Footer component ([#238](https://github.com/ilv78/Art-World-Hub/issues/238))
- v3: Top navigation bar ([#237](https://github.com/ilv78/Art-World-Hub/issues/237))
- v3: Split layout shells (public + dashboard) ([#236](https://github.com/ilv78/Art-World-Hub/issues/236))
- Epic: Full UI Redesign (v3.0) ([#234](https://github.com/ilv78/Art-World-Hub/issues/234))
- Artworks to be featured in the first page ([#233](https://github.com/ilv78/Art-World-Hub/issues/233))

### Fixed
- mobile : when entering an exhibition use the 2d version ([#320](https://github.com/ilv78/Art-World-Hub/issues/320))
- Check UI , at page change new page is scrolled down ([#310](https://github.com/ilv78/Art-World-Hub/issues/310))
- Blog post image not visible in production ([#307](https://github.com/ilv78/Art-World-Hub/issues/307))
- fix: resolve 3 npm audit vulnerabilities (path-to-regexp, picomatch, brace-expansion) ([#305](https://github.com/ilv78/Art-World-Hub/issues/305))

### Changed
- Remove color pallete chooser ([#314](https://github.com/ilv78/Art-World-Hub/issues/314))
- Login with Oauth after migration to vernis9.art ([#308](https://github.com/ilv78/Art-World-Hub/issues/308))
- 📋 Docs Audit: 2026-03-29 — 0 errors, 1 warnings, 0 info ([#300](https://github.com/ilv78/Art-World-Hub/issues/300))
- Rebuild and redeploy production to fix stale CHANGELOG.md ([#297](https://github.com/ilv78/Art-World-Hub/issues/297))
- Deploy smoke test: verify /api/version matches deployed tag ([#296](https://github.com/ilv78/Art-World-Hub/issues/296))
- CI: validate CHANGELOG.md contains entry for release version before tagging ([#295](https://github.com/ilv78/Art-World-Hub/issues/295))
- v3: Step 7 — Migrate production to vernis9.art domain ([#288](https://github.com/ilv78/Art-World-Hub/issues/288))
- v3: Step 6 — Post-deploy verification ([#287](https://github.com/ilv78/Art-World-Hub/issues/287))
- v3: Step 5 — Deploy to production ([#286](https://github.com/ilv78/Art-World-Hub/issues/286))
- v3: Step 4 — Version bump to v3.0.0 ([#285](https://github.com/ilv78/Art-World-Hub/issues/285))
- v3: Step 3 — Create merge PR (redesign/v3 → main) ([#284](https://github.com/ilv78/Art-World-Hub/issues/284))
- CI/CD: auto-merge passing PRs and auto-deploy on release ([#249](https://github.com/ilv78/Art-World-Hub/issues/249))

## [3.0.0] - 2026-03-29

### Added
- Full UI redesign: top navigation bar, footer, mobile bottom tabs, PublicLayout shell ([#236](https://github.com/ilv78/Art-World-Hub/issues/236), [#237](https://github.com/ilv78/Art-World-Hub/issues/237), [#238](https://github.com/ilv78/Art-World-Hub/issues/238), [#243](https://github.com/ilv78/Art-World-Hub/issues/243))
- Home page redesign with hero carousel, horizontal artwork shelves, content sections ([#239](https://github.com/ilv78/Art-World-Hub/issues/239))
- Gallery full-width 3D rendering + immersive fullscreen mode ([#240](https://github.com/ilv78/Art-World-Hub/issues/240))
- Store, Artists, Exhibitions, Blog page redesigns ([#241](https://github.com/ilv78/Art-World-Hub/issues/241), [#242](https://github.com/ilv78/Art-World-Hub/issues/242))
- Newsletter signup with admin management ([#254](https://github.com/ilv78/Art-World-Hub/issues/254))
- Privacy Policy and Terms of Service pages ([#253](https://github.com/ilv78/Art-World-Hub/issues/253))
- Preview environment for redesign branches ([#235](https://github.com/ilv78/Art-World-Hub/issues/235))
- Auto-merge workflow for owner PRs ([#249](https://github.com/ilv78/Art-World-Hub/issues/249))

### Changed
- **Rebrand: ArtVerse → Vernis9** — new brand name (from "vernissage"), Tenor Sans brand font, SVG favicon with V9 mark, contact emails on `@vernis9.art` domain ([#244](https://github.com/ilv78/Art-World-Hub/issues/244))
- Privacy policy updated to EU-wide (EDPB) supervisory authority ([#272](https://github.com/ilv78/Art-World-Hub/issues/272))

### Database
- Migration `0006`: `newsletter_subscribers` table

## [2.7.0] - 2026-03-24

### Added
- We will need a curator profile editor ([#164](https://github.com/ilv78/Art-World-Hub/issues/164))

## [2.6.0] - 2026-03-24

### Added
- Migrate Zod v3 → v4 ([#198](https://github.com/ilv78/Art-World-Hub/issues/198))
- Migrate react-day-picker v8 → v9 ([#197](https://github.com/ilv78/Art-World-Hub/issues/197))
- Migrate Tailwind CSS v3 → v4 ([#196](https://github.com/ilv78/Art-World-Hub/issues/196))

### Fixed
- Remove seed functionality from codebase ([#181](https://github.com/ilv78/Art-World-Hub/issues/181))
- Upgrade react-resizable-panels from 2.x to 4.x ([#74](https://github.com/ilv78/Art-World-Hub/issues/74))
- Upgrade Node.js from 20 to 25 in Docker image ([#73](https://github.com/ilv78/Art-World-Hub/issues/73))

### Security
- 🔴 Security Audit — Critical findings require immediate action ([#77](https://github.com/ilv78/Art-World-Hub/issues/77))

## [2.5.0] - 2026-03-23

### Added
- multiple gallery templates ([#14](https://github.com/ilv78/Art-World-Hub/issues/14))

## [2.4.0] - 2026-03-20

### Added
- Store system - umbrella ([#170](https://github.com/ilv78/Art-World-Hub/issues/170))

### Fixed
- Fix high-severity npm audit vulnerability in flatted ([#177](https://github.com/ilv78/Art-World-Hub/issues/177))
- Mobile adaptation ([#172](https://github.com/ilv78/Art-World-Hub/issues/172))
- Order cannot be submited ([#171](https://github.com/ilv78/Art-World-Hub/issues/171))

## [2.3.0] - 2026-03-18

### Added
- Role gallery curator ([#7](https://github.com/ilv78/Art-World-Hub/issues/7))

### Fixed
- Upgrade recharts from 2.x to 3.x ([#75](https://github.com/ilv78/Art-World-Hub/issues/75))
- in the museum gallery correct names ([#32](https://github.com/ilv78/Art-World-Hub/issues/32))

## [2.2.1] - 2026-03-17

### Fixed
- in the museum gallery correct names ([#32](https://github.com/ilv78/Art-World-Hub/issues/32))

## [2.2.0] - 2026-03-15

### Added
- Add in the website details about changelog / release number ([#121](https://github.com/ilv78/Art-World-Hub/issues/121))
- Logging infrastructure ([#39](https://github.com/ilv78/Art-World-Hub/issues/39))

### Fixed
- Prices adjustments in UI. ([#130](https://github.com/ilv78/Art-World-Hub/issues/130))
- Artwork missing in museum gallery ([#128](https://github.com/ilv78/Art-World-Hub/issues/128))
- users vs artists in ArtVerse ([#122](https://github.com/ilv78/Art-World-Hub/issues/122))
- Remove GitHub authentication inside ArtVerse ([#95](https://github.com/ilv78/Art-World-Hub/issues/95))

### Added
- Release version and changelog link in homepage footer ([#121](https://github.com/ilv78/Art-World-Hub/issues/121))
- Public `/changelog` page rendering full changelog with markdown formatting ([#121](https://github.com/ilv78/Art-World-Hub/issues/121))
- `GET /api/version` and `GET /api/changelog` endpoints ([#121](https://github.com/ilv78/Art-World-Hub/issues/121))
### Fixed
- Removed stale GitHub authentication reference from artist dashboard ([#95](https://github.com/ilv78/Art-World-Hub/issues/95))

## [2.1.0] - 2026-03-14

### Added
- Automated release workflow with label-based version detection ([#110](https://github.com/ilv78/Art-World-Hub/issues/110))
- Create admin section ([#8](https://github.com/ilv78/Art-World-Hub/issues/8))
- Email login: magic link signup (Resend) + email/password signin ([#6](https://github.com/ilv78/Art-World-Hub/issues/6))
- Profile picture upload for artists ([#12](https://github.com/ilv78/Art-World-Hub/issues/12))
- Release management system: Docker image tagging, health checks, smoke tests, git release tags ([#35](https://github.com/ilv78/Art-World-Hub/issues/35))
- Security CI/CD pipeline: gitleaks, npm audit, Semgrep, hadolint, Trivy, custom checks ([#55](https://github.com/ilv78/Art-World-Hub/issues/55))
- Auto-update issue tracker on issue closure ([#89](https://github.com/ilv78/Art-World-Hub/issues/89))
- Pre-push hook to block direct pushes to main ([#101](https://github.com/ilv78/Art-World-Hub/issues/101))
- Postmortem workflow and template ([#98](https://github.com/ilv78/Art-World-Hub/issues/98))
- Documentation agent spec, backfill, and restructured specs directory ([#5](https://github.com/ilv78/Art-World-Hub/issues/5), [#40](https://github.com/ilv78/Art-World-Hub/issues/40), [#41](https://github.com/ilv78/Art-World-Hub/issues/41), [#42](https://github.com/ilv78/Art-World-Hub/issues/42))

### Fixed
- CI/CD - minor failures ([#104](https://github.com/ilv78/Art-World-Hub/issues/104))
- Magic link emails not being sent ([#34](https://github.com/ilv78/Art-World-Hub/issues/34))
- Resend sender address — changed from sandbox to gallery@idata.ro ([#37](https://github.com/ilv78/Art-World-Hub/issues/37))

### Security
- Auth added to 9 unprotected write endpoints ([#78](https://github.com/ilv78/Art-World-Hub/issues/78))
- Order endpoints locked down to prevent PII exposure ([#79](https://github.com/ilv78/Art-World-Hub/issues/79))
- MCP server endpoint secured with authentication ([#80](https://github.com/ilv78/Art-World-Hub/issues/80))
- SSRF vulnerability fixed in image proxy endpoint ([#81](https://github.com/ilv78/Art-World-Hub/issues/81))
- P1 hardening: Helmet headers, email HTML escaping, Zod PATCH validation, magic byte upload validation, Actions SHA pinning, shell injection fixes ([#77](https://github.com/ilv78/Art-World-Hub/issues/77))

### Changed
- Role securitas - in CI/CD ([#36](https://github.com/ilv78/Art-World-Hub/issues/36))
- Refactored auth, email, and frontend code to consolidate duplications ([#53](https://github.com/ilv78/Art-World-Hub/issues/53))
- Google OAuth moved from `/api/login` to `/api/login/google`
- Resend email integration refactored to use `RESEND_API_KEY` env var

## [2.0.0] - 2026-03-11

### Added
- Full CI/CD pipeline: lint, type check, tests, build, Docker image, staging deploy ([#20](https://github.com/ilv78/Art-World-Hub/issues/20))
- Vitest test infrastructure with storage and route tests
- PostgreSQL migrations with Drizzle Kit (dual-mode: push for staging, migrate for production)
- Production deploy workflow with rollback capability
- Rollback workflow (one-click)
- Telegram notifications on deploy/rollback events
- Architecture specification document
- Development procedures and CI/CD spec

### Fixed
- Classic view gallery navigation arrows ([#9](https://github.com/ilv78/Art-World-Hub/issues/9))
- Google OAuth login flow ([#11](https://github.com/ilv78/Art-World-Hub/issues/11))
- Blog route SPA 404 errors ([#19](https://github.com/ilv78/Art-World-Hub/issues/19))
- Missing artworks in gallery display ([#25](https://github.com/ilv78/Art-World-Hub/issues/25))
- Museum gallery stale layout data ([#28](https://github.com/ilv78/Art-World-Hub/issues/28))

### Changed
- Color palette updated ([#1](https://github.com/ilv78/Art-World-Hub/issues/1))
- Image storage refactored ([#3](https://github.com/ilv78/Art-World-Hub/issues/3))
- Upload code deduplicated ([#17](https://github.com/ilv78/Art-World-Hub/issues/17))
- Telegram notification format improved ([#26](https://github.com/ilv78/Art-World-Hub/issues/26))

## [1.3.0] - 2026-02-24

### Changed
- Published app update

## [1.2.1] - 2026-02-24

### Added
- Docker deployment
- Google OIDC authentication
- Safer user upsert logic

## [1.2.0] - 2026-02-22

### Added
- Initial published application
