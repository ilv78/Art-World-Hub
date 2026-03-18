import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (users and sessions tables)
export * from "./models/auth";

// Artists table - linked to authenticated users
export const artists = pgTable("artists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  bio: text("bio").notNull(),
  avatarUrl: text("avatar_url"),
  country: text("country"),
  specialization: text("specialization"),
  email: text("email"),
  galleryLayout: jsonb("gallery_layout"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>(),
});

export const insertArtistSchema = createInsertSchema(artists).omit({ id: true });
export const updateArtistSchema = insertArtistSchema.partial().omit({ userId: true });
export type InsertArtist = z.infer<typeof insertArtistSchema>;
export type Artist = typeof artists.$inferSelect;

// Artworks table
export const artworks = pgTable("artworks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  artistId: varchar("artist_id").references(() => artists.id).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  medium: text("medium").notNull(),
  dimensions: text("dimensions"),
  year: integer("year"),
  isForSale: boolean("is_for_sale").default(true),
  isInGallery: boolean("is_in_gallery").default(true),
  isReadyForExhibition: boolean("is_ready_for_exhibition").default(false),
  exhibitionOrder: integer("exhibition_order"),
  category: text("category").notNull(),
});

export const insertArtworkSchema = createInsertSchema(artworks).omit({ id: true });
export const updateArtworkSchema = insertArtworkSchema.partial().omit({ artistId: true });
export type InsertArtwork = z.infer<typeof insertArtworkSchema>;
export type Artwork = typeof artworks.$inferSelect;

// Auctions table
export const auctions = pgTable("auctions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artworkId: varchar("artwork_id").references(() => artworks.id).notNull(),
  startingPrice: decimal("starting_price", { precision: 10, scale: 2 }).notNull(),
  currentBid: decimal("current_bid", { precision: 10, scale: 2 }),
  minimumIncrement: decimal("minimum_increment", { precision: 10, scale: 2 }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("upcoming"),
  winnerName: text("winner_name"),
});

export const insertAuctionSchema = createInsertSchema(auctions).omit({ id: true });
export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type Auction = typeof auctions.$inferSelect;

// Bids table
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auctionId: varchar("auction_id").references(() => auctions.id).notNull(),
  bidderName: text("bidder_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertBidSchema = createInsertSchema(bids).omit({ id: true, timestamp: true });
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;

// Exhibitions table - defines customizable gallery layouts
export const exhibitions = pgTable("exhibitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  layout: text("layout").notNull(), // JSON string defining maze layout
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExhibitionSchema = createInsertSchema(exhibitions).omit({ id: true, createdAt: true });
export type InsertExhibition = z.infer<typeof insertExhibitionSchema>;
export type Exhibition = typeof exhibitions.$inferSelect;

// Exhibition artworks - which artworks are in which exhibition and their wall placement
export const exhibitionArtworks = pgTable("exhibition_artworks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exhibitionId: varchar("exhibition_id").references(() => exhibitions.id).notNull(),
  artworkId: varchar("artwork_id").references(() => artworks.id).notNull(),
  wallId: text("wall_id").notNull(), // Which wall in the maze
  position: integer("position").notNull(), // Position on the wall
});

export const insertExhibitionArtworkSchema = createInsertSchema(exhibitionArtworks).omit({ id: true });
export type InsertExhibitionArtwork = z.infer<typeof insertExhibitionArtworkSchema>;
export type ExhibitionArtwork = typeof exhibitionArtworks.$inferSelect;

// Blog posts table - artists can share their thoughts and present themselves
export const blogPosts = pgTable("blog_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").references(() => artists.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  coverImageUrl: text("cover_image_url"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({ id: true, createdAt: true, updatedAt: true });
export const updateBlogPostSchema = insertBlogPostSchema.partial().omit({ artistId: true });
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artworkId: varchar("artwork_id").references(() => artworks.id).notNull(),
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ORDER_STATUSES = ["pending", "communicating", "sending", "closed", "canceled"] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ["communicating", "canceled"],
  communicating: ["sending", "canceled"],
  sending: ["closed", "canceled"],
  closed: ["canceled"],
  canceled: [],
};

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type OrderWithArtwork = Order & { artwork: ArtworkWithArtist };

// Extended types for frontend
export type ArtworkWithArtist = Artwork & { artist: Artist };
export type AuctionWithArtwork = Auction & { artwork: ArtworkWithArtist };
export type ExhibitionWithArtworks = Exhibition & { 
  artworks: (ExhibitionArtwork & { artwork: ArtworkWithArtist })[] 
};
export type BlogPostWithArtist = BlogPost & { artist: Artist };
export type ArtistWithStats = Artist & { 
  artworkCount: number; 
  blogPostCount: number;
};

// Curator galleries - curated collections of artworks from any artist
export const curatorGalleries = pgTable("curator_galleries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  curatorId: varchar("curator_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  galleryLayout: jsonb("gallery_layout"),
  isPublished: boolean("is_published").default(false),
  timezone: text("timezone").default("UTC"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCuratorGallerySchema = createInsertSchema(curatorGalleries).omit({ id: true, createdAt: true, updatedAt: true });
export const updateCuratorGallerySchema = insertCuratorGallerySchema.partial().omit({ curatorId: true });
export type InsertCuratorGallery = z.infer<typeof insertCuratorGallerySchema>;
export type CuratorGallery = typeof curatorGalleries.$inferSelect;

// Curator gallery artworks - which artworks are in which curator gallery
export const curatorGalleryArtworks = pgTable("curator_gallery_artworks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  galleryId: varchar("gallery_id").references(() => curatorGalleries.id).notNull(),
  artworkId: varchar("artwork_id").references(() => artworks.id).notNull(),
  displayOrder: integer("display_order").notNull(),
});

export const insertCuratorGalleryArtworkSchema = createInsertSchema(curatorGalleryArtworks).omit({ id: true });
export type InsertCuratorGalleryArtwork = z.infer<typeof insertCuratorGalleryArtworkSchema>;
export type CuratorGalleryArtwork = typeof curatorGalleryArtworks.$inferSelect;

export type CuratorGalleryWithArtworks = CuratorGallery & {
  artworks: ArtworkWithArtist[];
  curator: { id: string; firstName: string | null; lastName: string | null };
};

// Layout types for the 3D maze
export interface MazeCell {
  x: number;
  z: number;
  walls: { north: boolean; south: boolean; east: boolean; west: boolean };
  artworkSlots: { wallId: string; position: number }[];
}

export interface MazeLayout {
  width: number;
  height: number;
  cells: MazeCell[];
  spawnPoint: { x: number; z: number };
}
