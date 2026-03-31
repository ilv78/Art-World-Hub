import { Router } from "express";
import { storage } from "../storage";
import { logger } from "../logger";

const router = Router();
const SITE_URL = process.env.SITE_URL || "https://vernis9.art";
let sitemapCache: { xml: string; expires: number } | null = null;

router.get("/sitemap.xml", async (_req, res) => {
  const now = Date.now();
  if (sitemapCache && now < sitemapCache.expires) {
    res.set("Content-Type", "application/xml");
    return res.send(sitemapCache.xml);
  }

  try {
    const [artists, blogPosts] = await Promise.all([
      storage.getArtists(),
      storage.getAllBlogPosts(),
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
      urls.push(
        `  <url>\n    <loc>${SITE_URL}/artists/${artist.id}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
      );
    }

    const publishedPosts = blogPosts.filter((p) => p.isPublished);
    for (const post of publishedPosts) {
      const lastmod = post.updatedAt.toISOString().split("T")[0];
      urls.push(
        `  <url>\n    <loc>${SITE_URL}/blog/${post.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

    sitemapCache = { xml, expires: now + 60 * 60 * 1000 };
    res.set("Content-Type", "application/xml");
    res.send(xml);
  } catch (error) {
    logger.error({ error }, "Failed to generate sitemap");
    res.status(500).send("Failed to generate sitemap");
  }
});

export default router;
