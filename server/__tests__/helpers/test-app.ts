import { vi } from "vitest";
import type { IStorage } from "../../storage";

// vi.hoisted runs before vi.mock hoisting, so these are available in mock factories
const { mockStorage } = vi.hoisted(() => {
  const fn = vi.fn;
  const mockStorage: IStorage = {
    getArtists: fn().mockResolvedValue([]),
    getArtist: fn().mockResolvedValue(undefined),
    getArtistByUserId: fn().mockResolvedValue(undefined),
    createArtist: fn().mockResolvedValue({}),
    updateArtist: fn().mockResolvedValue(undefined),
    getArtworks: fn().mockResolvedValue([]),
    getArtwork: fn().mockResolvedValue(undefined),
    getArtworksByArtist: fn().mockResolvedValue([]),
    createArtwork: fn().mockResolvedValue({}),
    updateArtwork: fn().mockResolvedValue(undefined),
    deleteArtwork: fn().mockResolvedValue(false),
    getAuctions: fn().mockResolvedValue([]),
    getAuction: fn().mockResolvedValue(undefined),
    createAuction: fn().mockResolvedValue({}),
    updateAuction: fn().mockResolvedValue(undefined),
    getBidsByAuction: fn().mockResolvedValue([]),
    createBid: fn().mockResolvedValue({}),
    getOrders: fn().mockResolvedValue([]),
    getOrdersByArtist: fn().mockResolvedValue([]),
    getOrder: fn().mockResolvedValue(undefined),
    createOrder: fn().mockResolvedValue({}),
    updateOrderStatus: fn().mockResolvedValue(undefined),
    getExhibitions: fn().mockResolvedValue([]),
    getExhibition: fn().mockResolvedValue(undefined),
    getActiveExhibition: fn().mockResolvedValue(undefined),
    createExhibition: fn().mockResolvedValue({}),
    addArtworkToExhibition: fn().mockResolvedValue({}),
    getBlogPosts: fn().mockResolvedValue([]),
    getBlogPost: fn().mockResolvedValue(undefined),
    getBlogPostsByArtist: fn().mockResolvedValue([]),
    createBlogPost: fn().mockResolvedValue({}),
    updateBlogPost: fn().mockResolvedValue(undefined),
    deleteBlogPost: fn().mockResolvedValue(false),
    getExhibitionReadyArtworks: fn().mockResolvedValue([]),
    regenerateArtistGallery: fn().mockResolvedValue({ width: 3, height: 3, cells: [], spawnPoint: { x: 1, z: 1 } }),
    getUsers: fn().mockResolvedValue([]),
    updateUserRole: fn().mockResolvedValue(undefined),
    deleteArtist: fn().mockResolvedValue(false),
    deleteExhibition: fn().mockResolvedValue(false),
  };
  return { mockStorage };
});

vi.mock("../../replit_integrations/auth", () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  registerAuthRoutes: vi.fn(),
  isAuthenticated: (req: any, _res: any, next: any) => {
    req.user = {
      claims: {
        sub: "test-user-id",
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
      },
    };
    next();
  },
  isAdmin: (req: any, _res: any, next: any) => {
    req.user = {
      claims: {
        sub: "test-user-id",
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
      },
    };
    next();
  },
}));

vi.mock("../../storage", () => ({
  storage: mockStorage,
  DatabaseStorage: vi.fn(),
  generateWhiteRoomLayout: vi.fn(),
}));

import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../../routes";

export async function createTestApp(): Promise<{ app: express.Express; mockStorage: IStorage }> {
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  return { app, mockStorage };
}

export { mockStorage };
