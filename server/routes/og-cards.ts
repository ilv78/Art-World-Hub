import { Router } from "express";
import path from "path";
import fs from "fs/promises";
import { storage } from "../storage";
import { composeOgCard } from "../lib/og-card";
import { logger } from "../logger";

const router = Router();

const VALID_TYPES = ["artwork", "blog", "exhibition", "artist"] as const;
type ItemType = (typeof VALID_TYPES)[number];

// Paths derived from process.cwd() are computed per-request rather than at
// module load: tests chdir to a tmp dir after importing the router, so
// caching a startup-time absolute path would leak writes into the real repo.
function cacheDir(): string {
  return path.join(process.cwd(), "uploads", "og-cards");
}
function defaultOgImagePath(): string {
  return path.join(process.cwd(), "client", "public", "og-default.png");
}
const CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface CardSpec {
  /** Absolute filesystem path to the source image, or null when none is available. */
  sourceImagePath: string | null;
  title: string;
  subtitle?: string;
}

/**
 * Translates a stored asset URL (e.g. `/uploads/artworks/abc-960.jpg`) into
 * an absolute filesystem path. External URLs (http/https) and missing values
 * return null — the caller falls back to a solid-color background.
 */
function resolveAssetPath(assetUrl: string | null | undefined): string | null {
  if (!assetUrl) return null;
  if (/^https?:\/\//i.test(assetUrl)) return null;
  if (!assetUrl.startsWith("/uploads/")) return null;
  return path.join(process.cwd(), assetUrl.replace(/^\//, ""));
}

async function resolveCardSpec(type: ItemType, id: string): Promise<CardSpec | null> {
  if (type === "artwork") {
    const artwork = await storage.getPublishedArtworkBySlug(id);
    if (!artwork) return null;
    return {
      sourceImagePath: resolveAssetPath(artwork.imageUrl),
      title: artwork.title,
      subtitle: `by ${artwork.artist.name}`,
    };
  }
  if (type === "blog") {
    const post = await storage.getBlogPost(id);
    if (!post || !post.isPublished) return null;
    return {
      sourceImagePath: resolveAssetPath(post.coverImageUrl),
      title: post.title,
      subtitle: post.artist?.name ? `by ${post.artist.name}` : undefined,
    };
  }
  if (type === "exhibition") {
    const gallery = await storage.getCuratorGallery(id);
    if (!gallery) return null;
    const heroArtwork = gallery.artworks?.[0];
    const curatorName =
      [gallery.curator?.firstName, gallery.curator?.lastName]
        .filter(Boolean)
        .join(" ") || "Vernis9";
    return {
      sourceImagePath: resolveAssetPath(heroArtwork?.imageUrl),
      title: gallery.name,
      subtitle: `Curated by ${curatorName}`,
    };
  }
  if (type === "artist") {
    const artist = await storage.getArtistBySlug(id);
    if (!artist) return null;
    return {
      sourceImagePath: resolveAssetPath(artist.avatarUrl),
      title: artist.name,
      subtitle: artist.specialization ?? undefined,
    };
  }
  return null;
}

async function readDefaultOgImage(): Promise<Buffer> {
  return fs.readFile(defaultOgImagePath());
}

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(cacheDir(), { recursive: true });
}

function cachePathFor(type: ItemType, id: string): string {
  // id is either a UUID or a URL-slug; both are filename-safe but we still
  // strip path separators defensively to prevent traversal.
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(cacheDir(), `${type}-${safeId}.jpg`);
}

async function statMtimeOrNull(filePath: string): Promise<number | null> {
  try {
    const s = await fs.stat(filePath);
    return s.mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Cache is fresh when:
 *   - the cache file exists, AND
 *   - either no source image exists (nothing can change) OR the cached file
 *     is at least as new as the source image on disk.
 *
 * Source-image mtime is the only reliable change signal we have without a
 * table-level `updatedAt` column on artworks/artists. Title/subtitle text
 * changes won't bust cache automatically — but they're rare, and shipping
 * an admin-side cache flush is out of scope here. The 30-day Cache-Control
 * TTL is the long-tail safety net.
 */
async function isCacheFresh(
  cachePath: string,
  sourceImagePath: string | null,
): Promise<boolean> {
  const cacheMtime = await statMtimeOrNull(cachePath);
  if (cacheMtime === null) return false;
  if (!sourceImagePath) return true;
  const sourceMtime = await statMtimeOrNull(sourceImagePath);
  if (sourceMtime === null) return true;
  return cacheMtime >= sourceMtime;
}

router.get("/api/og/:type/:id.jpg", async (req, res) => {
  const { type, id } = req.params as { type: string; id: string };

  // Helmet's default Cross-Origin-Resource-Policy is `same-origin`, which
  // blocks Facebook/X/LinkedIn from embedding the image inside their
  // social-preview UI (cross-origin embed). The whole point of an og:image
  // is to be embedded cross-origin, so override here.
  res.set("Cross-Origin-Resource-Policy", "cross-origin");

  if (!VALID_TYPES.includes(type as ItemType)) {
    // Unknown type — serve the default card so social crawlers always get
    // something instead of an HTML 404 page.
    try {
      const buf = await readDefaultOgImage();
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}`);
      return res.send(buf);
    } catch {
      return res.status(404).end();
    }
  }

  const itemType = type as ItemType;

  try {
    const spec = await resolveCardSpec(itemType, id);
    if (!spec) {
      // Item not found — serve the default. Short TTL because the item may
      // appear later (publish toggle, slug rename redirect, etc.).
      const buf = await readDefaultOgImage();
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=300");
      return res.send(buf);
    }

    await ensureCacheDir();
    const cachePath = cachePathFor(itemType, id);

    if (await isCacheFresh(cachePath, spec.sourceImagePath)) {
      const buf = await fs.readFile(cachePath);
      res.set("Content-Type", "image/jpeg");
      res.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}`);
      res.set("X-OG-Cache", "hit");
      return res.send(buf);
    }

    const buf = await composeOgCard({
      sourceImagePath: spec.sourceImagePath,
      title: spec.title,
      subtitle: spec.subtitle,
    });
    await fs.writeFile(cachePath, buf);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}`);
    res.set("X-OG-Cache", "miss");
    return res.send(buf);
  } catch (err) {
    logger.warn(
      { err, type: itemType, id },
      "og-card composition failed; serving default",
    );
    try {
      const buf = await readDefaultOgImage();
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "public, max-age=300");
      return res.send(buf);
    } catch {
      return res.status(500).end();
    }
  }
});

export default router;
