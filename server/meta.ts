import { storage } from "./storage";
import { FAQS } from "../shared/faqs";

const SITE_URL = process.env.SITE_URL || "https://vernis9.art";
const PRODUCTION_URL = "https://vernis9.art";
const isProduction = SITE_URL === PRODUCTION_URL;
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
  jsonLd: Record<string, unknown>[];
}

const STATIC_ROUTES: Record<string, Pick<MetaTags, "title" | "ogType"> & { description?: string }> = {
  "/": { title: DEFAULT_TITLE, ogType: "website" },
  "/gallery": {
    title: "3D Virtual Gallery \u2014 Vernis9",
    ogType: "website",
    description:
      "Walk through Vernis9's immersive 3D museum. Step into per-artist rooms and explore curated artworks in a virtual gallery space.",
  },
  "/exhibitions": {
    title: "Exhibitions \u2014 Vernis9",
    ogType: "website",
    description:
      "Curated exhibitions at Vernis9 \u2014 themed collections featuring international artists. Discover what's on now and what's coming next.",
  },
  "/store": {
    title: "Art Store \u2014 Vernis9",
    ogType: "website",
    description:
      "Buy original artworks directly from the artist on Vernis9. Paintings, prints, sculpture and more \u2014 fair prices, no gallery middleman.",
  },
  "/auctions": {
    title: "Auctions \u2014 Vernis9",
    ogType: "website",
    description:
      "Bid on exclusive artworks at Vernis9. Live auctions of paintings, sculpture and limited editions from emerging and established artists.",
  },
  "/artists": {
    title: "Artists \u2014 Vernis9",
    ogType: "website",
    description:
      "Discover artists on Vernis9. Browse profiles, view portfolios and step into each artist's own 3D exhibition room.",
  },
  "/blog": {
    title: "Blog \u2014 Vernis9",
    ogType: "website",
    description:
      "Stories, interviews and insights from the Vernis9 community. Read about the artists, the artworks and the world behind them.",
  },
  "/changelog": {
    title: "Changelog \u2014 Vernis9",
    ogType: "website",
    description:
      "What's new on Vernis9 \u2014 release notes covering features, improvements and fixes shipped to the platform.",
  },
  "/privacy": {
    title: "Privacy Policy \u2014 Vernis9",
    ogType: "website",
    description:
      "Vernis9 privacy policy \u2014 how we collect, use and protect your personal data, and your rights as a user.",
  },
  "/terms": {
    title: "Terms of Service \u2014 Vernis9",
    ogType: "website",
    description:
      "Vernis9 terms of service \u2014 the rules for using the platform as a visitor, buyer or artist.",
  },
};

const STATIC_ROUTE_NAMES: Record<string, string> = {
  "/": "Home",
  "/gallery": "3D Virtual Gallery",
  "/exhibitions": "Exhibitions",
  "/store": "Art Store",
  "/auctions": "Auctions",
  "/artists": "Artists",
  "/blog": "Blog",
  "/changelog": "Changelog",
  "/privacy": "Privacy Policy",
  "/terms": "Terms of Service",
};

function breadcrumb(...items: { name: string; url?: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

function organizationLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vernis9",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/favicon.svg`,
    description: "Virtual art gallery and marketplace",
  };
}

function websiteLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Vernis9",
    url: `${SITE_URL}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/store?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function faqPageLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

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
    const jsonLd: Record<string, unknown>[] = [];
    if (path === "/") {
      jsonLd.push(organizationLd());
      jsonLd.push(websiteLd());
      jsonLd.push(faqPageLd());
      jsonLd.push(breadcrumb({ name: "Home", url: `${SITE_URL}/` }));
    } else {
      const name = STATIC_ROUTE_NAMES[path] || staticRoute.title;
      jsonLd.push(breadcrumb(
        { name: "Home", url: `${SITE_URL}/` },
        { name },
      ));
    }
    const description = staticRoute.description ?? DEFAULT_DESCRIPTION;
    return {
      title: staticRoute.title,
      description,
      ogTitle: staticRoute.title,
      ogDescription: description,
      ogType: staticRoute.ogType,
      ogUrl: `${SITE_URL}${path === "/" ? "/" : path}`,
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd,
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
        const artistUrl = `${SITE_URL}/artists/${artist.id}`;
        const sameAs = extractSameAs(artist.socialLinks);
        const personLd: Record<string, unknown> = {
          "@context": "https://schema.org",
          "@type": "Person",
          name: artist.name,
          url: artistUrl,
          description: artist.bio || undefined,
          jobTitle: "Artist",
          ...(artist.avatarUrl ? { image: toAbsoluteUrl(artist.avatarUrl) } : {}),
          ...(artist.specialization ? { knowsAbout: artist.specialization } : {}),
          ...(sameAs.length ? { sameAs } : {}),
        };
        return {
          title: `${artist.name} \u2014 Vernis9`,
          description,
          ogTitle: `${artist.name} \u2014 Vernis9`,
          ogDescription: description,
          ogType: "profile",
          ogUrl: artistUrl,
          ogImage: image,
          jsonLd: [
            personLd,
            breadcrumb(
              { name: "Home", url: `${SITE_URL}/` },
              { name: "Artists", url: `${SITE_URL}/artists` },
              { name: artist.name },
            ),
          ],
        };
      }
    } catch {
      // fall through to defaults
    }
  }

  // Dynamic: /artworks/:slug
  const artworkMatch = path.match(/^\/artworks\/([^/]+)$/);
  if (artworkMatch) {
    try {
      const artwork = await storage.getPublishedArtworkBySlug(artworkMatch[1]);
      if (artwork) {
        const rawDescription = artwork.description || `${artwork.title} by ${artwork.artist.name} on Vernis9.`;
        const description = rawDescription.slice(0, 160);
        const image = toAbsoluteUrl(artwork.imageUrl);
        const artworkUrl = `${SITE_URL}/artworks/${artwork.slug}`;
        const title = `${artwork.title} by ${artwork.artist.name} \u2014 Vernis9`;
        const priceNumber = Number(artwork.price);
        const hasValidPrice = Number.isFinite(priceNumber) && priceNumber > 0;
        const visualArtworkLd: Record<string, unknown> = {
          "@context": "https://schema.org",
          "@type": "VisualArtwork",
          name: artwork.title,
          url: artworkUrl,
          image,
          description,
          creator: {
            "@type": "Person",
            name: artwork.artist.name,
            url: `${SITE_URL}/artists/${artwork.artist.id}`,
            ...(artwork.artist.avatarUrl ? { image: toAbsoluteUrl(artwork.artist.avatarUrl) } : {}),
          },
          artMedium: artwork.medium,
          ...(artwork.year ? { dateCreated: String(artwork.year) } : {}),
          ...(artwork.category ? { genre: artwork.category } : {}),
          ...(artwork.isForSale && hasValidPrice
            ? {
                offers: {
                  "@type": "Offer",
                  price: priceNumber.toFixed(2),
                  priceCurrency: "EUR",
                  availability: "https://schema.org/InStock",
                  url: artworkUrl,
                },
              }
            : {}),
        };
        return {
          title,
          description,
          ogTitle: title,
          ogDescription: description,
          ogType: "article",
          ogUrl: artworkUrl,
          ogImage: image,
          jsonLd: [
            visualArtworkLd,
            breadcrumb(
              { name: "Home", url: `${SITE_URL}/` },
              { name: "Artists", url: `${SITE_URL}/artists` },
              { name: artwork.artist.name, url: `${SITE_URL}/artists/${artwork.artist.id}` },
              { name: artwork.title },
            ),
          ],
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
        const postUrl = `${SITE_URL}/blog/${post.id}`;
        const blogPostingLd: Record<string, unknown> = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description,
          url: postUrl,
          datePublished: post.createdAt,
          dateModified: post.updatedAt,
          author: {
            "@type": "Person",
            name: post.artist.name,
            ...(post.artist.avatarUrl ? { image: toAbsoluteUrl(post.artist.avatarUrl) } : {}),
          },
          publisher: {
            "@type": "Organization",
            name: "Vernis9",
            logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
          },
          ...(post.coverImageUrl ? { image: toAbsoluteUrl(post.coverImageUrl) } : {}),
        };
        return {
          title: `${post.title} \u2014 Vernis9 Blog`,
          description,
          ogTitle: `${post.title} \u2014 Vernis9 Blog`,
          ogDescription: description,
          ogType: "article",
          ogUrl: postUrl,
          ogImage: image,
          jsonLd: [
            blogPostingLd,
            breadcrumb(
              { name: "Home", url: `${SITE_URL}/` },
              { name: "Blog", url: `${SITE_URL}/blog` },
              { name: post.title },
            ),
          ],
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
    jsonLd: [breadcrumb({ name: "Home", url: `${SITE_URL}/` })],
  };
}

export function injectMetaTags(html: string, meta: MetaTags): string {
  const jsonLdScripts = meta.jsonLd
    .map((ld) => `<script type="application/ld+json">${JSON.stringify(ld)}</script>`)
    .join("\n    ");

  return html
    .replace(/__META_TITLE__/g, escapeHtml(meta.title))
    .replace(/__META_DESCRIPTION__/g, escapeHtml(meta.description))
    .replace(/__META_CANONICAL__/g, escapeHtml(meta.ogUrl))
    .replace(/__META_OG_TITLE__/g, escapeHtml(meta.ogTitle))
    .replace(/__META_OG_DESCRIPTION__/g, escapeHtml(meta.ogDescription))
    .replace(/__META_OG_TYPE__/g, escapeHtml(meta.ogType))
    .replace(/__META_OG_URL__/g, escapeHtml(meta.ogUrl))
    .replace(/__META_OG_IMAGE__/g, escapeHtml(meta.ogImage))
    .replace(/__META_ROBOTS__/g, isProduction ? "" : '<meta name="robots" content="noindex, nofollow" />')
    .replace(/__JSON_LD__/g, jsonLdScripts);
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Turn an artist's socialLinks JSONB into a schema.org sameAs array.
// Only absolute http(s) URLs are kept — empty strings and relative paths are
// dropped so we never emit a broken cross-link into structured data.
function extractSameAs(socialLinks: unknown): string[] {
  if (!socialLinks || typeof socialLinks !== "object") return [];
  const out: string[] = [];
  for (const value of Object.values(socialLinks as Record<string, unknown>)) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) out.push(trimmed);
  }
  return out;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export { resolveMetaTags };
