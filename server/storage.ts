import { 
  type User, type InsertUser,
  type Artist, type InsertArtist,
  type Artwork, type InsertArtwork,
  type Auction, type InsertAuction,
  type Bid, type InsertBid,
  type Order, type InsertOrder,
  type Exhibition, type InsertExhibition,
  type ExhibitionArtwork, type InsertExhibitionArtwork,
  type BlogPost, type InsertBlogPost,
  type ArtworkWithArtist,
  type AuctionWithArtwork,
  type ExhibitionWithArtworks,
  type BlogPostWithArtist,
  users, artists, artworks, auctions, bids, orders, exhibitions, exhibitionArtworks, blogPosts
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Artists
  getArtists(): Promise<Artist[]>;
  getArtist(id: string): Promise<Artist | undefined>;
  createArtist(artist: InsertArtist): Promise<Artist>;
  
  // Artworks
  getArtworks(): Promise<ArtworkWithArtist[]>;
  getArtwork(id: string): Promise<ArtworkWithArtist | undefined>;
  getArtworksByArtist(artistId: string): Promise<ArtworkWithArtist[]>;
  createArtwork(artwork: InsertArtwork): Promise<Artwork>;
  updateArtwork(id: string, artwork: Partial<InsertArtwork>): Promise<Artwork | undefined>;
  
  // Auctions
  getAuctions(): Promise<AuctionWithArtwork[]>;
  getAuction(id: string): Promise<AuctionWithArtwork | undefined>;
  createAuction(auction: InsertAuction): Promise<Auction>;
  updateAuction(id: string, auction: Partial<InsertAuction>): Promise<Auction | undefined>;
  
  // Bids
  getBidsByAuction(auctionId: string): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  
  // Orders
  getOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  
  // Exhibitions
  getExhibitions(): Promise<Exhibition[]>;
  getExhibition(id: string): Promise<ExhibitionWithArtworks | undefined>;
  getActiveExhibition(): Promise<ExhibitionWithArtworks | undefined>;
  createExhibition(exhibition: InsertExhibition): Promise<Exhibition>;
  addArtworkToExhibition(exhibitionArtwork: InsertExhibitionArtwork): Promise<ExhibitionArtwork>;
  
  // Blog Posts
  getBlogPosts(): Promise<BlogPostWithArtist[]>;
  getBlogPost(id: string): Promise<BlogPostWithArtist | undefined>;
  getBlogPostsByArtist(artistId: string): Promise<BlogPostWithArtist[]>;
  createBlogPost(blogPost: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: string, blogPost: Partial<InsertBlogPost>): Promise<BlogPost | undefined>;
  deleteBlogPost(id: string): Promise<boolean>;
  
  // Artist management
  updateArtist(id: string, artist: Partial<InsertArtist>): Promise<Artist | undefined>;
  deleteArtwork(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Artists
  async getArtists(): Promise<Artist[]> {
    return db.select().from(artists);
  }

  async getArtist(id: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist;
  }

  async createArtist(insertArtist: InsertArtist): Promise<Artist> {
    const [artist] = await db.insert(artists).values(insertArtist).returning();
    return artist;
  }

  // Artworks
  async getArtworks(): Promise<ArtworkWithArtist[]> {
    const result = await db
      .select()
      .from(artworks)
      .innerJoin(artists, eq(artworks.artistId, artists.id));
    
    return result.map(({ artworks: artwork, artists: artist }) => ({
      ...artwork,
      artist,
    }));
  }

  async getArtwork(id: string): Promise<ArtworkWithArtist | undefined> {
    const result = await db
      .select()
      .from(artworks)
      .innerJoin(artists, eq(artworks.artistId, artists.id))
      .where(eq(artworks.id, id));
    
    if (result.length === 0) return undefined;
    
    const { artworks: artwork, artists: artist } = result[0];
    return { ...artwork, artist };
  }

  async getArtworksByArtist(artistId: string): Promise<ArtworkWithArtist[]> {
    const result = await db
      .select()
      .from(artworks)
      .innerJoin(artists, eq(artworks.artistId, artists.id))
      .where(eq(artworks.artistId, artistId));
    
    return result.map(({ artworks: artwork, artists: artist }) => ({
      ...artwork,
      artist,
    }));
  }

  async createArtwork(insertArtwork: InsertArtwork): Promise<Artwork> {
    const [artwork] = await db.insert(artworks).values(insertArtwork).returning();
    return artwork;
  }

  async updateArtwork(id: string, updateData: Partial<InsertArtwork>): Promise<Artwork | undefined> {
    const [artwork] = await db
      .update(artworks)
      .set(updateData)
      .where(eq(artworks.id, id))
      .returning();
    return artwork;
  }

  // Auctions
  async getAuctions(): Promise<AuctionWithArtwork[]> {
    const result = await db
      .select()
      .from(auctions)
      .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
      .innerJoin(artists, eq(artworks.artistId, artists.id));
    
    return result.map(({ auctions: auction, artworks: artwork, artists: artist }) => ({
      ...auction,
      artwork: { ...artwork, artist },
    }));
  }

  async getAuction(id: string): Promise<AuctionWithArtwork | undefined> {
    const result = await db
      .select()
      .from(auctions)
      .innerJoin(artworks, eq(auctions.artworkId, artworks.id))
      .innerJoin(artists, eq(artworks.artistId, artists.id))
      .where(eq(auctions.id, id));
    
    if (result.length === 0) return undefined;
    
    const { auctions: auction, artworks: artwork, artists: artist } = result[0];
    return { ...auction, artwork: { ...artwork, artist } };
  }

  async createAuction(insertAuction: InsertAuction): Promise<Auction> {
    const [auction] = await db.insert(auctions).values(insertAuction).returning();
    return auction;
  }

  async updateAuction(id: string, updateData: Partial<InsertAuction>): Promise<Auction | undefined> {
    const [auction] = await db
      .update(auctions)
      .set(updateData)
      .where(eq(auctions.id, id))
      .returning();
    return auction;
  }

  // Bids
  async getBidsByAuction(auctionId: string): Promise<Bid[]> {
    return db
      .select()
      .from(bids)
      .where(eq(bids.auctionId, auctionId))
      .orderBy(desc(bids.timestamp));
  }

  async createBid(insertBid: InsertBid): Promise<Bid> {
    const [bid] = await db.insert(bids).values(insertBid).returning();
    return bid;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  // Exhibitions
  async getExhibitions(): Promise<Exhibition[]> {
    return db.select().from(exhibitions).orderBy(desc(exhibitions.createdAt));
  }

  async getExhibition(id: string): Promise<ExhibitionWithArtworks | undefined> {
    const [exhibition] = await db.select().from(exhibitions).where(eq(exhibitions.id, id));
    if (!exhibition) return undefined;

    const exhibitionArtworksList = await db
      .select()
      .from(exhibitionArtworks)
      .where(eq(exhibitionArtworks.exhibitionId, id));

    const artworksWithData = await Promise.all(
      exhibitionArtworksList.map(async (ea) => {
        const artwork = await this.getArtwork(ea.artworkId);
        return { ...ea, artwork: artwork! };
      })
    );

    return { ...exhibition, artworks: artworksWithData };
  }

  async getActiveExhibition(): Promise<ExhibitionWithArtworks | undefined> {
    const [exhibition] = await db
      .select()
      .from(exhibitions)
      .where(eq(exhibitions.isActive, true))
      .limit(1);
    
    if (!exhibition) return undefined;
    return this.getExhibition(exhibition.id);
  }

  async createExhibition(insertExhibition: InsertExhibition): Promise<Exhibition> {
    const [exhibition] = await db.insert(exhibitions).values(insertExhibition).returning();
    return exhibition;
  }

  async addArtworkToExhibition(insertExhibitionArtwork: InsertExhibitionArtwork): Promise<ExhibitionArtwork> {
    const [exhibitionArtwork] = await db.insert(exhibitionArtworks).values(insertExhibitionArtwork).returning();
    return exhibitionArtwork;
  }

  // Blog Posts
  async getBlogPosts(): Promise<BlogPostWithArtist[]> {
    const result = await db
      .select()
      .from(blogPosts)
      .innerJoin(artists, eq(blogPosts.artistId, artists.id))
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.createdAt));
    
    return result.map(({ blog_posts: post, artists: artist }) => ({
      ...post,
      artist,
    }));
  }

  async getBlogPost(id: string): Promise<BlogPostWithArtist | undefined> {
    const result = await db
      .select()
      .from(blogPosts)
      .innerJoin(artists, eq(blogPosts.artistId, artists.id))
      .where(eq(blogPosts.id, id));
    
    if (result.length === 0) return undefined;
    const { blog_posts: post, artists: artist } = result[0];
    return { ...post, artist };
  }

  async getBlogPostsByArtist(artistId: string): Promise<BlogPostWithArtist[]> {
    const result = await db
      .select()
      .from(blogPosts)
      .innerJoin(artists, eq(blogPosts.artistId, artists.id))
      .where(eq(blogPosts.artistId, artistId))
      .orderBy(desc(blogPosts.createdAt));
    
    return result.map(({ blog_posts: post, artists: artist }) => ({
      ...post,
      artist,
    }));
  }

  async createBlogPost(insertBlogPost: InsertBlogPost): Promise<BlogPost> {
    const [post] = await db.insert(blogPosts).values(insertBlogPost).returning();
    return post;
  }

  async updateBlogPost(id: string, updateData: Partial<InsertBlogPost>): Promise<BlogPost | undefined> {
    const [post] = await db
      .update(blogPosts)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(blogPosts.id, id))
      .returning();
    return post;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    const result = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning();
    return result.length > 0;
  }

  // Artist management
  async updateArtist(id: string, updateData: Partial<InsertArtist>): Promise<Artist | undefined> {
    const [artist] = await db
      .update(artists)
      .set(updateData)
      .where(eq(artists.id, id))
      .returning();
    return artist;
  }

  async deleteArtwork(id: string): Promise<boolean> {
    const result = await db.delete(artworks).where(eq(artworks.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
