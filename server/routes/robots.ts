import { Router } from "express";

const router = Router();
const SITE_URL = process.env.SITE_URL || "https://vernis9.art";
const PRODUCTION_URL = "https://vernis9.art";
const isProduction = SITE_URL === PRODUCTION_URL;

const productionRobots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /auth
Disallow: /dashboard
Disallow: /curator

Sitemap: ${PRODUCTION_URL}/sitemap.xml
`;

// Allow fetching (so Google Rich Results Test works) but omit Sitemap
// so crawlers aren't guided to discover content. The noindex meta tag
// and X-Robots-Tag header prevent actual indexing.
const nonProductionRobots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /auth
Disallow: /dashboard
Disallow: /curator
`;

router.get("/robots.txt", (_req, res) => {
  res.set("Content-Type", "text/plain");
  res.send(isProduction ? productionRobots : nonProductionRobots);
});

export default router;
