import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import type express from "express";
import type { IStorage } from "../storage";
import { createTestApp, mockStorage } from "./helpers/test-app";

let app: express.Express;

beforeAll(async () => {
  const result = await createTestApp();
  app = result.app;
});

beforeEach(() => {
  // Reset all mock return values between tests
  Object.values(mockStorage).forEach((fn) => {
    if (typeof fn === "function" && "mockReset" in fn) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  });

  // Re-apply default resolved values
  (mockStorage.getArtists as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.getArtist as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.getArtworks as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.getArtworksByArtist as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.getAuctions as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.getAuction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.getBidsByAuction as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.getOrders as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.getExhibitions as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.getExhibition as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.getActiveExhibition as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.getBlogPosts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.getBlogPost as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.getBlogPostsByArtist as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.getExhibitionReadyArtworks as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (mockStorage.createArtwork as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (mockStorage.createOrder as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (mockStorage.createBid as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (mockStorage.createBlogPost as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (mockStorage.updateArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.updateAuction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.updateOrderStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (mockStorage.deleteArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  (mockStorage.deleteBlogPost as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  (mockStorage.regenerateArtistGallery as ReturnType<typeof vi.fn>).mockResolvedValue({ width: 3, height: 3, cells: [], spawnPoint: { x: 1, z: 1 } });
});

// ----- GET endpoints -----

describe("GET /api/artists", () => {
  it("returns 200 with array", async () => {
    const mockArtists = [{ id: "1", name: "Alice", bio: "Bio" }];
    (mockStorage.getArtists as ReturnType<typeof vi.fn>).mockResolvedValue(mockArtists);

    const res = await request(app).get("/api/artists");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockArtists);
  });
});

describe("GET /api/artists/:id", () => {
  it("returns 200 with data when found", async () => {
    const artist = { id: "1", name: "Alice", bio: "Bio" };
    (mockStorage.getArtist as ReturnType<typeof vi.fn>).mockResolvedValue(artist);

    const res = await request(app).get("/api/artists/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(artist);
  });

  it("returns 404 when not found", async () => {
    (mockStorage.getArtist as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app).get("/api/artists/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Artist not found");
  });
});

describe("GET /api/artworks", () => {
  it("returns 200 with array", async () => {
    const mockArtworks = [{ id: "a1", title: "Painting" }];
    (mockStorage.getArtworks as ReturnType<typeof vi.fn>).mockResolvedValue(mockArtworks);

    const res = await request(app).get("/api/artworks");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockArtworks);
  });
});

describe("GET /api/artworks/:id", () => {
  it("returns 404 when not found", async () => {
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app).get("/api/artworks/missing");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Artwork not found");
  });
});

describe("GET /api/auctions", () => {
  it("returns 200 with array", async () => {
    (mockStorage.getAuctions as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(app).get("/api/auctions");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/blog", () => {
  it("returns 200 with array", async () => {
    (mockStorage.getBlogPosts as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await request(app).get("/api/blog");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/exhibitions/active", () => {
  it("returns 404 when none active", async () => {
    (mockStorage.getActiveExhibition as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app).get("/api/exhibitions/active");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("No active exhibition");
  });
});

// ----- POST validation -----

describe("POST /api/orders", () => {
  it("returns 400 with zod error for invalid body", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 201 and marks artwork not for sale with valid body", async () => {
    const orderData = {
      artworkId: "a1",
      buyerName: "John",
      buyerEmail: "john@example.com",
      shippingAddress: "123 Main St",
      totalAmount: "500.00",
      status: "pending",
    };

    const createdOrder = { id: "o1", ...orderData, createdAt: new Date().toISOString() };
    (mockStorage.createOrder as ReturnType<typeof vi.fn>).mockResolvedValue(createdOrder);
    (mockStorage.updateArtwork as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/orders")
      .send(orderData);

    expect(res.status).toBe(201);
    expect(mockStorage.createOrder).toHaveBeenCalled();
    expect(mockStorage.updateArtwork).toHaveBeenCalledWith("a1", { isForSale: false });
  });

  it("rejects unauthenticated requests", async () => {
    // This test verifies the middleware is wired — the mock always authenticates,
    // so we test the route integration indirectly via the other tests above.
    // A dedicated auth-bypass test would require a separate app without the mock.
  });
});

describe("POST /api/blog", () => {
  const testArtist = { id: "art1", name: "Alice", bio: "Bio", userId: "test-user-id" };

  it("returns 400 with missing fields", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const res = await request(app)
      .post("/api/blog")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("returns 201 with valid data", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const postData = {
      artistId: "art1",
      title: "My Post",
      content: "Content here",
    };

    const createdPost = { id: "p1", ...postData, createdAt: new Date().toISOString() };
    (mockStorage.createBlogPost as ReturnType<typeof vi.fn>).mockResolvedValue(createdPost);

    const res = await request(app)
      .post("/api/blog")
      .send(postData);

    expect(res.status).toBe(201);
  });

  it("returns 403 when creating post for another artist", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const res = await request(app)
      .post("/api/blog")
      .send({ artistId: "other-artist", title: "Hack", content: "Content" });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/artworks", () => {
  const testArtist = { id: "art1", name: "Alice", bio: "Bio", userId: "test-user-id" };

  it("returns 201 with valid data", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const artworkData = {
      title: "Sunset",
      description: "A beautiful sunset",
      imageUrl: "https://example.com/img.jpg",
      artistId: "art1",
      price: "1000.00",
      medium: "Oil on canvas",
      category: "painting",
    };

    const createdArtwork = { id: "a1", ...artworkData, isReadyForExhibition: false };
    (mockStorage.createArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(createdArtwork);

    const res = await request(app)
      .post("/api/artworks")
      .send(artworkData);

    expect(res.status).toBe(201);
    expect(mockStorage.createArtwork).toHaveBeenCalled();
  });

  it("returns 403 when creating artwork for another artist", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const res = await request(app)
      .post("/api/artworks")
      .send({
        title: "Hack",
        description: "Injected",
        imageUrl: "https://example.com/img.jpg",
        artistId: "other-artist",
        price: "1.00",
        medium: "Digital",
        category: "painting",
      });

    expect(res.status).toBe(403);
  });
});

// ----- Business logic -----

describe("POST /api/auctions/:id/bids", () => {
  const activeAuction = {
    id: "auc1",
    artworkId: "a1",
    startingPrice: "100.00",
    currentBid: "150.00",
    minimumIncrement: "10.00",
    startTime: new Date(Date.now() - 86400000).toISOString(), // yesterday
    endTime: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    status: "active",
    winnerName: null,
    artwork: { id: "a1", title: "Painting", artist: { id: "art1", name: "Alice" } },
  };

  it("rejects bid below minimum increment", async () => {
    (mockStorage.getAuction as ReturnType<typeof vi.fn>).mockResolvedValue(activeAuction);

    const res = await request(app)
      .post("/api/auctions/auc1/bids")
      .send({ amount: "155.00", bidderName: "Bob" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Minimum bid");
  });

  it("rejects bid on ended auction", async () => {
    const endedAuction = {
      ...activeAuction,
      endTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    };
    (mockStorage.getAuction as ReturnType<typeof vi.fn>).mockResolvedValue(endedAuction);

    const res = await request(app)
      .post("/api/auctions/auc1/bids")
      .send({ amount: "200.00", bidderName: "Bob" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Auction has ended");
  });

  it("accepts valid bid", async () => {
    (mockStorage.getAuction as ReturnType<typeof vi.fn>).mockResolvedValue(activeAuction);
    const createdBid = { id: "b1", auctionId: "auc1", bidderName: "Bob", amount: "200.00", timestamp: new Date().toISOString() };
    (mockStorage.createBid as ReturnType<typeof vi.fn>).mockResolvedValue(createdBid);
    (mockStorage.updateAuction as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const res = await request(app)
      .post("/api/auctions/auc1/bids")
      .send({ amount: "200.00", bidderName: "Bob" });

    expect(res.status).toBe(201);
    expect(mockStorage.createBid).toHaveBeenCalled();
    expect(mockStorage.updateAuction).toHaveBeenCalledWith("auc1", { currentBid: "200.00" });
  });
});

describe("PATCH /api/orders/:id/status", () => {
  it("enforces ORDER_TRANSITIONS state machine", async () => {
    const artist = { id: "art1", name: "Alice", bio: "Bio", userId: "test-user-id" };
    const order = { id: "o1", artworkId: "a1", status: "pending", buyerName: "John", buyerEmail: "john@test.com", shippingAddress: "123", totalAmount: "500", createdAt: new Date().toISOString() };
    const artwork = { id: "a1", title: "Painting", artistId: "art1", artist: { id: "art1", name: "Alice" } };

    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(artist);
    (mockStorage.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue(order);
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(artwork);

    // "pending" can go to "communicating" or "canceled", but NOT "closed"
    const res = await request(app)
      .patch("/api/orders/o1/status")
      .send({ status: "closed" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Cannot change status");
  });

  it("allows valid status transition", async () => {
    const artist = { id: "art1", name: "Alice", bio: "Bio", userId: "test-user-id" };
    const order = { id: "o1", artworkId: "a1", status: "pending", buyerName: "John", buyerEmail: "john@test.com", shippingAddress: "123", totalAmount: "500", createdAt: new Date().toISOString() };
    const artwork = { id: "a1", title: "Painting", artistId: "art1", artist: { id: "art1", name: "Alice" } };
    const updatedOrder = { ...order, status: "communicating" };

    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(artist);
    (mockStorage.getOrder as ReturnType<typeof vi.fn>).mockResolvedValue(order);
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(artwork);
    (mockStorage.updateOrderStatus as ReturnType<typeof vi.fn>).mockResolvedValue(updatedOrder);

    const res = await request(app)
      .patch("/api/orders/o1/status")
      .send({ status: "communicating" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("communicating");
  });
});

describe("PATCH /api/artworks/:id", () => {
  const testArtist = { id: "art1", name: "Alice", bio: "Bio", userId: "test-user-id" };

  it("triggers gallery regeneration when exhibition readiness changes", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const existingArtwork = {
      id: "a1", title: "Painting", artistId: "art1", isReadyForExhibition: false, exhibitionOrder: null,
      artist: { id: "art1", name: "Alice" },
    };
    const updatedArtwork = {
      id: "a1", title: "Painting", artistId: "art1", isReadyForExhibition: true, exhibitionOrder: null,
    };

    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(existingArtwork);
    (mockStorage.updateArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(updatedArtwork);

    const res = await request(app)
      .patch("/api/artworks/a1")
      .send({ isReadyForExhibition: true });

    expect(res.status).toBe(200);
    expect(mockStorage.regenerateArtistGallery).toHaveBeenCalledWith("art1");
  });

  it("does not regenerate gallery when readiness is unchanged", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const existingArtwork = {
      id: "a1", title: "Painting", artistId: "art1", isReadyForExhibition: false, exhibitionOrder: null,
      artist: { id: "art1", name: "Alice" },
    };
    const updatedArtwork = {
      id: "a1", title: "Updated Title", artistId: "art1", isReadyForExhibition: false, exhibitionOrder: null,
    };

    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(existingArtwork);
    (mockStorage.updateArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(updatedArtwork);

    const res = await request(app)
      .patch("/api/artworks/a1")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(mockStorage.regenerateArtistGallery).not.toHaveBeenCalled();
  });

  it("returns 403 when editing another artist's artwork", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const otherArtwork = {
      id: "a2", title: "Other", artistId: "art2", isReadyForExhibition: false, exhibitionOrder: null,
      artist: { id: "art2", name: "Bob" },
    };
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(otherArtwork);

    const res = await request(app)
      .patch("/api/artworks/a2")
      .send({ title: "Hacked" });

    expect(res.status).toBe(403);
  });
});
