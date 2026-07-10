import { describe, it, expect, beforeEach, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import request from "supertest";
import express from "express";

// vi.hoisted runs before vi.mock hoisting, so these are available in mock factories
const { mockStorage, mockAuthStorage } = vi.hoisted(() => {
  const fn = vi.fn;
  const mockStorage = {
    getArtists: fn(),
    getArtist: fn(),
    getArtistByUserId: fn(),
    updateArtist: fn(),
    getArtworks: fn(),
    getArtwork: fn(),
    getArtworksByArtist: fn(),
    createArtwork: fn(),
    updateArtwork: fn(),
    deleteArtwork: fn(),
    getAuctions: fn(),
    getAuction: fn(),
    updateAuction: fn(),
    getBidsByAuction: fn(),
    createBid: fn(),
    getOrdersByArtist: fn(),
    getOrder: fn(),
    createOrder: fn(),
    updateOrderStatus: fn(),
    getExhibitions: fn(),
    getBlogPosts: fn(),
    getBlogPost: fn(),
    getBlogPostsByArtist: fn(),
    createBlogPost: fn(),
    updateBlogPost: fn(),
    deleteBlogPost: fn(),
    getExhibitionReadyArtworks: fn(),
    regenerateArtistGallery: fn(),
  };
  const mockAuthStorage = { getUser: fn() };
  return { mockStorage, mockAuthStorage };
});

vi.mock("../storage", () => ({
  storage: mockStorage,
}));

vi.mock("../replit_integrations/auth", () => ({
  // Test-only middleware: identifies the caller from the x-test-user header
  // so the session-binding tests can act as two different users.
  isAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { claims: { sub: (req.headers["x-test-user"] as string) || "user-1" } };
    next();
  },
  authStorage: mockAuthStorage,
}));

const { testLogDir } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tmpdir = require("os").tmpdir();
  return { testLogDir: `${tmpdir}/artverse-mcp-test-logs-${process.pid}` };
});

vi.mock("../logger", () => {
  const noopLogger = {
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    fatal: vi.fn(), trace: vi.fn(), child: vi.fn().mockReturnThis(),
  };
  return {
    logger: noopLogger,
    mcpLogger: noopLogger,
    logFilePath: `${testLogDir}/app.log`,
    LOG_DIR: testLogDir,
  };
});

import { createMcpServer, registerMcpRoutes } from "../mcp";

// The caller ("user-1") owns artist-1. artist-2 belongs to someone else.
const callerArtist = { id: "artist-1", name: "Caller Artist", userId: "user-1" };
const otherArtist = { id: "artist-2", name: "Other Artist", userId: "user-2" };

