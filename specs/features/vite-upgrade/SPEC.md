# Vite 8 Upgrade Spec

**Issue:** [#76](https://github.com/ilv78/Art-World-Hub/issues/76)
**Status:** Step 1 complete, Step 2 blocked on upstream fix

## Overview

Upgrade the Vite build system from Vite 7 + esbuild/Rollup to Vite 8 + Rolldown (Rust bundler). The upgrade is split into two steps to isolate bundler engine changes from API changes.

## Two-Step Strategy

### Step 1: Switch to rolldown-vite (DONE)

Replace Vite's internal esbuild+Rollup bundler with Rolldown while keeping the Vite 7 API surface. This validates Rolldown engine compatibility without hitting the Vite 8 dep optimizer bug.

**Package:** `rolldown-vite@7.3.1` (dev dependency)

**Changes:**
- `vite.config.ts` — import `defineConfig` from `rolldown-vite`
- `server/vite.ts` — import `createServer`, `createLogger` from `rolldown-vite`
- `script/build.ts` — import `build` from `rolldown-vite`
- `vite.config.ts` — set `build.cssMinify: "esbuild"` (see CSS Compatibility below)

**Not changed:**
- `vitest.config.ts` — imports from `vitest/config`, unaffected
- `@vitejs/plugin-react` — stays at v4 (produces a harmless `optimizeDeps.esbuildOptions` deprecation warning)
- `esbuild` — still used independently for server bundling in `script/build.ts`
- `vite` package — kept as-is; `rolldown-vite` provides its own Vite build

### Step 2: Upgrade to Vite 8 proper (BLOCKED)

**Blocker:** Vite 8.0.2 has an unstable dep optimizer in middleware mode — `browserHash` changes on every request, causing 504 "Outdated Optimize Dep" errors. Our dev server uses middleware mode (`server/vite.ts`).

**When:** Vite >= 8.0.3 with the fix.

**Scope:**
- Replace `rolldown-vite` with `vite@^8`
- Upgrade `@vitejs/plugin-react` to v5
- Upgrade `vitest` to v4
- Migrate `rollupOptions` to `rolldownOptions` if any are added
- Fix CSS selector issues for LightningCSS compatibility
- Remove `build.cssMinify: "esbuild"` override

## CSS Compatibility

Rolldown uses LightningCSS for CSS minification by default, which is stricter than esbuild's CSS minifier. Our Tailwind v3 output contains a selector that LightningCSS cannot parse:

```
.after\:border.toggle-elevate::after::before { ... }
```

This is a double pseudo-element (`::after::before`) generated when Tailwind's `after:border` variant interacts with our custom `.border.toggle-elevate::before` utility rule. esbuild's minifier tolerates this; LightningCSS rejects it.

**Step 1 fix:** `build.cssMinify: "esbuild"` — use the same CSS minifier as stock Vite 7.
**Step 2 fix:** Either fix the source CSS to avoid the double pseudo-element, or migrate to Tailwind v4 which generates cleaner output.

## Verification

| Check | Step 1 Result |
|-------|--------------|
| `npm run check` (tsc) | Pass |
| `npm test` (52 tests) | Pass |
| `npm run build` | Pass (CSS 120 KB / 18.3 KB gzip, JS 1353 KB / 373 KB gzip) |
| Dev server (middleware mode) | Pending manual test |
| HMR | Pending manual test |
| 3D gallery | Pending manual test |
