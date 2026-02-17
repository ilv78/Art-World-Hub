import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertArtworkSchema, insertArtistSchema, insertBidSchema, insertOrderSchema, insertBlogPostSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup authentication (BEFORE other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Get current artist for logged-in user
  app.get("/api/artists/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artist = await storage.getArtistByUserId(userId);
      if (!artist) {
        return res.status(404).json({ error: "No artist profile linked to this account" });
      }
      res.json(artist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch artist profile" });
    }
  });

  // Link artist to user account
  app.post("/api/artists/link/:artistId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const artistId = req.params.artistId;
      
      // Check if artist exists and is not already linked
      const artist = await storage.getArtist(artistId);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      if (artist.userId && artist.userId !== userId) {
        return res.status(403).json({ error: "Artist is already linked to another account" });
      }
      
      const updatedArtist = await storage.updateArtist(artistId, { userId });
      res.json(updatedArtist);
    } catch (error) {
      res.status(500).json({ error: "Failed to link artist profile" });
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
          return {
            artist: { id: artist.id, name: artist.name, avatarUrl: artist.avatarUrl, specialization: artist.specialization },
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

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      
      // Mark artwork as sold
      await storage.updateArtwork(orderData.artworkId, { isForSale: false });
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create order" });
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

  app.post("/api/blog", async (req, res) => {
    try {
      const postData = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(postData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to create blog post" });
    }
  });

  app.patch("/api/blog/:id", async (req, res) => {
    try {
      const post = await storage.updateBlogPost(req.params.id, req.body);
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to update blog post" });
    }
  });

  app.delete("/api/blog/:id", async (req, res) => {
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

  // Artist management routes
  app.patch("/api/artists/:id", async (req, res) => {
    try {
      const artist = await storage.updateArtist(req.params.id, req.body);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      res.json(artist);
    } catch (error) {
      res.status(500).json({ error: "Failed to update artist" });
    }
  });

  app.post("/api/artworks", async (req, res) => {
    try {
      const artworkData = insertArtworkSchema.parse(req.body);
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

  app.patch("/api/artworks/:id", async (req, res) => {
    try {
      const existingArtwork = await storage.getArtwork(req.params.id);
      if (!existingArtwork) {
        return res.status(404).json({ error: "Artwork not found" });
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

  app.delete("/api/artworks/:id", async (req, res) => {
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

  return httpServer;
}
