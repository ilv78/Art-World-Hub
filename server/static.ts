import express, { type Express, type Request } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

const SITE_URL = process.env.SITE_URL || "https://vernis9.art";

const DEFAULT_TITLE = "Vernis9 — Virtual Art Gallery & Marketplace";
const DEFAULT_DESCRIPTION =
  "Experience art like never before. Explore our immersive 3D virtual gallery, discover stunning artworks from talented artists, and participate in exclusive auctions.";

interface PageMeta {
  title: string;
  description: string;
  ogType: string;
  image: string;
  url: string;
}

function defaultMeta(reqPath: string): PageMeta {
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    ogType: "website",
    image: `${SITE_URL}/og-default.png`,
    url: `${SITE_URL}${reqPath}`,
  };
}

const STATIC_ROUTES: Record<string, Partial<PageMeta>> = {
  "/": {},
  "/store": { title: "Art Store — Vernis9" },
  "/gallery": { title: "3D Virtual Gallery — Vernis9" },
  "/exhibitions": { title: "Exhibitions — Vernis9" },
  "/auctions": { title: "Auctions — Vernis9" },
  "/artists": { title: "Artists — Vernis9" },
  "/blog": { title: "Blog — Vernis9" },
  "/dashboard": { title: "Artist Dashboard — Vernis9" },
  "/auth": { title: "Sign In — Vernis9" },
  "/changelog": { title: "Changelog — Vernis9" },
  "/privacy": { title: "Privacy Policy — Vernis9" },
  "/terms": { title: "Terms of Service — Vernis9" },
};

async function getMetaForRequest(req: Request): Promise<PageMeta> {
  const reqPath = req.originalUrl.split("?")[0];
  const meta = defaultMeta(reqPath);

  // Static routes
  if (reqPath in STATIC_ROUTES) {
    const overrides = STATIC_ROUTES[reqPath];
    return { ...meta, ...overrides };
  }

  // Artist profile: /artists/:id
  const artistMatch = reqPath.match(/^\/artists\/([^/]+)$/);
  if (artistMatch) {
    try {
      const artist = await storage.getArtist(artistMatch[1]);
      if (artist) {
        meta.title = `${artist.name} — Vernis9`;
        meta.description = artist.bio
          ? artist.bio.slice(0, 160)
          : `Explore ${artist.name}'s artwork on Vernis9`;
        meta.ogType = "profile";
        if (artist.avatarUrl) {
          meta.image = artist.avatarUrl.startsWith("http")
            ? artist.avatarUrl
            : `${SITE_URL}${artist.avatarUrl}`;
        }
      }
    } catch {
      // fall through to defaults
    }
    return meta;
  }

  // Blog post: /blog/:id
  const blogMatch = reqPath.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    try {
      const post = await storage.getBlogPost(blogMatch[1]);
      if (post) {
        meta.title = `${post.title} — Vernis9 Blog`;
        meta.description = post.excerpt
          ? post.excerpt.slice(0, 160)
          : `Read "${post.title}" on the Vernis9 blog`;
        meta.ogType = "article";
        if (post.coverImageUrl) {
          meta.image = post.coverImageUrl.startsWith("http")
            ? post.coverImageUrl
            : `${SITE_URL}${post.coverImageUrl}`;
        }
      }
    } catch {
      // fall through to defaults
    }
    return meta;
  }

  return meta;
}

function injectMeta(html: string, meta: PageMeta): string {
  return html
    .replaceAll("__META_TITLE__", escapeHtml(meta.title))
    .replaceAll("__META_DESCRIPTION__", escapeHtml(meta.description))
    .replaceAll("__META_OG_TYPE__", escapeHtml(meta.ogType))
    .replaceAll("__META_IMAGE__", escapeHtml(meta.image))
    .replaceAll("__META_URL__", escapeHtml(meta.url));
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Read index.html template once at startup
  const indexHtml = fs.readFileSync(
    path.resolve(distPath, "index.html"),
    "utf-8",
  );

  app.use(express.static(distPath, { index: false }));

  // Catch-all: inject meta tags and serve index.html
  app.use("/{*path}", async (req, res) => {
    const meta = await getMetaForRequest(req);
    const html = injectMeta(indexHtml, meta);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });
}