async function connectAs(userId: string): Promise<Client> {
  const server = createMcpServer(userId);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function textOf(result: any): string {
  return result.content?.[0]?.text ?? "";
}

beforeEach(() => {
  Object.values(mockStorage).forEach((fn) => fn.mockReset());
  mockAuthStorage.getUser.mockReset();

  mockStorage.getArtistByUserId.mockImplementation(async (userId: string) =>
    userId === "user-1" ? callerArtist : undefined
  );
  mockStorage.getArtist.mockImplementation(async (id: string) =>
    id === "artist-1" ? callerArtist : id === "artist-2" ? otherArtist : undefined
  );
  mockAuthStorage.getUser.mockResolvedValue({ id: "user-1", role: "user" });
});

describe("MCP tool authorization (issue #681)", () => {
  describe("create_artwork", () => {
    const baseArgs = {
      title: "T", description: "D", imageUrl: "https://x/img.png",
      price: "100", medium: "Painting", category: "Painting",
    };

    it("rejects creating an artwork for another artist", async () => {
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "create_artwork",
        arguments: { ...baseArgs, artistId: "artist-2" },
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("another artist");
      expect(mockStorage.createArtwork).not.toHaveBeenCalled();
    });

    it("rejects callers with no artist profile", async () => {
      const client = await connectAs("user-without-profile");
      const result: any = await client.callTool({
        name: "create_artwork",
        arguments: { ...baseArgs, artistId: "artist-1" },
      });
      expect(result.isError).toBe(true);
      expect(mockStorage.createArtwork).not.toHaveBeenCalled();
    });

    it("allows creating an artwork for the caller's own artist", async () => {
      mockStorage.createArtwork.mockResolvedValue({ id: "aw-1", artistId: "artist-1", isReadyForExhibition: false });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "create_artwork",
        arguments: { ...baseArgs, artistId: "artist-1" },
      });
      expect(result.isError).toBeFalsy();
      expect(mockStorage.createArtwork).toHaveBeenCalled();
    });
  });

  describe("update_artwork / delete_artwork", () => {
    it("rejects updating another artist's artwork", async () => {
      mockStorage.getArtwork.mockResolvedValue({ id: "aw-2", artistId: "artist-2", isPublished: true });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "update_artwork",
        arguments: { artworkId: "aw-2", title: "Hijacked" },
      });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("another artist");
      expect(mockStorage.updateArtwork).not.toHaveBeenCalled();
    });

    it("allows updating the caller's own artwork", async () => {
      mockStorage.getArtwork.mockResolvedValue({ id: "aw-1", artistId: "artist-1", isPublished: true, isReadyForExhibition: false });
      mockStorage.updateArtwork.mockResolvedValue({ id: "aw-1", artistId: "artist-1", isReadyForExhibition: false });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "update_artwork",
        arguments: { artworkId: "aw-1", title: "New title" },
      });
      expect(result.isError).toBeFalsy();
      expect(mockStorage.updateArtwork).toHaveBeenCalled();
    });

    it("rejects deleting another artist's artwork", async () => {
      mockStorage.getArtwork.mockResolvedValue({ id: "aw-2", artistId: "artist-2" });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "delete_artwork",
        arguments: { artworkId: "aw-2" },
      });
      expect(result.isError).toBe(true);
      expect(mockStorage.deleteArtwork).not.toHaveBeenCalled();
    });
  });

  describe("update_artist_profile", () => {
    it("rejects editing another artist's profile", async () => {
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "update_artist_profile",
        arguments: { artistId: "artist-2", name: "Hijacked" },
      });
      expect(result.isError).toBe(true);
      expect(mockStorage.updateArtist).not.toHaveBeenCalled();
    });

    it("allows editing the caller's own profile", async () => {
      mockStorage.updateArtist.mockResolvedValue({ ...callerArtist, name: "New Name" });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "update_artist_profile",
        arguments: { artistId: "artist-1", name: "New Name" },
      });
      expect(result.isError).toBeFalsy();
      expect(mockStorage.updateArtist).toHaveBeenCalledWith("artist-1", { name: "New Name" });
    });
  });

  describe("blog post tools", () => {
    it("rejects creating a post for another artist", async () => {
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "create_blog_post",
        arguments: { artistId: "artist-2", title: "T", content: "C" },
      });
      expect(result.isError).toBe(true);
      expect(mockStorage.createBlogPost).not.toHaveBeenCalled();
    });

    it("rejects updating another artist's post", async () => {
      mockStorage.getBlogPost.mockResolvedValue({ id: "post-2", artistId: "artist-2" });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "update_blog_post",
        arguments: { postId: "post-2", title: "Hijacked" },
      });
      expect(result.isError).toBe(true);
      expect(mockStorage.updateBlogPost).not.toHaveBeenCalled();
    });

    it("rejects deleting another artist's post", async () => {
      mockStorage.getBlogPost.mockResolvedValue({ id: "post-2", artistId: "artist-2" });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "delete_blog_post",
        arguments: { postId: "post-2" },
      });
      expect(result.isError).toBe(true);
      expect(mockStorage.deleteBlogPost).not.toHaveBeenCalled();
    });

    it("allows deleting the caller's own post", async () => {
      mockStorage.getBlogPost.mockResolvedValue({ id: "post-1", artistId: "artist-1" });
      mockStorage.deleteBlogPost.mockResolvedValue(true);
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "delete_blog_post",
        arguments: { postId: "post-1" },
      });
      expect(result.isError).toBeFalsy();
      expect(mockStorage.deleteBlogPost).toHaveBeenCalledWith("post-1");
    });
  });

  describe("update_order_status", () => {
    it("rejects updating an order on another artist's artwork", async () => {
      mockStorage.getOrder.mockResolvedValue({ id: "order-2", artworkId: "aw-2", status: "pending" });
      mockStorage.getArtwork.mockResolvedValue({ id: "aw-2", artistId: "artist-2" });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "update_order_status",
        arguments: { orderId: "order-2", newStatus: "canceled" },
      });
      expect(result.isError).toBe(true);
      expect(mockStorage.updateOrderStatus).not.toHaveBeenCalled();
    });

    it("allows updating an order on the caller's own artwork", async () => {
      mockStorage.getOrder.mockResolvedValue({ id: "order-1", artworkId: "aw-1", status: "pending" });
      mockStorage.getArtwork.mockResolvedValue({ id: "aw-1", artistId: "artist-1" });
      mockStorage.updateOrderStatus.mockResolvedValue({ id: "order-1", status: "communicating" });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "update_order_status",
        arguments: { orderId: "order-1", newStatus: "communicating" },
      });
      expect(result.isError).toBeFalsy();
      expect(mockStorage.updateOrderStatus).toHaveBeenCalledWith("order-1", "communicating");
    });
  });

  describe("regenerate_gallery", () => {
    it("rejects regenerating another artist's gallery", async () => {
      const client = await connectAs("user-1");
      const result: any = await client.callTool({
        name: "regenerate_gallery",
        arguments: { artistId: "artist-2" },
      });
      expect(result.isError).toBe(true);
      expect(mockStorage.regenerateArtistGallery).not.toHaveBeenCalled();
    });
  });

  describe("get_logs", () => {
    it("rejects non-admin callers", async () => {
      mockAuthStorage.getUser.mockResolvedValue({ id: "user-1", role: "user" });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({ name: "get_logs", arguments: {} });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("admin");
    });

    it("allows admin callers", async () => {
      mockAuthStorage.getUser.mockResolvedValue({ id: "user-1", role: "admin" });
      const client = await connectAs("user-1");
      const result: any = await client.callTool({ name: "get_logs", arguments: {} });
      expect(result.isError).toBeFalsy();
      // Log file doesn't exist in tests — empty result set, but not an auth error
      expect(JSON.parse(textOf(result))).toEqual({ entries: [], total: 0 });
    });
  });

  describe("orders-by-artist resource", () => {
    it("rejects reading another artist's orders (buyer PII)", async () => {
      const client = await connectAs("user-1");
      const result: any = await client.readResource({ uri: "vernis9://artists/artist-2/orders" });
      expect(JSON.parse(result.contents[0].text)).toEqual({
        error: "Not authorized to view another artist's orders",
      });
      expect(mockStorage.getOrdersByArtist).not.toHaveBeenCalled();
    });

    it("allows reading the caller's own orders", async () => {
      const orders = [{ id: "order-1", buyerName: "B", buyerEmail: "b@x.com" }];
      mockStorage.getOrdersByArtist.mockResolvedValue(orders);
      const client = await connectAs("user-1");
      const result: any = await client.readResource({ uri: "vernis9://artists/artist-1/orders" });
      expect(JSON.parse(result.contents[0].text)).toEqual(orders);
    });
  });

  describe("order_summary prompt", () => {
    it("rejects summarizing another artist's orders", async () => {
      const client = await connectAs("user-1");
      await expect(
        client.getPrompt({ name: "order_summary", arguments: { artistId: "artist-2" } })
      ).rejects.toThrow(/Not authorized/);
      expect(mockStorage.getOrdersByArtist).not.toHaveBeenCalled();
    });

    it("allows summarizing the caller's own orders", async () => {
      mockStorage.getOrdersByArtist.mockResolvedValue([]);
      const client = await connectAs("user-1");
      const result = await client.getPrompt({ name: "order_summary", arguments: { artistId: "artist-1" } });
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });
});

describe("MCP session binding (issue #681)", () => {
  function createApp() {
    const app = express();
    app.use(express.json());
    registerMcpRoutes(app);
    return app;
  }

  const initializeBody = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0.0" },
    },
  };

  it("rejects requests on a session initialized by a different user", async () => {
    const app = createApp();
    const initRes = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("x-test-user", "user-1")
      .send(initializeBody);
    const sessionId = initRes.headers["mcp-session-id"];
    expect(sessionId).toBeTruthy();

    const hijackRes = await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .set("mcp-session-id", sessionId)
      .set("x-test-user", "user-2")
      .send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect(hijackRes.status).toBe(403);

    const hijackGet = await request(app)
      .get("/mcp")
      .set("Accept", "text/event-stream")
      .set("mcp-session-id", sessionId)
      .set("x-test-user", "user-2");
    expect(hijackGet.status).toBe(403);

    const hijackDelete = await request(app)
      .delete("/mcp")
      .set("mcp-session-id", sessionId)
      .set("x-test-user", "user-2");
    expect(hijackDelete.status).toBe(403);
  });
});
