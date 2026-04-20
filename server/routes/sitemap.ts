import { Router } from "express";
import { storage } from "../storage";
import { logger } from "../logger";

const router = Router();
const SITE_URL = process.env.SITE_URL || "https://vernis9.art";
const CAPTION_MAX = 500;
const TITLE_MAX = 100;

let sitemapCache: { xml: string; expires: number } | null = null;

export function __resetSitemapCacheForTests() {
  sitemapCache = null;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

function absolutize(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function imageBlock(loc: string, title?: string, caption?: string): string {
  const parts = [`    <image:image>`, `      <image:loc>${xmlEscape(absolutize(loc))}</image:loc>`];
  if (title) parts.push(`      <image:title>${xmlEscape(truncate(title, TITLE_MAX))}</image:title>`);
  if (caption) parts.push(`      <image:caption>${xmlEscape(truncate(caption, CAPTION_MAX))}</image:caption>`);
  parts.push(`    </image:image>`);
  return parts.join("\n");
}

router.get("/sitemap.xml", async (_req, res) => {
  const now = Date.now();
  if (sitemapCache && now < sitemapCache.expires) {
    res.set("Content-Type", "application/xml");
    return res.send(sitemapCache.xml);
  }

  try {
    const [artists, blogPosts, artworks] = await Promise.all([
      storage.getArtists(),
      storage.getAllBlogPosts(),
      storage.getArtworks(),
    ]);

    const staticRoutes = [
      { path: "/", changefreq: "weekly", priority: "1.0" },
      { path: "/gallery", changefreq: "weekly", priority: "0.9" },
      { path: "/exhibitions", changefreq: "weekly", priority: "0.8" },
      { path: "/store", changefreq: "weekly", priority: "0.8" },
      { path: "/auctions", changefreq: "daily", priority: "0.8" },
      { path: "/artists", changefreq: "weekly", priority: "0.8" },
      { path: "/blog", changefreq: "weekly", priority: "0.7" },
      { path: "/privacy", changefreq: "yearly", priority: "0.3" },
      { path: "/terms", changefreq: "yearly", priority: "0.3" },
      { path: "/changelog", changefreq: "monthly", priority: "0.3" },
    ];

    const urls = staticRoutes.map(
      (r) =>
        `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`
    );

    for (const artist of artists) {
      const lines = [
        `  <url>`,
        `    <loc>${SITE_URL}/artists/${artist.id}</loc>`,
        `    <changefreq>monthly</changefreq>`,
        `    <priority>0.7</priority>`,
      ];
      if (artist.avatarUrl) {
        lines.push(imageBlock(artist.avatarUrl, artist.name));
      }
      lines.push(`  </url>`);
      urls.push(lines.join("\n"));
    }

    for (const artwork of artworks) {
      const lines = [
        `  <url>`,
        `    <loc>${SITE_URL}/artworks/${artwork.slug}</loc>`,
        `    <changefreq>monthly</changefreq>`,
        `    <priority>0.6</priority>`,
        imageBlock(artwork.imageUrl, artwork.title, artwork.description),
        `  </url>`,
      ];
      urls.push(lines.join("\n"));
    }

    const publishedPosts = blogPosts.filter((p) => p.isPublished);
    for (const post of publishedPosts) {
      const lastmod = post.updatedAt.toISOString().split("T")[0];
      const lines = [
        `  <url>`,
        `    <loc>${SITE_URL}/blog/${post.id}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>monthly</changefreq>`,
        `    <priority>0.6</priority>`,
      ];
      if (post.coverImageUrl) {
        lines.push(imageBlock(post.coverImageUrl, post.title));
      }
      lines.push(`  </url>`);
      urls.push(lines.join("\n"));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>`;

    sitemapCache = { xml, expires: now + 60 * 60 * 1000 };
    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    logger.error({ error }, "Failed to generate sitemap");
    res.status(500).send("Failed to generate sitemap");
  }
});

export default router;
