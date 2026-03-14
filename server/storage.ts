import {
  type Artist, type InsertArtist,
  type Artwork, type InsertArtwork,
  type Auction, type InsertAuction,
  type Bid, type InsertBid,
  type Order, type InsertOrder, type OrderWithArtwork,
  type Exhibition, type InsertExhibition,
  type ExhibitionArtwork, type InsertExhibitionArtwork,
  type BlogPost, type InsertBlogPost,
  type ArtworkWithArtist,
  type AuctionWithArtwork,
  type ExhibitionWithArtworks,
  type BlogPostWithArtist,
  type MazeLayout,
  type MazeCell,
  artists, artworks, auctions, bids, orders, exhibitions, exhibitionArtworks, blogPosts
} from "@shared/schema";
import { type User, type UserRole, users } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, asc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Artists
  getArtists(): Promise<Artist[]>;
  getArtist(id: string): Promise<Artist | undefined>;
  getArtistByUserId(userId: string): Promise<Artist | undefined>;
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
  getOrdersByArtist(artistId: string): Promise<OrderWithArtwork[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  
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
  
  // Gallery
  getExhibitionReadyArtworks(artistId: string): Promise<ArtworkWithArtist[]>;
  regenerateArtistGallery(artistId: string): Promise<MazeLayout>;

  // Admin
  getUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: UserRole): Promise<User | undefined>;
  deleteArtist(id: string): Promise<boolean>;
  deleteExhibition(id: string): Promise<boolean>;
  getAllBlogPosts(): Promise<BlogPostWithArtist[]>;
}

export class DatabaseStorage implements IStorage {
  // Artists
  async getArtists(): Promise<Artist[]> {
    return db.select().from(artists);
  }

  async getArtist(id: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.id, id));
    return artist;
  }

  async getArtistByUserId(userId: string): Promise<Artist | undefined> {
    const [artist] = await db.select().from(artists).where(eq(artists.userId, userId));
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

  async getOrdersByArtist(artistId: string): Promise<OrderWithArtwork[]> {
    const rows = await db
      .select()
      .from(orders)
      .innerJoin(artworks, eq(orders.artworkId, artworks.id))
      .innerJoin(artists, eq(artworks.artistId, artists.id))
      .where(eq(artworks.artistId, artistId))
      .orderBy(desc(orders.createdAt));

    return rows.map(row => ({
      ...row.orders,
      artwork: { ...row.artworks, artist: row.artists },
    }));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
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
    await db.delete(exhibitionArtworks).where(eq(exhibitionArtworks.artworkId, id));
    await db.delete(bids).where(
      sql`${bids.auctionId} IN (SELECT id FROM auctions WHERE artwork_id = ${id})`
    );
    await db.delete(auctions).where(eq(auctions.artworkId, id));
    await db.delete(orders).where(eq(orders.artworkId, id));
    const result = await db.delete(artworks).where(eq(artworks.id, id)).returning();
    return result.length > 0;
  }

  async getExhibitionReadyArtworks(artistId: string): Promise<ArtworkWithArtist[]> {
    const result = await db
      .select()
      .from(artworks)
      .innerJoin(artists, eq(artworks.artistId, artists.id))
      .where(and(eq(artworks.artistId, artistId), eq(artworks.isReadyForExhibition, true)))
      .orderBy(asc(artworks.exhibitionOrder), asc(artworks.title));

    return result.map(({ artworks: artwork, artists: artist }) => ({
      ...artwork,
      artist,
    }));
  }

  async regenerateArtistGallery(artistId: string): Promise<MazeLayout> {
    const readyArtworks = await this.getExhibitionReadyArtworks(artistId);
    const layout = generateWhiteRoomLayout(readyArtworks.length);
    await db.update(artists).set({ galleryLayout: layout }).where(eq(artists.id, artistId));
    return layout;
  }

  // Admin
  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteArtist(id: string): Promise<boolean> {
    // Delete all related data in dependency order
    const artistArtworks = await db.select({ id: artworks.id }).from(artworks).where(eq(artworks.artistId, id));
    for (const aw of artistArtworks) {
      await this.deleteArtwork(aw.id);
    }
    // Delete blog posts by this artist
    await db.delete(blogPosts).where(eq(blogPosts.artistId, id));
    // Delete the artist
    const result = await db.delete(artists).where(eq(artists.id, id)).returning();
    return result.length > 0;
  }

  async getAllBlogPosts(): Promise<BlogPostWithArtist[]> {
    const result = await db
      .select()
      .from(blogPosts)
      .innerJoin(artists, eq(blogPosts.artistId, artists.id))
      .orderBy(desc(blogPosts.createdAt));

    return result.map(({ blog_posts: post, artists: artist }) => ({
      ...post,
      artist,
    }));
  }

  async deleteExhibition(id: string): Promise<boolean> {
    await db.delete(exhibitionArtworks).where(eq(exhibitionArtworks.exhibitionId, id));
    const result = await db.delete(exhibitions).where(eq(exhibitions.id, id)).returning();
    return result.length > 0;
  }
}

export function generateWhiteRoomLayout(artworkCount: number): MazeLayout {
  const totalSlots = artworkCount > 0 ? artworkCount + 1 : 0;
  // +1 accounts for the door consuming one south wall slot
  const wallsPerSide = Math.max(1, Math.ceil((totalSlots + 1) / 4));
  const roomWidth = Math.max(3, wallsPerSide + 2);
  const roomHeight = Math.max(3, wallsPerSide + 2);

  const cells: MazeCell[] = [];
  for (let z = 0; z < roomHeight; z++) {
    for (let x = 0; x < roomWidth; x++) {
      cells.push({
        x,
        z,
        walls: {
          south: z === 0,
          north: z === roomHeight - 1,
          west: x === 0,
          east: x === roomWidth - 1,
        },
        artworkSlots: [],
      });
    }
  }

  if (artworkCount === 0) {
    return { width: roomWidth, height: roomHeight, spawnPoint: { x: Math.floor(roomWidth / 2), z: Math.max(0, roomHeight - 3) }, cells };
  }

  const getCell = (cx: number, cz: number) => cells.find(c => c.x === cx && c.z === cz)!;

  const orderedSlots: { x: number; z: number; wall: string }[] = [];
  const doorCenterX = Math.floor(roomWidth / 2);

  for (let x = roomWidth - 2; x >= 1; x--) {
    orderedSlots.push({ x, z: roomHeight - 1, wall: "north" });
  }
  for (let z = roomHeight - 2; z >= 1; z--) {
    orderedSlots.push({ x: 0, z, wall: "west" });
  }
  for (let x = 1; x < roomWidth - 1; x++) {
    if (x === doorCenterX) continue;
    orderedSlots.push({ x, z: 0, wall: "south" });
  }
  for (let z = 1; z < roomHeight - 1; z++) {
    orderedSlots.push({ x: roomWidth - 1, z, wall: "east" });
  }

  for (let i = 0; i < Math.min(totalSlots, orderedSlots.length); i++) {
    const slot = orderedSlots[i];
    const cell = getCell(slot.x, slot.z);
    cell.artworkSlots.push({ wallId: `${slot.x}-${slot.z}-${slot.wall}`, position: i });
  }

  return {
    width: roomWidth,
    height: roomHeight,
    spawnPoint: { x: Math.floor(roomWidth / 2), z: Math.max(0, roomHeight - 3) },
    cells,
  };
}

export const storage = new DatabaseStorage();
