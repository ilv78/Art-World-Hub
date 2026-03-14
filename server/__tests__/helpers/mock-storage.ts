import { vi } from "vitest";
import type { IStorage } from "../../storage";

export function createMockStorage(): IStorage {
  return {
    // Artists
    getArtists: vi.fn().mockResolvedValue([]),
    getArtist: vi.fn().mockResolvedValue(undefined),
    getArtistByUserId: vi.fn().mockResolvedValue(undefined),
    createArtist: vi.fn().mockResolvedValue({}),
    updateArtist: vi.fn().mockResolvedValue(undefined),

    // Artworks
    getArtworks: vi.fn().mockResolvedValue([]),
    getArtwork: vi.fn().mockResolvedValue(undefined),
    getArtworksByArtist: vi.fn().mockResolvedValue([]),
    createArtwork: vi.fn().mockResolvedValue({}),
    updateArtwork: vi.fn().mockResolvedValue(undefined),
    deleteArtwork: vi.fn().mockResolvedValue(false),

    // Auctions
    getAuctions: vi.fn().mockResolvedValue([]),
    getAuction: vi.fn().mockResolvedValue(undefined),
    createAuction: vi.fn().mockResolvedValue({}),
    updateAuction: vi.fn().mockResolvedValue(undefined),

    // Bids
    getBidsByAuction: vi.fn().mockResolvedValue([]),
    createBid: vi.fn().mockResolvedValue({}),

    // Orders
    getOrders: vi.fn().mockResolvedValue([]),
    getOrdersByArtist: vi.fn().mockResolvedValue([]),
    getOrder: vi.fn().mockResolvedValue(undefined),
    createOrder: vi.fn().mockResolvedValue({}),
    updateOrderStatus: vi.fn().mockResolvedValue(undefined),

    // Exhibitions
    getExhibitions: vi.fn().mockResolvedValue([]),
    getExhibition: vi.fn().mockResolvedValue(undefined),
    getActiveExhibition: vi.fn().mockResolvedValue(undefined),
    createExhibition: vi.fn().mockResolvedValue({}),
    addArtworkToExhibition: vi.fn().mockResolvedValue({}),

    // Blog Posts
    getBlogPosts: vi.fn().mockResolvedValue([]),
    getBlogPost: vi.fn().mockResolvedValue(undefined),
    getBlogPostsByArtist: vi.fn().mockResolvedValue([]),
    createBlogPost: vi.fn().mockResolvedValue({}),
    updateBlogPost: vi.fn().mockResolvedValue(undefined),
    deleteBlogPost: vi.fn().mockResolvedValue(false),

    // Gallery
    getExhibitionReadyArtworks: vi.fn().mockResolvedValue([]),
    regenerateArtistGallery: vi.fn().mockResolvedValue({ width: 3, height: 3, cells: [], spawnPoint: { x: 1, z: 1 } }),

    // Admin
    getUsers: vi.fn().mockResolvedValue([]),
    updateUserRole: vi.fn().mockResolvedValue(undefined),
    deleteArtist: vi.fn().mockResolvedValue(false),
    deleteExhibition: vi.fn().mockResolvedValue(false),
    getAllBlogPosts: vi.fn().mockResolvedValue([]),
  };
}
