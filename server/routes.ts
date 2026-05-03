import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertArtworkSchema, updateArtworkSchema, insertBidSchema, insertOrderSchema, insertBlogPostSchema, updateBlogPostSchema, updateArtistSchema, ORDER_TRANSITIONS, ORDER_STATUSES, NEWSLETTER_SOURCES, insertShareEventSchema } from "@shared/schema";
import { normalizeArtworkForCreate, normalizeArtworkForUpdate } from "./publish";
import type { Artist, ArtworkWithArtist, Order, InsertOrder } from "@shared/schema";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated, isAdmin, isCurator, authStorage } from "./replit_integrations/auth";
import { USER_ROLES, type UserRole } from "@shared/models/auth";
import https from "https";
import http from "http";
import { getResendClient, getFromEmail } from "./email";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { logger, logFilePath } from "./logger";
import sharp from "sharp";
import { generateArtworkVariants } from "./lib/artwork-image";
import readline from "readline";
import rateLimit from "express-rate-limit";

function formatPrice(amount: string | number): string {
  return `${parseInt(String(amount)).toLocaleString()} \u20AC`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendOrderNotificationEmail(
  artist: Artist,
  artwork: ArtworkWithArtist,
  order: Order,
  orderData: InsertOrder,
) {
  if (!artist.email) return;

  let client;
  try {
    client = getResendClient();
  } catch (e) {
    logger.warn({ err: e }, "Resend not configured, skipping email notification");
    return;
  }

  const subject = `New Order: "${artwork.title}" has been purchased`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a2e; border-bottom: 2px solid #F97316; padding-bottom: 10px;">New Artwork Order</h1>
      <p>Dear ${escapeHtml(artist.name)},</p>
      <p>Great news! One of your artworks has been purchased.</p>

      <div style="background: #faf8f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Order Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Order ID:</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(order.id)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Artwork:</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(artwork.title)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Medium:</td><td style="padding: 8px 0;">${escapeHtml(artwork.medium)}</td></tr>
          ${artwork.dimensions ? `<tr><td style="padding: 8px 0; color: #666;">Dimensions:</td><td style="padding: 8px 0;">${escapeHtml(artwork.dimensions)}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #666;">Price:</td><td style="padding: 8px 0; font-weight: bold; color: #F97316;">${formatPrice(order.totalAmount)}</td></tr>
        </table>
      </div>

      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Buyer Information</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Name:</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(orderData.buyerName)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Email:</td><td style="padding: 8px 0;">${escapeHtml(orderData.buyerEmail)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Shipping Address:</td><td style="padding: 8px 0;">${escapeHtml(orderData.shippingAddress)}</td></tr>
        </table>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Please prepare the artwork for shipping. You can view all your orders in your artist dashboard.
      </p>
      <p style="color: #999; font-size: 12px;">This is an automated notification from Vernis9.</p>
    </div>
  `;

  await client.emails.send({
    from: getFromEmail(),
    to: artist.email,
    subject,
    html,
  });
}

async function sendBuyerConfirmationEmail(
  artist: Artist,
  artwork: ArtworkWithArtist,
  order: Order,
  orderData: InsertOrder,
) {
  let client;
  try {
    client = getResendClient();
  } catch (e) {
    logger.warn({ err: e }, "Resend not configured, skipping buyer confirmation");
    return;
  }

  const subject = `Order Confirmation: "${artwork.title}"`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a2e; border-bottom: 2px solid #F97316; padding-bottom: 10px;">Order Confirmation</h1>
      <p>Dear ${escapeHtml(orderData.buyerName)},</p>
      <p>Thank you for your purchase! Your order has been received and the artist has been notified.</p>

      <div style="background: #faf8f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Order Summary</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Order ID:</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(order.id)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Artwork:</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(artwork.title)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Artist:</td><td style="padding: 8px 0;">${escapeHtml(artist.name)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Medium:</td><td style="padding: 8px 0;">${escapeHtml(artwork.medium)}</td></tr>
          ${artwork.dimensions ? `<tr><td style="padding: 8px 0; color: #666;">Dimensions:</td><td style="padding: 8px 0;">${escapeHtml(artwork.dimensions)}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #666;">Total:</td><td style="padding: 8px 0; font-weight: bold; color: #F97316;">${formatPrice(order.totalAmount)}</td></tr>
        </table>
      </div>

      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Shipping Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Name:</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(orderData.buyerName)}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Address:</td><td style="padding: 8px 0;">${escapeHtml(orderData.shippingAddress)}</td></tr>
        </table>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        The artist will prepare your artwork for shipping. You will be contacted if any additional information is needed.
      </p>
      <p style="color: #999; font-size: 12px;">This is an automated confirmation from Vernis9.</p>
    </div>
  `;

  await client.emails.send({
    from: getFromEmail(),
    to: orderData.buyerEmail,
    subject,
    html,
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication (BEFORE other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Rate limit write endpoints: 100 requests per 15 minutes per IP
  // (Auth endpoints have their own stricter limiter at 10/15min)
  const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later" },
  });
  app.use((req, res, next) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && !req.path.startsWith("/api/auth/")) {
      return writeLimiter(req, res, next);
    }
    next();
  });

  // File upload configuration
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  function createUploadMiddleware(subdir: string) {
    const uploadDir = path.join(process.cwd(), "uploads", subdir);
    fs.mkdirSync(uploadDir, { recursive: true });
    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, crypto.randomUUID() + ext);
      },
    });
    return multer({
      storage,
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
        }
      },
    });
  }

  // Magic byte signatures for image validation
  const MAGIC_BYTES: Record<string, number[][]> = {
    "image/jpeg": [[0xFF, 0xD8, 0xFF]],
    "image/png": [[0x89, 0x50, 0x4E, 0x47]],
    "image/gif": [[0x47, 0x49, 0x46, 0x38]],
    "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF....WEBP)
  };

  function validateMagicBytes(filePath: string, mimeType: string): boolean {
    const signatures = MAGIC_BYTES[mimeType];
    if (!signatures) return false;
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, "r");
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);
    return signatures.some((sig) =>
      sig.every((byte, i) => buffer[i] === byte)
    );
  }

  function createUploadHandler(upload: multer.Multer, subdir: string) {
    return (req: any, res: any) => {
      upload.single("image")(req, res, (err: any) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
          }
          return res.status(400).json({ error: err.message });
        }
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
          return res.status(400).json({ error: "No image file provided" });
        }
        // Validate file content via magic bytes (not just client-provided MIME)
        if (!validateMagicBytes(req.file.path, req.file.mimetype)) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "File content does not match an allowed image type" });
        }
        res.json({ imageUrl: `/uploads/${subdir}/${req.file.filename}` });
      });
    };
  }

  function createImageVariantUploadHandler(upload: multer.Multer, subdir: string) {
    return (req: any, res: any) => {
      upload.single("image")(req, res, async (err: any) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
          }
          return res.status(400).json({ error: err.message });
        }
        if (err) {
          return res.status(400).json({ error: err.message });
        }
        if (!req.file) {
          return res.status(400).json({ error: "No image file provided" });
        }
        if (!validateMagicBytes(req.file.path, req.file.mimetype)) {
          fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "File content does not match an allowed image type" });
        }
        const uuid = path.basename(req.file.filename, path.extname(req.file.filename));
        const destDir = path.dirname(req.file.path);
        try {
          const result = await generateArtworkVariants(req.file.path, uuid, destDir);
          logger.info(
            { subdir, uuid, generated: result.generated, skipped: result.skipped, failed: result.failed },
            "image variants generated",
          );
        } catch (variantErr) {
          logger.error(
            { err: variantErr instanceof Error ? variantErr.message : String(variantErr), subdir, uuid },
            "image variant generation failed; serving original only",
          );
        }
        res.json({ imageUrl: `/uploads/${subdir}/${req.file.filename}` });
      });
    };
  }

  // Image upload endpoints
  const artworkUpload = createUploadMiddleware("artworks");
  const blogCoverUpload = createUploadMiddleware("blog-covers");
  const avatarUpload = createUploadMiddleware("avatars");
  app.post("/api/upload/artwork", isAuthenticated, createImageVariantUploadHandler(artworkUpload, "artworks"));
  app.post("/api/upload/blog-cover", isAuthenticated, createImageVariantUploadHandler(blogCoverUpload, "blog-covers"));
  app.post("/api/upload/avatar", isAuthenticated, (req: any, res: any) => {
    avatarUpload.single("image")(req, res, async (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File too large. Maximum size is 10MB." });
        }
        return res.status(400).json({ error: err.message });
      }
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }
      if (!validateMagicBytes(req.file.path, req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "File content does not match an allowed image type" });
      }
      try {
        const optimizedName = crypto.randomUUID() + ".webp";
        const optimizedPath = path.join(path.dirname(req.file.path), optimizedName);
        await sharp(req.file.path)
          .resize(512, 512, { fit: "cover", position: "attention" })
          .webp({ quality: 80 })
          .toFile(optimizedPath);
        fs.unlinkSync(req.file.path);
        res.json({ imageUrl: `/uploads/avatars/${optimizedName}` });
      } catch {
        res.json({ imageUrl: `/uploads/avatars/${req.file.filename}` });
      }
    });
  });

  // SSRF-safe image proxy: block private/internal IP ranges
  function isPrivateHostname(hostname: string): boolean {
    // Block localhost variants
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0") {
      return true;
    }
    // Block metadata endpoints
    if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
      return true;
    }
    // Block private IP ranges
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
      if (parts[0] === 10) return true; // 10.0.0.0/8
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
      if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
      if (parts[0] === 127) return true; // 127.0.0.0/8
      if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (link-local)
    }
    return false;
  }

  app.get("/api/image-proxy", (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }
    // Only allow http/https
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return res.status(400).json({ error: "Only HTTP/HTTPS URLs are allowed" });
    }
    // Block private/internal hostnames
    if (isPrivateHostname(parsedUrl.hostname)) {
      return res.status(403).json({ error: "Access to internal addresses is not allowed" });
    }
    const client = imageUrl.startsWith("https") ? https : http;
    const proxyReq = client.get(imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (proxyRes) => {
      if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        const redirectUrl = proxyRes.headers.location;
        // Validate redirect URL against SSRF too
        try {
          const redirectParsed = new URL(redirectUrl);
          if (isPrivateHostname(redirectParsed.hostname)) {
            return res.status(403).json({ error: "Redirect to internal address is not allowed" });
          }
        } catch {
          return res.status(400).json({ error: "Invalid redirect URL" });
        }
        const redirectClient = redirectUrl.startsWith("https") ? https : http;
        redirectClient.get(redirectUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (redirectRes) => {
          const contentType = redirectRes.headers["content-type"] || "image/jpeg";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.setHeader("Access-Control-Allow-Origin", "*");
          redirectRes.pipe(res);
        }).on("error", () => res.status(502).json({ error: "Failed to fetch image" }));
        return;
      }
      const contentType = proxyRes.headers["content-type"] || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (proxyRes.statusCode && proxyRes.statusCode >= 400) {
        return res.status(proxyRes.statusCode).json({ error: "Remote image not found" });
      }
      proxyRes.pipe(res);
    });
    proxyReq.on("error", () => res.status(502).json({ error: "Failed to fetch image" }));
    proxyReq.setTimeout(10000, () => { proxyReq.destroy(); res.status(504).json({ error: "Timeout" }); });
  });

  // Get current artist for logged-in user (auto-creates if none exists)
  app.get("/api/artists/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const dbUser = await authStorage.getUser(userId);
      if (dbUser?.role === "curator") {
        return res.status(404).json({ error: "Curators do not have artist profiles" });
      }
      const claims = req.user?.claims;
      const artist = await storage.ensureArtistProfile(userId, {
        firstName: claims?.first_name,
        lastName: claims?.last_name,
        email: claims?.email,
      });
      res.json(artist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist profile" });
    }
  });

  // Artists routes
  app.get("/api/artists", async (req, res) => {
    try {
      const artists = await storage.getArtists();
      res.json(artists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artists" });
    }
  });

  // Public artist lookup by slug — used by the artist profile page so that
  // /artists/:slug can resolve without the client knowing the internal UUID.
  app.get("/api/public/artists/:slug", async (req, res) => {
    try {
      const artist = await storage.getArtistBySlug(req.params.slug);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      res.json({ artist });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist" });
    }
  });

  app.get("/api/artists/:id", async (req, res) => {
    try {
      const artist = await storage.getArtist(req.params.id);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      res.json(artist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist" });
    }
  });

  // Canonicalize /artists/:idOrSlug before the SPA catch-all so old links
  // (UUID URLs from before slugs existed, retired slugs from renames) 301
  // to the current canonical slug. Unknown params fall through so the SPA
  // still renders its own 404 UI. Registered in registerRoutes() to run
  // before static.ts / vite.ts install the catch-all.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  app.get("/artists/:idOrSlug", async (req, res, next) => {
    const param = req.params.idOrSlug;
    try {
      if (UUID_RE.test(param)) {
        const artist = await storage.getArtist(param);
        if (artist) return res.redirect(301, `/artists/${artist.slug}`);
        return next();
      }
      // Slug-shaped param: if it matches the current slug, the SPA handles
      // the request unchanged. Only hit the history table on a miss so the
      // common path stays one query.
      const current = await storage.getArtistBySlug(param);
      if (current) return next();
      const retired = await storage.getArtistByRetiredSlug(param);
      if (retired) return res.redirect(301, `/artists/${retired.slug}`);
      return next();
    } catch {
      return next();
    }
  });

  app.get("/api/artists/:id/artworks", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const viewerArtist = userId ? await storage.getArtistByUserId(userId) : undefined;
      const includeDrafts = viewerArtist?.id === req.params.id;
      const artworks = await storage.getArtworksByArtist(req.params.id, { includeDrafts });
      res.json(artworks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist artworks" });
    }
  });

  app.get("/api/artists/:id/gallery", async (req, res) => {
    try {
      const artist = await storage.getArtist(req.params.id);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      const readyArtworks = await storage.getExhibitionReadyArtworks(req.params.id);
      let layout = artist.galleryLayout as any;
      if (!layout) {
        layout = await storage.regenerateArtistGallery(req.params.id);
      }
      res.json({ layout, artworks: readyArtworks });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist gallery" });
    }
  });

  app.get("/api/gallery/hallway", async (req, res) => {
    try {
      const artists = await storage.getArtists();
      const artistRooms = await Promise.all(
        artists.map(async (artist) => {
          const readyArtworks = await storage.getExhibitionReadyArtworks(artist.id);
          // Regenerate layout if stale or missing
          let layout = artist.galleryLayout;
          if (readyArtworks.length > 0) {
            const existingSlots = layout ? (layout as any).cells?.flatMap((c: any) => c.artworkSlots || []).length ?? 0 : 0;
            const expectedSlots = readyArtworks.length + 1; // +1 for poster
            if (!layout || existingSlots !== expectedSlots) {
              layout = await storage.regenerateArtistGallery(artist.id);
            }
          }
          return {
            artist: { id: artist.id, name: artist.name, avatarUrl: artist.avatarUrl, specialization: artist.specialization, bio: artist.bio, country: artist.country, galleryLayout: layout, galleryTemplate: artist.galleryTemplate },
            artworks: readyArtworks,
          };
        })
      );
      res.json(artistRooms.filter(r => r.artworks.length > 0));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hallway gallery data" });
    }
  });

  // Artworks routes
  app.get("/api/artworks", async (req, res) => {
    try {
      const artworks = await storage.getArtworks();
      res.json(artworks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artworks" });
    }
  });

  app.get("/api/public/artworks/:slug", async (req, res) => {
    try {
      const artwork = await storage.getPublishedArtworkBySlug(req.params.slug);
      if (!artwork) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      const related = await storage.getRelatedArtworksByArtist(
        artwork.artistId,
        artwork.id,
        6,
      );
      res.json({ artwork, related });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artwork" });
    }
  });

  app.get("/api/artworks/:id", async (req: any, res) => {
    try {
      const artwork = await storage.getArtwork(req.params.id);
      if (!artwork) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      if (!artwork.isPublished) {
        const userId = req.user?.claims?.sub;
        const viewerArtist = userId ? await storage.getArtistByUserId(userId) : undefined;
        if (viewerArtist?.id !== artwork.artistId) {
          return res.status(404).json({ error: "Artwork not found" });
        }
      }
      res.json(artwork);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artwork" });
    }
  });

  // Auctions routes
  app.get("/api/auctions", async (req, res) => {
    try {
      const auctions = await storage.getAuctions();
      res.json(auctions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch auctions" });
    }
  });

  app.get("/api/auctions/:id", async (req, res) => {
    try {
      const auction = await storage.getAuction(req.params.id);
      if (!auction) {
        return res.status(404).json({ error: "Auction not found" });
      }
      res.json(auction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch auction" });
    }
  });

  app.get("/api/auctions/:id/bids", async (req, res) => {
    try {
      const bids = await storage.getBidsByAuction(req.params.id);
      res.json(bids);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  app.post("/api/auctions/:id/bids", async (req, res) => {
    try {
      const auction = await storage.getAuction(req.params.id);
      if (!auction) {
        return res.status(404).json({ error: "Auction not found" });
      }

      // Check if auction is active
      const now = new Date();
      const startTime = new Date(auction.startTime);
      const endTime = new Date(auction.endTime);

      if (now < startTime) {
        return res.status(400).json({ error: "Auction has not started yet" });
      }

      if (now > endTime) {
        return res.status(400).json({ error: "Auction has ended" });
      }

      const currentBid = parseFloat(auction.currentBid || auction.startingPrice);
      const minimumIncrement = parseFloat(auction.minimumIncrement);
      const bidAmount = parseFloat(req.body.amount);

      if (bidAmount < currentBid + minimumIncrement) {
        return res.status(400).json({ 
          error: `Minimum bid is $${(currentBid + minimumIncrement).toLocaleString()}` 
        });
      }

      // Validate bid data
      const bidData = insertBidSchema.parse({
        auctionId: req.params.id,
        bidderName: req.body.bidderName,
        amount: req.body.amount,
      });

      // Create bid
      const bid = await storage.createBid(bidData);

      // Update auction current bid
      await storage.updateAuction(req.params.id, {
        currentBid: req.body.amount,
      });

      res.status(201).json(bid);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      res.status(500).json({ error: "Failed to place bid" });
    }
  });

  // Orders routes
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(403).json({ error: "Not authorized" });
      }
      // Return only this artist's orders (admin sees all via /api/admin/orders)
      const orders = await storage.getOrdersByArtist(artist.id);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/artists/:id/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist || artist.id !== req.params.id) {
        return res.status(403).json({ error: "Not authorized to view another artist's orders" });
      }
      const artistOrders = await storage.getOrdersByArtist(req.params.id);
      res.json(artistOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist orders" });
    }
  });

  app.post("/api/orders", async (req: any, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);

      // Validate artwork exists and is for sale, use DB price
      const artwork = await storage.getArtwork(orderData.artworkId);
      if (!artwork) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      if (!artwork.isForSale) {
        return res.status(400).json({ error: "Artwork is not available for purchase" });
      }

      // Use actual DB price and force pending status
      const validatedOrder = {
        ...orderData,
        totalAmount: artwork.price,
        status: "pending",
      };

      const order = await storage.createOrder(validatedOrder);

      // Send email notifications
      try {
        const artist = await storage.getArtist(artwork.artist.id);
        if (artist) {
          await sendBuyerConfirmationEmail(artist, artwork, order, validatedOrder);
          if (artist.email) {
            await sendOrderNotificationEmail(artist, artwork, order, validatedOrder);
          }
        }
      } catch (emailError) {
        logger.error({ err: emailError }, "Failed to send order emails");
      }

      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const status = req.body.status as string;
      if (!status || !(ORDER_STATUSES as readonly string[]).includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const orderId = req.params.id as string;
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      const artwork = await storage.getArtwork(order.artworkId);
      if (!artwork || artwork.artist.id !== artist.id) {
        return res.status(403).json({ error: "Not authorized to update this order" });
      }

      const allowedTransitions = ORDER_TRANSITIONS[order.status] || [];
      if (!allowedTransitions.includes(status)) {
        return res.status(400).json({
          error: `Cannot change status from "${order.status}" to "${status}"`,
        });
      }

      const updated = await storage.updateOrderStatus(orderId, status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Exhibitions routes
  app.get("/api/exhibitions", async (req, res) => {
    try {
      const exhibitions = await storage.getExhibitions();
      res.json(exhibitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exhibitions" });
    }
  });

  app.get("/api/exhibitions/active", async (req, res) => {
    try {
      const exhibition = await storage.getActiveExhibition();
      if (!exhibition) {
        return res.status(404).json({ error: "No active exhibition" });
      }
      res.json(exhibition);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active exhibition" });
    }
  });

  app.get("/api/exhibitions/:id", async (req, res) => {
    try {
      const exhibition = await storage.getExhibition(req.params.id);
      if (!exhibition) {
        return res.status(404).json({ error: "Exhibition not found" });
      }
      res.json(exhibition);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exhibition" });
    }
  });

  // Blog posts routes
  app.get("/api/blog", async (req, res) => {
    try {
      const posts = await storage.getBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  app.get("/api/blog/:id", async (req: any, res) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      if (!post.isPublished) {
        const userId = req.user?.claims?.sub;
        const viewerArtist = userId ? await storage.getArtistByUserId(userId) : undefined;
        if (viewerArtist?.id !== post.artistId) {
          return res.status(404).json({ error: "Blog post not found" });
        }
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  app.get("/api/artists/:id/blog", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const viewerArtist = userId ? await storage.getArtistByUserId(userId) : undefined;
      const includeDrafts = viewerArtist?.id === req.params.id;
      const posts = await storage.getBlogPostsByArtist(req.params.id, { includeDrafts });
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist blog posts" });
    }
  });

  app.post("/api/blog", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(403).json({ error: "Not authorized — no artist profile" });
      }
      const postData = insertBlogPostSchema.parse(req.body);
      if (postData.artistId !== artist.id) {
        return res.status(403).json({ error: "Not authorized to create posts for another artist" });
      }
      const post = await storage.createBlogPost(postData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  app.patch("/api/blog/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const existing = await storage.getBlogPost(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      if (existing.artistId !== artist.id) {
        return res.status(403).json({ error: "Not authorized to edit another artist's post" });
      }
      const data = updateBlogPostSchema.parse(req.body);
      const post = await storage.updateBlogPost(req.params.id, data);
      res.json(post!);
    } catch (error) {
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });

  app.delete("/api/blog/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const existing = await storage.getBlogPost(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      if (existing.artistId !== artist.id) {
        return res.status(403).json({ error: "Not authorized to delete another artist's post" });
      }
      await storage.deleteBlogPost(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // Artist management routes
  app.patch("/api/artists/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const currentArtist = await storage.getArtistByUserId(userId);
      if (!currentArtist || currentArtist.id !== req.params.id) {
        return res.status(403).json({ error: "Not authorized to edit another artist's profile" });
      }
      const data = updateArtistSchema.parse(req.body);
      const artist = await storage.updateArtist(req.params.id, data);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      res.json(artist);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      res.status(500).json({ error: "Failed to update artist" });
    }
  });

  app.post("/api/artworks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(403).json({ error: "Not authorized — no artist profile" });
      }
      const parsed = insertArtworkSchema.parse(req.body);
      if (parsed.artistId !== artist.id) {
        return res.status(403).json({ error: "Not authorized to create artworks for another artist" });
      }
      const artworkData = normalizeArtworkForCreate(parsed);
      const artwork = await storage.createArtwork(artworkData);
      if (artwork.isReadyForExhibition) {
        await storage.regenerateArtistGallery(artwork.artistId);
      }
      res.status(201).json(artwork);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      res.status(500).json({ error: "Failed to create artwork" });
    }
  });

  app.patch("/api/artworks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const existingArtwork = await storage.getArtwork(req.params.id);
      if (!existingArtwork) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      if (existingArtwork.artist.id !== artist.id) {
        return res.status(403).json({ error: "Not authorized to edit another artist's artwork" });
      }
      const parsed = updateArtworkSchema.parse(req.body);
      const data = normalizeArtworkForUpdate(existingArtwork, parsed);
      const artwork = await storage.updateArtwork(req.params.id, data);
      if (!artwork) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      const readinessChanged = existingArtwork.isReadyForExhibition !== artwork.isReadyForExhibition;
      const orderChanged = artwork.isReadyForExhibition && existingArtwork.exhibitionOrder !== artwork.exhibitionOrder;
      if (readinessChanged || orderChanged) {
        await storage.regenerateArtistGallery(artwork.artistId);
      }
      res.json(artwork);
    } catch (error) {
      res.status(500).json({ error: "Failed to update artwork" });
    }
  });

  app.delete("/api/artworks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const artwork = await storage.getArtwork(req.params.id);
      if (!artwork) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      if (artwork.artist.id !== artist.id) {
        return res.status(403).json({ error: "Not authorized to delete another artist's artwork" });
      }
      const deleted = await storage.deleteArtwork(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      if (artwork.isReadyForExhibition) {
        await storage.regenerateArtistGallery(artwork.artistId);
      }
      res.status(204).send();
    } catch (error) {
      logger.error({ err: error }, "Delete artwork error");
      res.status(500).json({ error: "Failed to delete artwork" });
    }
  });

  // ── Curator routes (require curator role) ─────────────────────────
  // Public: exhibitions listing (active + upcoming)
  app.get("/api/curated-exhibitions", async (_req, res) => {
    try {
      const galleries = await storage.getActiveAndUpcomingCuratorGalleries();
      res.json(galleries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exhibitions" });
    }
  });

  // Public: curated galleries for hallway
  app.get("/api/gallery/curated", async (_req, res) => {
    try {
      const galleries = await storage.getPublishedCuratorGalleries();
      res.json(galleries.map(g => ({
        gallery: { id: g.id, name: g.name, description: g.description, galleryLayout: g.galleryLayout, galleryTemplate: g.galleryTemplate, curator: g.curator },
        artworks: g.artworks,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch curated galleries" });
    }
  });

  // Public: single curator gallery
  app.get("/api/curator-galleries/:id", async (req, res) => {
    try {
      const gallery = await storage.getCuratorGallery(req.params.id);
      if (!gallery || !gallery.isPublished) return res.status(404).json({ error: "Gallery not found" });
      const now = new Date();
      if (gallery.startDate && now < new Date(gallery.startDate)) return res.status(404).json({ error: "Gallery not found" });
      if (gallery.endDate && now > new Date(gallery.endDate)) return res.status(404).json({ error: "Gallery not found" });
      res.json(gallery);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  });

  // Curator: update own profile (name)
  app.patch("/api/curator/profile", isCurator, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { firstName, lastName } = req.body;
      if (typeof firstName !== "string" && typeof lastName !== "string") {
        return res.status(400).json({ error: "Provide firstName or lastName" });
      }
      const data: { firstName?: string; lastName?: string } = {};
      if (typeof firstName === "string") data.firstName = firstName.trim();
      if (typeof lastName === "string") data.lastName = lastName.trim();
      const user = await storage.updateUserProfile(userId, data);
      if (!user) return res.status(404).json({ error: "User not found" });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      logger.error({ err: error }, "Update curator profile error");
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Curator: available artworks
  app.get("/api/curator/artworks/available", isCurator, async (_req, res) => {
    try {
      const artworks = await storage.getAllExhibitionReadyArtworks();
      res.json(artworks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artworks" });
    }
  });

  // Curator: list own galleries
  app.get("/api/curator/galleries", isCurator, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const galleries = await storage.getCuratorGalleriesByCurator(userId);
      res.json(galleries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch galleries" });
    }
  });

  // Curator: create gallery
  app.post("/api/curator/galleries", isCurator, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const data = { ...req.body, curatorId: userId };
      const gallery = await storage.createCuratorGallery(data);
      res.status(201).json(gallery);
    } catch (error) {
      res.status(500).json({ error: "Failed to create gallery" });
    }
  });

  // Curator: update gallery
  app.patch("/api/curator/galleries/:id", isCurator, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const gallery = await storage.getCuratorGallery(req.params.id);
      if (!gallery) return res.status(404).json({ error: "Gallery not found" });
      if (gallery.curatorId !== userId) return res.status(403).json({ error: "Not your gallery" });
      const data = { ...req.body };
      if (data.startDate !== undefined) data.startDate = data.startDate ? new Date(data.startDate) : null;
      if (data.endDate !== undefined) data.endDate = data.endDate ? new Date(data.endDate) : null;
      const updated = await storage.updateCuratorGallery(req.params.id, data);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update gallery" });
    }
  });

  // Curator: delete gallery
  app.delete("/api/curator/galleries/:id", isCurator, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const gallery = await storage.getCuratorGallery(req.params.id);
      if (!gallery) return res.status(404).json({ error: "Gallery not found" });
      if (gallery.curatorId !== userId) return res.status(403).json({ error: "Not your gallery" });
      await storage.deleteCuratorGallery(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gallery" });
    }
  });

  // Curator: set gallery artworks (replace all)
  app.put("/api/curator/galleries/:id/artworks", isCurator, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const gallery = await storage.getCuratorGallery(req.params.id);
      if (!gallery) return res.status(404).json({ error: "Gallery not found" });
      if (gallery.curatorId !== userId) return res.status(403).json({ error: "Not your gallery" });
      const { artworkIds } = req.body;
      if (!Array.isArray(artworkIds)) return res.status(400).json({ error: "artworkIds must be an array" });
      await storage.setCuratorGalleryArtworks(req.params.id, artworkIds);
      const layout = await storage.regenerateCuratorGalleryLayout(req.params.id);
      const updated = await storage.getCuratorGallery(req.params.id);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update gallery artworks" });
    }
  });

  // ── Admin routes (require admin role) ──────────────────────────────
  app.get("/api/admin/users", isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getUsers();
      // Strip password hashes
      const safeUsers = users.map(({ password: _, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id/role", isAdmin, async (req: any, res) => {
    try {
      const role = req.body.role as string;
      if (!role || !USER_ROLES.includes(role as UserRole)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${USER_ROLES.join(", ")}` });
      }
      const user = await storage.updateUserRole(req.params.id, role as UserRole);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req: any, res) => {
    try {
      // Prevent admin from deleting themselves
      if (req.params.id === req.user?.claims?.sub) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      // Also delete the artist linked to this user, if any
      const artist = await storage.getArtistByUserId(req.params.id);
      if (artist) {
        await storage.deleteArtist(artist.id);
      } else {
        const deleted = await storage.deleteUser(req.params.id);
        if (!deleted) {
          return res.status(404).json({ error: "User not found" });
        }
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.get("/api/admin/artists", isAdmin, async (req: any, res) => {
    try {
      const artists = await storage.getArtists();
      res.json(artists);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artists" });
    }
  });

  app.delete("/api/admin/artists/:id", isAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteArtist(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Artist not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete artist" });
    }
  });

  app.get("/api/admin/artworks", isAdmin, async (req: any, res) => {
    try {
      const artworks = await storage.getArtworks();
      res.json(artworks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artworks" });
    }
  });

  app.delete("/api/admin/artworks/:id", isAdmin, async (req: any, res) => {
    try {
      const artwork = await storage.getArtwork(req.params.id);
      if (!artwork) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      const deleted = await storage.deleteArtwork(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Artwork not found" });
      }
      if (artwork.isReadyForExhibition) {
        await storage.regenerateArtistGallery(artwork.artistId);
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete artwork" });
    }
  });

  app.get("/api/admin/exhibitions", isAdmin, async (req: any, res) => {
    try {
      const exhibitions = await storage.getExhibitions();
      res.json(exhibitions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch exhibitions" });
    }
  });

  app.delete("/api/admin/exhibitions/:id", isAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteExhibition(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Exhibition not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete exhibition" });
    }
  });

  app.get("/api/admin/blog", isAdmin, async (req: any, res) => {
    try {
      const posts = await storage.getAllBlogPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  app.delete("/api/admin/blog/:id", isAdmin, async (req: any, res) => {
    try {
      const deleted = await storage.deleteBlogPost(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // ── Site settings (public read, admin write) ─────────────────
  app.get("/api/site-settings", async (_req, res) => {
    try {
      const settings = await storage.getSiteSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch site settings" });
    }
  });

  app.patch("/api/admin/site-settings", isAdmin, async (req: any, res) => {
    try {
      const { galleryTemplate } = req.body;
      const updated = await storage.updateSiteSettings({ galleryTemplate });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update site settings" });
    }
  });

  // ── Admin logs endpoint (structured log viewer) ─────────────────
  app.get("/api/admin/logs", isAdmin, async (req: any, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 200, 2000);
      const level = req.query.level as string | undefined; // e.g. "error", "warn"
      const module = req.query.module as string | undefined;
      const search = req.query.search as string | undefined;
      const since = req.query.since as string | undefined; // ISO timestamp

      const pinoLevels: Record<string, number> = {
        fatal: 60,
        error: 50,
        warn: 40,
        info: 30,
        debug: 20,
        trace: 10,
      };
      const minLevel = level ? (pinoLevels[level] ?? 0) : 0;
      const sinceMs = since ? new Date(since).getTime() : 0;

      if (!fs.existsSync(logFilePath)) {
        return res.json({ entries: [], total: 0 });
      }

      // Read log file lines (NDJSON) — collect all then return the last `limit`
      const entries: object[] = [];
      const fileStream = fs.createReadStream(logFilePath, { encoding: "utf-8" });
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          // Apply filters
          if (minLevel && (entry.level ?? 0) < minLevel) continue;
          if (module && entry.module !== module) continue;
          if (sinceMs && new Date(entry.time).getTime() < sinceMs) continue;
          if (search && !line.toLowerCase().includes(search.toLowerCase())) continue;
          entries.push(entry);
        } catch {
          // skip malformed lines
        }
      }

      // Return the most recent entries (tail)
      const tail = entries.slice(-limit);
      res.json({ entries: tail, total: entries.length });
    } catch (error) {
      logger.error({ err: error }, "Failed to read logs");
      res.status(500).json({ error: "Failed to read logs" });
    }
  });

  // Version & changelog (public) — cached at startup since content only changes on redeploy
  let cachedChangelog: string | null = null;
  let cachedVersion = "unknown";
  try {
    cachedChangelog = fs.readFileSync(path.resolve(process.cwd(), "CHANGELOG.md"), "utf-8");
    const match = cachedChangelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
    cachedVersion = match ? `v${match[1]}` : "unknown";
  } catch { /* CHANGELOG.md not present */ }

  app.get("/api/version", (_req, res) => {
    res.json({ version: cachedVersion });
  });

  app.get("/api/changelog", (_req, res) => {
    if (!cachedChangelog) return res.status(404).json({ error: "Changelog not found" });
    res.type("text/plain").send(cachedChangelog);
  });

  // Newsletter admin (requires admin role)
  app.get("/api/newsletter/subscribers", isAdmin, async (_req, res) => {
    const subscribers = await storage.getNewsletterSubscribers();
    res.json(subscribers);
  });

  app.delete("/api/newsletter/subscribers/:id", isAdmin, async (req: any, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const deleted = await storage.deleteNewsletterSubscriber(id);
    if (!deleted) return res.status(404).json({ error: "Subscriber not found" });
    res.json({ success: true });
  });

  // Newsletter subscribe
  // Share-event tracking (#569). Public endpoint — anyone can record a share
  // click. Tight 6/min/IP limit because a normal user clicks share a handful
  // of times in a session at most; anything higher is botting our analytics.
  const shareEventLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many share events from this IP" },
  });

  app.post("/api/share-events", shareEventLimiter, async (req: any, res) => {
    const parsed = insertShareEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid share event payload" });
    }
    try {
      const userId = req.user?.claims?.sub ?? null;
      await storage.recordShareEvent({ ...parsed.data, userId });
      // Fire-and-forget shape: 204 No Content keeps the client lightweight.
      res.status(204).send();
    } catch (error) {
      logger.error({ error }, "Failed to record share event");
      res.status(500).json({ error: "Failed to record share event" });
    }
  });

  app.get("/api/admin/share-events/stats", isAdmin, async (req: any, res) => {
    try {
      const sinceDays = Math.max(1, Math.min(365, Number(req.query.days) || 30));
      const stats = await storage.getShareEventStats({ sinceDays });
      res.json({ sinceDays, ...stats });
    } catch (error) {
      logger.error({ error }, "Failed to fetch share event stats");
      res.status(500).json({ error: "Failed to fetch share event stats" });
    }
  });

  app.post("/api/newsletter/subscribe", async (req, res) => {
    const { email, source } = req.body ?? {};
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    if (source !== undefined && !NEWSLETTER_SOURCES.includes(source)) {
      return res.status(400).json({ error: "Invalid source." });
    }
    const result = await storage.subscribeNewsletter(email, source);
    if (result.alreadySubscribed) {
      return res.json({ message: "You're already subscribed!", alreadySubscribed: true });
    }
    return res.json({ message: "Thanks for subscribing!", alreadySubscribed: false });
  });

  return httpServer;
}
