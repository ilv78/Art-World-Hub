import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertArtworkSchema, insertArtistSchema, insertBidSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
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

  return httpServer;
}
