import { storage } from "./storage";

const SITE_URL = process.env.SITE_URL || "https://vernis9.art";
const DEFAULT_TITLE = "Vernis9 \u2014 Virtual Art Gallery & Marketplace";
const DEFAULT_DESCRIPTION =
  "Experience art like never before. Explore our immersive 3D virtual gallery, discover stunning artworks from talented artists, and participate in exclusive auctions.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.png`;

interface MetaTags {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogType: string;
  ogUrl: string;
  ogImage: string;
}

const STATIC_ROUTES: Record<string, Pick<MetaTags, "title" | "ogType">> = {
  "/": { title: DEFAULT_TITLE, ogType: "website" },
  "/gallery": { title: "3D Virtual Gallery \u2014 Vernis9", ogType: "website" },
  "/exhibitions": { title: "Exhibitions \u2014 Vernis9", ogType: "website" },
  "/store": { title: "Art Store \u2014 Vernis9", ogType: "website" },
  "/auctions": { title: "Auctions \u2014 Vernis9", ogType: "website" },
  "/artists": { title: "Artists \u2014 Vernis9", ogType: "website" },
  "/blog": { title: "Blog \u2014 Vernis9", ogType: "website" },
  "/changelog": { title: "Changelog \u2014 Vernis9", ogType: "website" },
  "/privacy": { title: "Privacy Policy \u2014 Vernis9", ogType: "website" },
  "/terms": { title: "Terms of Service \u2014 Vernis9", ogType: "website" },
};

/** Strip query string and hash, normalize trailing slash */
function normalizePath(url: string): string {
  const path = url.split("?")[0].split("#")[0];
  return path === "/" ? "/" : path.replace(/\/+$/, "");
}

async function resolveMetaTags(url: string): Promise<MetaTags> {
  const path = normalizePath(url);

  // Static routes
  const staticRoute = STATIC_ROUTES[path];
  if (staticRoute) {
    return {
      title: staticRoute.title,
      description: DEFAULT_DESCRIPTION,
      ogTitle: staticRoute.title,
      ogDescription: DEFAULT_DESCRIPTION,
      ogType: staticRoute.ogType,
      ogUrl: `${SITE_URL}${path === "/" ? "" : path}`,
      ogImage: DEFAULT_OG_IMAGE,
    };
  }

  // Dynamic: /artists/:id
  const artistMatch = path.match(/^\/artists\/([^/]+)$/);
  if (artistMatch) {
    try {
      const artist = await storage.getArtist(artistMatch[1]);
      if (artist) {
        const description = artist.bio
          ? artist.bio.slice(0, 160)
          : `Explore ${artist.name}'s artwork on Vernis9.`;
        const image = artist.avatarUrl
          ? toAbsoluteUrl(artist.avatarUrl)
          : DEFAULT_OG_IMAGE;
        return {
          title: `${artist.name} \u2014 Vernis9`,
          description,
          ogTitle: `${artist.name} \u2014 Vernis9`,
          ogDescription: description,
          ogType: "profile",
          ogUrl: `${SITE_URL}/artists/${artist.id}`,
          ogImage: image,
        };
      }
    } catch {
      // fall through to defaults
    }
  }

  // Dynamic: /blog/:id
  const blogMatch = path.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    try {
      const post = await storage.getBlogPost(blogMatch[1]);
      if (post) {
        const description = post.excerpt
          ? post.excerpt.slice(0, 160)
          : post.content.slice(0, 160);
        const image = post.coverImageUrl
          ? toAbsoluteUrl(post.coverImageUrl)
          : DEFAULT_OG_IMAGE;
        return {
          title: `${post.title} \u2014 Vernis9 Blog`,
          description,
          ogTitle: `${post.title} \u2014 Vernis9 Blog`,
          ogDescription: description,
          ogType: "article",
          ogUrl: `${SITE_URL}/blog/${post.id}`,
          ogImage: image,
        };
      }
    } catch {
      // fall through to defaults
    }
  }

  // Fallback for unknown routes
  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    ogTitle: DEFAULT_TITLE,
    ogDescription: DEFAULT_DESCRIPTION,
    ogType: "website",
    ogUrl: `${SITE_URL}${path}`,
    ogImage: DEFAULT_OG_IMAGE,
  };
}

export function injectMetaTags(html: string, meta: MetaTags): string {
  return html
    .replace(/__META_TITLE__/g, escapeHtml(meta.title))
    .replace(/__META_DESCRIPTION__/g, escapeHtml(meta.description))
    .replace(/__META_CANONICAL__/g, escapeHtml(meta.ogUrl))
    .replace(/__META_OG_TITLE__/g, escapeHtml(meta.ogTitle))
    .replace(/__META_OG_DESCRIPTION__/g, escapeHtml(meta.ogDescription))
    .replace(/__META_OG_TYPE__/g, escapeHtml(meta.ogType))
    .replace(/__META_OG_URL__/g, escapeHtml(meta.ogUrl))
    .replace(/__META_OG_IMAGE__/g, escapeHtml(meta.ogImage));
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export { resolveMetaTags };
