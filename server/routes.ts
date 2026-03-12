import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertArtworkSchema, insertArtistSchema, insertBidSchema, insertOrderSchema, insertBlogPostSchema, ORDER_TRANSITIONS, ORDER_STATUSES } from "@shared/schema";
import type { Artist, ArtworkWithArtist, Order, InsertOrder } from "@shared/schema";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import https from "https";
import http from "http";
import { getResendClient, getFromEmail } from "./email";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

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
    console.log("Resend not configured, skipping email notification:", (e as Error).message);
    return;
  }

  const subject = `New Order: "${artwork.title}" has been purchased`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a2e; border-bottom: 2px solid #F97316; padding-bottom: 10px;">New Artwork Order</h1>
      <p>Dear ${artist.name},</p>
      <p>Great news! One of your artworks has been purchased.</p>

      <div style="background: #faf8f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Order Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Order ID:</td><td style="padding: 8px 0; font-weight: bold;">${order.id}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Artwork:</td><td style="padding: 8px 0; font-weight: bold;">${artwork.title}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Medium:</td><td style="padding: 8px 0;">${artwork.medium}</td></tr>
          ${artwork.dimensions ? `<tr><td style="padding: 8px 0; color: #666;">Dimensions:</td><td style="padding: 8px 0;">${artwork.dimensions}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #666;">Price:</td><td style="padding: 8px 0; font-weight: bold; color: #F97316;">${parseInt(order.totalAmount).toLocaleString()}</td></tr>
        </table>
      </div>

      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Buyer Information</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Name:</td><td style="padding: 8px 0; font-weight: bold;">${orderData.buyerName}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Email:</td><td style="padding: 8px 0;">${orderData.buyerEmail}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Shipping Address:</td><td style="padding: 8px 0;">${orderData.shippingAddress}</td></tr>
        </table>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        Please prepare the artwork for shipping. You can view all your orders in your artist dashboard.
      </p>
      <p style="color: #999; font-size: 12px;">This is an automated notification from ArtVerse.</p>
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
    console.log("Resend not configured, skipping buyer confirmation:", (e as Error).message);
    return;
  }

  const subject = `Order Confirmation: "${artwork.title}"`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a2e; border-bottom: 2px solid #F97316; padding-bottom: 10px;">Order Confirmation</h1>
      <p>Dear ${orderData.buyerName},</p>
      <p>Thank you for your purchase! Your order has been received and the artist has been notified.</p>
      
      <div style="background: #faf8f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Order Summary</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Order ID:</td><td style="padding: 8px 0; font-weight: bold;">${order.id}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Artwork:</td><td style="padding: 8px 0; font-weight: bold;">${artwork.title}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Artist:</td><td style="padding: 8px 0;">${artist.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Medium:</td><td style="padding: 8px 0;">${artwork.medium}</td></tr>
          ${artwork.dimensions ? `<tr><td style="padding: 8px 0; color: #666;">Dimensions:</td><td style="padding: 8px 0;">${artwork.dimensions}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #666;">Total:</td><td style="padding: 8px 0; font-weight: bold; color: #F97316;">${parseInt(order.totalAmount).toLocaleString()}</td></tr>
        </table>
      </div>
      
      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: #1a1a2e; margin-top: 0;">Shipping Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #666;">Name:</td><td style="padding: 8px 0; font-weight: bold;">${orderData.buyerName}</td></tr>
          <tr><td style="padding: 8px 0; color: #666;">Address:</td><td style="padding: 8px 0;">${orderData.shippingAddress}</td></tr>
        </table>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        The artist will prepare your artwork for shipping. You will be contacted if any additional information is needed.
      </p>
      <p style="color: #999; font-size: 12px;">This is an automated confirmation from ArtVerse.</p>
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
        res.json({ imageUrl: `/uploads/${subdir}/${req.file.filename}` });
      });
    };
  }

  // Image upload endpoints
  const artworkUpload = createUploadMiddleware("artworks");
  const blogCoverUpload = createUploadMiddleware("blog-covers");
  app.post("/api/upload/artwork", isAuthenticated, createUploadHandler(artworkUpload, "artworks"));
  app.post("/api/upload/blog-cover", isAuthenticated, createUploadHandler(blogCoverUpload, "blog-covers"));

  app.get("/api/image-proxy", (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }
    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({ error: "Invalid URL" });
    }
    const client = imageUrl.startsWith("https") ? https : http;
    const proxyReq = client.get(imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (proxyRes) => {
      if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        const redirectUrl = proxyRes.headers.location;
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
      const claims = req.user?.claims;
      let artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        const firstName = claims?.first_name || "";
        const lastName = claims?.last_name || "";
        const displayName = `${firstName} ${lastName}`.trim() || "New Artist";
        const email = claims?.email || "";
        artist = await storage.createArtist({
          name: displayName,
          bio: "Welcome to my gallery! I'm a new artist on ArtVerse.",
          userId,
          email: email || undefined,
        });
      }
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

  app.get("/api/artists/:id/artworks", async (req, res) => {
    try {
      const artworks = await storage.getArtworksByArtist(req.params.id);
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
            artist: { id: artist.id, name: artist.name, avatarUrl: artist.avatarUrl, specialization: artist.specialization, bio: artist.bio, country: artist.country, galleryLayout: layout },
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

  app.get("/api/artworks/:id", async (req, res) => {
    try {
      const artwork = await storage.getArtwork(req.params.id);
      if (!artwork) {
        return res.status(404).json({ error: "Artwork not found" });
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
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to place bid" });
    }
  });

  // Orders routes
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/artists/:id/orders", async (req, res) => {
    try {
      const artistOrders = await storage.getOrdersByArtist(req.params.id);
      res.json(artistOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist orders" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      // Mark artwork as sold
      await storage.updateArtwork(orderData.artworkId, { isForSale: false });

      // Send email notifications
      try {
        const artwork = await storage.getArtwork(orderData.artworkId);
        if (artwork) {
          const artist = await storage.getArtist(artwork.artist.id);
          if (artist) {
            await sendBuyerConfirmationEmail(artist, artwork, order, orderData);
            if (artist.email) {
              await sendOrderNotificationEmail(artist, artwork, order, orderData);
            }
          }
        }
      } catch (emailError) {
        console.error("Failed to send order emails:", emailError);
      }
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
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

  app.get("/api/blog/:id", async (req, res) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blog post" });
    }
  });

  app.get("/api/artists/:id/blog", async (req, res) => {
    try {
      const posts = await storage.getBlogPostsByArtist(req.params.id);
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
        return res.status(400).json({ error: error.errors[0].message });
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
      const post = await storage.updateBlogPost(req.params.id, req.body);
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
      const artist = await storage.updateArtist(req.params.id, req.body);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      res.json(artist);
    } catch (error) {
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
      const artworkData = insertArtworkSchema.parse(req.body);
      if (artworkData.artistId !== artist.id) {
        return res.status(403).json({ error: "Not authorized to create artworks for another artist" });
      }
      const artwork = await storage.createArtwork(artworkData);
      if (artwork.isReadyForExhibition) {
        await storage.regenerateArtistGallery(artwork.artistId);
      }
      res.status(201).json(artwork);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
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
      const artwork = await storage.updateArtwork(req.params.id, req.body);
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
      console.error("Delete artwork error:", error);
      res.status(500).json({ error: "Failed to delete artwork" });
    }
  });

  return httpServer;
}
