import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { randomUUID } from "crypto";
import type { Express, Request, Response } from "express";
import { isAuthenticated } from "./replit_integrations/auth";
import { DatabaseStorage } from "./storage";
import { ORDER_TRANSITIONS, ORDER_STATUSES } from "@shared/schema";
import { mcpLogger as logger, logFilePath } from "./logger";
import fs from "fs";
import readline from "readline";

const storage = new DatabaseStorage();

export function createMcpServer(): McpServer {
  const mcp = new McpServer(
    {
      name: "artverse-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
      },
    }
  );

  // ─── RESOURCES ───────────────────────────────────────────────

  mcp.resource(
    "all-artists",
    "artverse://artists",
    { description: "List all artists on ArtVerse" },
    async () => ({
      contents: [
        {
          uri: "artverse://artists",
          mimeType: "application/json",
          text: JSON.stringify(await storage.getArtists(), null, 2),
        },
      ],
    })
  );

  mcp.resource(
    "artist-by-id",
    new ResourceTemplate("artverse://artists/{artistId}", { list: undefined }),
    { description: "Get a specific artist's profile by ID" },
    async (uri, params) => {
      const artist = await storage.getArtist(params.artistId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: artist ? JSON.stringify(artist, null, 2) : JSON.stringify({ error: "Artist not found" }),
          },
        ],
      };
    }
  );

  mcp.resource(
    "all-artworks",
    "artverse://artworks",
    { description: "List all artworks with artist information" },
    async () => ({
      contents: [
        {
          uri: "artverse://artworks",
          mimeType: "application/json",
          text: JSON.stringify(await storage.getArtworks(), null, 2),
        },
      ],
    })
  );

  mcp.resource(
    "artworks-by-artist",
    new ResourceTemplate("artverse://artists/{artistId}/artworks", { list: undefined }),
    { description: "Get all artworks by a specific artist" },
    async (uri, params) => {
      const artworks = await storage.getArtworksByArtist(params.artistId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(artworks, null, 2),
          },
        ],
      };
    }
  );

  mcp.resource(
    "artwork-by-id",
    new ResourceTemplate("artverse://artworks/{artworkId}", { list: undefined }),
    { description: "Get a specific artwork by ID" },
    async (uri, params) => {
      const artwork = await storage.getArtwork(params.artworkId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: artwork ? JSON.stringify(artwork, null, 2) : JSON.stringify({ error: "Artwork not found" }),
          },
        ],
      };
    }
  );

  mcp.resource(
    "all-auctions",
    "artverse://auctions",
    { description: "List all auctions" },
    async () => ({
      contents: [
        {
          uri: "artverse://auctions",
          mimeType: "application/json",
          text: JSON.stringify(await storage.getAuctions(), null, 2),
        },
      ],
    })
  );

  mcp.resource(
    "auction-by-id",
    new ResourceTemplate("artverse://auctions/{auctionId}", { list: undefined }),
    { description: "Get a specific auction with details" },
    async (uri, params) => {
      const auction = await storage.getAuction(params.auctionId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: auction ? JSON.stringify(auction, null, 2) : JSON.stringify({ error: "Auction not found" }),
          },
        ],
      };
    }
  );

  mcp.resource(
    "auction-bids",
    new ResourceTemplate("artverse://auctions/{auctionId}/bids", { list: undefined }),
    { description: "Get all bids for a specific auction" },
    async (uri, params) => {
      const bids = await storage.getBidsByAuction(params.auctionId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(bids, null, 2),
          },
        ],
      };
    }
  );

  mcp.resource(
    "orders-by-artist",
    new ResourceTemplate("artverse://artists/{artistId}/orders", { list: undefined }),
    { description: "Get all orders for a specific artist's artworks" },
    async (uri, params) => {
      const orders = await storage.getOrdersByArtist(params.artistId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(orders, null, 2),
          },
        ],
      };
    }
  );

  mcp.resource(
    "blog-posts",
    "artverse://blog",
    { description: "List all published blog posts" },
    async () => ({
      contents: [
        {
          uri: "artverse://blog",
          mimeType: "application/json",
          text: JSON.stringify(await storage.getBlogPosts(), null, 2),
        },
      ],
    })
  );

  mcp.resource(
    "blog-posts-by-artist",
    new ResourceTemplate("artverse://artists/{artistId}/blog", { list: undefined }),
    { description: "Get all blog posts by a specific artist" },
    async (uri, params) => {
      const posts = await storage.getBlogPostsByArtist(params.artistId as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(posts, null, 2),
          },
        ],
      };
    }
  );

  mcp.resource(
    "artist-gallery",
    new ResourceTemplate("artverse://artists/{artistId}/gallery", { list: undefined }),
    { description: "Get an artist's personal gallery layout and exhibition-ready artworks" },
    async (uri, params) => {
      const artistId = params.artistId as string;
      const [artist, artworks] = await Promise.all([
        storage.getArtist(artistId),
        storage.getExhibitionReadyArtworks(artistId),
      ]);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ galleryLayout: artist?.galleryLayout, artworks }, null, 2),
          },
        ],
      };
    }
  );

  mcp.resource(
    "exhibitions",
    "artverse://exhibitions",
    { description: "List all exhibitions" },
    async () => ({
      contents: [
        {
          uri: "artverse://exhibitions",
          mimeType: "application/json",
          text: JSON.stringify(await storage.getExhibitions(), null, 2),
        },
      ],
    })
  );

  // ─── TOOLS ───────────────────────────────────────────────────

  mcp.tool(
    "create_artwork",
    "Create a new artwork listing for an artist",
    {
      artistId: z.string().describe("The artist's ID"),
      title: z.string().describe("Artwork title"),
      description: z.string().describe("Artwork description"),
      imageUrl: z.string().url().describe("URL of the artwork image"),
      price: z.string().describe("Price as a number string"),
      medium: z.string().describe("Art medium (e.g. Painting, Sculpture, Photography)"),
      category: z.string().describe("Category (e.g. Painting, Sculpture, Photography, Digital Art, Mixed Media, Drawing)"),
      dimensions: z.string().optional().describe("Physical dimensions"),
      year: z.number().optional().describe("Year created"),
      isForSale: z.boolean().optional().default(true).describe("Whether the artwork is for sale"),
      isReadyForExhibition: z.boolean().optional().default(false).describe("Whether ready for gallery exhibition"),
      exhibitionOrder: z.number().optional().describe("Order in gallery exhibition"),
    },
    async (args) => {
      try {
        const artist = await storage.getArtist(args.artistId);
        if (!artist) {
          return { content: [{ type: "text", text: "Error: Artist not found" }], isError: true };
        }
        const artwork = await storage.createArtwork({
          artistId: args.artistId,
          title: args.title,
          description: args.description,
          imageUrl: args.imageUrl,
          price: args.price,
          medium: args.medium,
          category: args.category,
          dimensions: args.dimensions,
          year: args.year,
          isForSale: args.isForSale,
          isReadyForExhibition: args.isReadyForExhibition,
          exhibitionOrder: args.exhibitionOrder,
        });
        if (args.isReadyForExhibition) {
          await storage.regenerateArtistGallery(args.artistId);
        }
        return {
          content: [{ type: "text", text: JSON.stringify(artwork, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "update_artwork",
    "Update an existing artwork's details",
    {
      artworkId: z.string().describe("The artwork's ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      imageUrl: z.string().url().optional().describe("New image URL"),
      price: z.string().optional().describe("New price"),
      medium: z.string().optional().describe("New medium"),
      category: z.string().optional().describe("New category"),
      dimensions: z.string().optional().describe("New dimensions"),
      year: z.number().optional().describe("New year"),
      isForSale: z.boolean().optional().describe("Update sale status"),
      isReadyForExhibition: z.boolean().optional().describe("Update exhibition readiness"),
      exhibitionOrder: z.number().optional().describe("Update exhibition order"),
    },
    async (args) => {
      try {
        const { artworkId, ...updates } = args;
        const existing = await storage.getArtwork(artworkId);
        if (!existing) {
          return { content: [{ type: "text", text: "Error: Artwork not found" }], isError: true };
        }
        const filteredUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        const artwork = await storage.updateArtwork(artworkId, filteredUpdates);
        if (args.isReadyForExhibition !== undefined) {
          await storage.regenerateArtistGallery(existing.artistId);
        }
        return {
          content: [{ type: "text", text: JSON.stringify(artwork, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "delete_artwork",
    "Delete an artwork by ID",
    {
      artworkId: z.string().describe("The artwork's ID to delete"),
    },
    async (args) => {
      try {
        const existing = await storage.getArtwork(args.artworkId);
        if (!existing) {
          return { content: [{ type: "text", text: "Error: Artwork not found" }], isError: true };
        }
        const deleted = await storage.deleteArtwork(args.artworkId);
        if (deleted && existing.isReadyForExhibition) {
          await storage.regenerateArtistGallery(existing.artistId);
        }
        return {
          content: [{ type: "text", text: deleted ? "Artwork deleted successfully" : "Failed to delete artwork" }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "place_bid",
    "Place a bid on an auction",
    {
      auctionId: z.string().describe("The auction ID"),
      bidderName: z.string().describe("Name of the bidder"),
      amount: z.string().describe("Bid amount as a number string"),
    },
    async (args) => {
      try {
        const auction = await storage.getAuction(args.auctionId);
        if (!auction) {
          return { content: [{ type: "text", text: "Error: Auction not found" }], isError: true };
        }
        if (auction.status !== "live") {
          return { content: [{ type: "text", text: "Error: Auction is not currently live" }], isError: true };
        }
        const bidAmount = parseFloat(args.amount);
        const currentBid = auction.currentBid ? parseFloat(auction.currentBid) : parseFloat(auction.startingPrice);
        const minIncrement = parseFloat(auction.minimumIncrement);
        if (bidAmount < currentBid + minIncrement) {
          return {
            content: [{ type: "text", text: `Error: Bid must be at least ${currentBid + minIncrement}. Current bid: ${currentBid}, minimum increment: ${minIncrement}` }],
            isError: true,
          };
        }
        const bid = await storage.createBid({
          auctionId: args.auctionId,
          bidderName: args.bidderName,
          amount: args.amount,
        });
        await storage.updateAuction(args.auctionId, { currentBid: args.amount });
        return {
          content: [{ type: "text", text: JSON.stringify(bid, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "update_order_status",
    "Update an order's status through the workflow (pending → communicating → sending → closed, or cancel)",
    {
      orderId: z.string().describe("The order ID"),
      newStatus: z.enum(["pending", "communicating", "sending", "closed", "canceled"]).describe("The new status"),
    },
    async (args) => {
      try {
        const order = await storage.getOrder(args.orderId);
        if (!order) {
          return { content: [{ type: "text", text: "Error: Order not found" }], isError: true };
        }
        const allowed = ORDER_TRANSITIONS[order.status];
        if (!allowed || !allowed.includes(args.newStatus)) {
          return {
            content: [{ type: "text", text: `Error: Cannot transition from '${order.status}' to '${args.newStatus}'. Allowed: ${allowed?.join(", ") || "none"}` }],
            isError: true,
          };
        }
        const updated = await storage.updateOrderStatus(args.orderId, args.newStatus);
        return {
          content: [{ type: "text", text: JSON.stringify(updated, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "create_order",
    "Create a new order to purchase an artwork",
    {
      artworkId: z.string().describe("The artwork ID to purchase"),
      buyerName: z.string().describe("Buyer's full name"),
      buyerEmail: z.string().email().describe("Buyer's email address"),
      shippingAddress: z.string().describe("Shipping address"),
    },
    async (args) => {
      try {
        const artwork = await storage.getArtwork(args.artworkId);
        if (!artwork) {
          return { content: [{ type: "text", text: "Error: Artwork not found" }], isError: true };
        }
        if (!artwork.isForSale) {
          return { content: [{ type: "text", text: "Error: Artwork is not for sale" }], isError: true };
        }
        const order = await storage.createOrder({
          artworkId: args.artworkId,
          buyerName: args.buyerName,
          buyerEmail: args.buyerEmail,
          shippingAddress: args.shippingAddress,
          totalAmount: artwork.price,
          status: "pending",
        });
        await storage.updateArtwork(args.artworkId, { isForSale: false });
        return {
          content: [{ type: "text", text: JSON.stringify(order, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "update_artist_profile",
    "Update an artist's profile information",
    {
      artistId: z.string().describe("The artist's ID"),
      name: z.string().optional().describe("New display name"),
      bio: z.string().optional().describe("New biography"),
      avatarUrl: z.string().url().optional().describe("New avatar URL"),
      country: z.string().optional().describe("Country"),
      specialization: z.string().optional().describe("Art specialization"),
      email: z.string().email().optional().describe("Contact email"),
      socialLinks: z.record(z.string()).optional().describe("Social media links as key-value pairs (e.g. { instagram: 'url', website: 'url' })"),
    },
    async (args) => {
      try {
        const { artistId, ...updates } = args;
        const existing = await storage.getArtist(artistId);
        if (!existing) {
          return { content: [{ type: "text", text: "Error: Artist not found" }], isError: true };
        }
        const filteredUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        const artist = await storage.updateArtist(artistId, filteredUpdates);
        return {
          content: [{ type: "text", text: JSON.stringify(artist, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "create_blog_post",
    "Create a new blog post for an artist",
    {
      artistId: z.string().describe("The artist's ID"),
      title: z.string().describe("Blog post title"),
      content: z.string().describe("Blog post content (supports markdown)"),
      excerpt: z.string().optional().describe("Short excerpt/summary"),
      coverImageUrl: z.string().url().optional().describe("Cover image URL"),
      isPublished: z.boolean().optional().default(false).describe("Whether to publish immediately"),
    },
    async (args) => {
      try {
        const artist = await storage.getArtist(args.artistId);
        if (!artist) {
          return { content: [{ type: "text", text: "Error: Artist not found" }], isError: true };
        }
        const post = await storage.createBlogPost({
          artistId: args.artistId,
          title: args.title,
          content: args.content,
          excerpt: args.excerpt,
          coverImageUrl: args.coverImageUrl,
          isPublished: args.isPublished,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(post, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "update_blog_post",
    "Update an existing blog post",
    {
      postId: z.string().describe("The blog post ID"),
      title: z.string().optional().describe("New title"),
      content: z.string().optional().describe("New content"),
      excerpt: z.string().optional().describe("New excerpt"),
      coverImageUrl: z.string().url().optional().describe("New cover image URL"),
      isPublished: z.boolean().optional().describe("Publish or unpublish"),
    },
    async (args) => {
      try {
        const { postId, ...updates } = args;
        const existing = await storage.getBlogPost(postId);
        if (!existing) {
          return { content: [{ type: "text", text: "Error: Blog post not found" }], isError: true };
        }
        const filteredUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        const post = await storage.updateBlogPost(postId, filteredUpdates);
        return {
          content: [{ type: "text", text: JSON.stringify(post, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "delete_blog_post",
    "Delete a blog post by ID",
    {
      postId: z.string().describe("The blog post ID to delete"),
    },
    async (args) => {
      try {
        const deleted = await storage.deleteBlogPost(args.postId);
        return {
          content: [{ type: "text", text: deleted ? "Blog post deleted successfully" : "Blog post not found" }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "search_artworks",
    "Search artworks by title, medium, category, or artist name",
    {
      query: z.string().optional().describe("Search term to match against title or description"),
      category: z.string().optional().describe("Filter by category"),
      medium: z.string().optional().describe("Filter by medium"),
      forSaleOnly: z.boolean().optional().default(false).describe("Only show artworks for sale"),
      artistId: z.string().optional().describe("Filter by artist ID"),
    },
    async (args) => {
      try {
        let artworks = await storage.getArtworks();
        if (args.artistId) {
          artworks = artworks.filter((a) => a.artistId === args.artistId);
        }
        if (args.category) {
          artworks = artworks.filter((a) => a.category.toLowerCase() === args.category!.toLowerCase());
        }
        if (args.medium) {
          artworks = artworks.filter((a) => a.medium.toLowerCase().includes(args.medium!.toLowerCase()));
        }
        if (args.forSaleOnly) {
          artworks = artworks.filter((a) => a.isForSale);
        }
        if (args.query) {
          const q = args.query.toLowerCase();
          artworks = artworks.filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              a.description.toLowerCase().includes(q) ||
              a.artist.name.toLowerCase().includes(q)
          );
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                artworks.map((a) => ({
                  id: a.id,
                  title: a.title,
                  artist: a.artist.name,
                  price: a.price,
                  medium: a.medium,
                  category: a.category,
                  isForSale: a.isForSale,
                })),
                null,
                2
              ),
            },
          ],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "regenerate_gallery",
    "Regenerate an artist's 3D gallery layout based on their exhibition-ready artworks",
    {
      artistId: z.string().describe("The artist's ID"),
    },
    async (args) => {
      try {
        const artist = await storage.getArtist(args.artistId);
        if (!artist) {
          return { content: [{ type: "text", text: "Error: Artist not found" }], isError: true };
        }
        const layout = await storage.regenerateArtistGallery(args.artistId);
        return {
          content: [{ type: "text", text: JSON.stringify(layout, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  mcp.tool(
    "get_logs",
    "Query application logs with optional filters. Returns structured JSON log entries.",
    {
      limit: z.number().optional().default(100).describe("Max entries to return (default 100, max 2000)"),
      level: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).optional().describe("Minimum log level"),
      module: z.string().optional().describe("Filter by module (e.g. auth, mcp, seed)"),
      search: z.string().optional().describe("Text search across log entries"),
      since: z.string().optional().describe("ISO timestamp — only return entries after this time"),
    },
    async (args) => {
      try {
        const maxEntries = Math.min(args.limit ?? 100, 2000);
        const pinoLevels: Record<string, number> = {
          fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10,
        };
        const minLevel = args.level ? (pinoLevels[args.level] ?? 0) : 0;
        const sinceMs = args.since ? new Date(args.since).getTime() : 0;

        if (!fs.existsSync(logFilePath)) {
          return { content: [{ type: "text", text: JSON.stringify({ entries: [], total: 0 }) }] };
        }

        const entries: object[] = [];
        const fileStream = fs.createReadStream(logFilePath, { encoding: "utf-8" });
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        for await (const line of rl) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);
            if (minLevel && (entry.level ?? 0) < minLevel) continue;
            if (args.module && entry.module !== args.module) continue;
            if (sinceMs && new Date(entry.time).getTime() < sinceMs) continue;
            if (args.search && !line.toLowerCase().includes(args.search.toLowerCase())) continue;
            entries.push(entry);
          } catch {
            // skip malformed lines
          }
        }

        const tail = entries.slice(-maxEntries);
        return {
          content: [{ type: "text", text: JSON.stringify({ entries: tail, total: entries.length }, null, 2) }],
        };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
      }
    }
  );

  // ─── PROMPTS ─────────────────────────────────────────────────

  mcp.prompt(
    "artwork_description",
    "Generate a compelling artwork description for gallery or store listing",
    {
      title: z.string().describe("The artwork's title"),
      medium: z.string().describe("The art medium used"),
      artistName: z.string().describe("The artist's name"),
      style: z.string().optional().describe("Art style or movement"),
      dimensions: z.string().optional().describe("Physical dimensions"),
      inspiration: z.string().optional().describe("Artist's inspiration or intent"),
    },
    (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Write a compelling, evocative description for an artwork to be listed in an art gallery and store.

Artwork Details:
- Title: "${args.title}"
- Medium: ${args.medium}
- Artist: ${args.artistName}
${args.style ? `- Style: ${args.style}` : ""}
${args.dimensions ? `- Dimensions: ${args.dimensions}` : ""}
${args.inspiration ? `- Inspiration: ${args.inspiration}` : ""}

Write 2-3 paragraphs that capture the essence of the piece, its visual qualities, emotional resonance, and artistic significance. Use language that is accessible yet sophisticated, appealing to both collectors and casual art enthusiasts.`,
          },
        },
      ],
    })
  );

  mcp.prompt(
    "blog_draft",
    "Draft a blog post for an artist's profile",
    {
      artistName: z.string().describe("The artist's name"),
      topic: z.string().describe("Blog post topic or theme"),
      tone: z.string().optional().describe("Writing tone (e.g. reflective, educational, casual)"),
      keyPoints: z.string().optional().describe("Key points to cover, comma-separated"),
    },
    (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Draft a blog post for the artist ${args.artistName}'s profile on ArtVerse.

Topic: ${args.topic}
${args.tone ? `Tone: ${args.tone}` : "Tone: reflective and personal"}
${args.keyPoints ? `Key points to cover: ${args.keyPoints}` : ""}

Write the post in first person from the artist's perspective. Include:
- An engaging opening that draws readers in
- Thoughtful insights about the creative process or topic
- Personal anecdotes or reflections where appropriate
- A conclusion that invites engagement

Format with a compelling title, and structure with clear paragraphs. Keep it between 400-800 words.`,
          },
        },
      ],
    })
  );

  mcp.prompt(
    "order_summary",
    "Generate a summary of an artist's recent orders and sales activity",
    {
      artistId: z.string().describe("The artist's ID to summarize orders for"),
    },
    async (args) => {
      const orders = await storage.getOrdersByArtist(args.artistId);
      const artist = await storage.getArtist(args.artistId);
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Analyze and summarize the following sales data for artist "${artist?.name || args.artistId}":

Orders Data:
${JSON.stringify(orders, null, 2)}

Provide:
1. Total number of orders and their status breakdown
2. Total revenue
3. Most popular artworks sold
4. Any patterns or insights about buyer behavior
5. Recommendations for the artist to increase sales

Keep the summary clear and actionable.`,
            },
          },
        ],
      };
    }
  );

  mcp.prompt(
    "artist_bio",
    "Help write or improve an artist's biography",
    {
      name: z.string().describe("The artist's name"),
      specialization: z.string().optional().describe("Art specialization"),
      country: z.string().optional().describe("Country of origin"),
      existingBio: z.string().optional().describe("Current biography to improve"),
      highlights: z.string().optional().describe("Career highlights, exhibitions, awards"),
    },
    (args) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Write a professional artist biography for ${args.name} to display on their ArtVerse profile.

${args.specialization ? `Specialization: ${args.specialization}` : ""}
${args.country ? `Based in: ${args.country}` : ""}
${args.existingBio ? `Current bio to improve: ${args.existingBio}` : ""}
${args.highlights ? `Career highlights: ${args.highlights}` : ""}

Write a compelling 2-3 paragraph biography that:
- Opens with the artist's identity and artistic focus
- Describes their artistic philosophy and approach
- Mentions notable achievements or influences
- Concludes with their current focus or aspirations

Use third person, present tense. Keep it professional yet warm and engaging.`,
          },
        },
      ],
    })
  );

  return mcp;
}

const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

export function registerMcpRoutes(app: Express) {
  app.post("/mcp", isAuthenticated, async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      try {
        await session.transport.handleRequest(req, res, req.body);
      } catch (e: any) {
        logger.error({ err: e }, "MCP session error");
        if (!res.headersSent) {
          res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" } });
        }
      }
      return;
    }

    if (sessionId && !sessions.has(sessionId)) {
      res.status(404).json({ jsonrpc: "2.0", error: { code: -32000, message: "Session not found" } });
      return;
    }

    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id: string) => {
          sessions.set(id, { transport, server: mcpServer });
        },
      });
      const mcpServer = createMcpServer();

      transport.onclose = () => {
        if (transport.sessionId) {
          sessions.delete(transport.sessionId);
        }
      };

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (e: any) {
      logger.error({ err: e }, "MCP init error");
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Initialization failed" } });
      }
    }
  });

  app.get("/mcp", isAuthenticated, async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(404).json({ jsonrpc: "2.0", error: { code: -32000, message: "Session not found" } });
      return;
    }
    try {
      await sessions.get(sessionId)!.transport.handleRequest(req, res);
    } catch (e: any) {
      logger.error({ err: e }, "MCP GET error");
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" } });
      }
    }
  });

  app.delete("/mcp", isAuthenticated, async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(404).json({ jsonrpc: "2.0", error: { code: -32000, message: "Session not found" } });
      return;
    }
    try {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res);
    } catch (e: any) {
      logger.error({ err: e }, "MCP DELETE error");
      if (!res.headersSent) {
        res.status(200).end();
      }
    }
  });
}
