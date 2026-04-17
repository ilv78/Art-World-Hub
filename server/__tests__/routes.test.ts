import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import type express from "express";
import type { IStorage } from "../storage";
import { createTestApp, mockStorage } from "./helpers/test-app";
import fs from "fs";
import path from "path";
import os from "os";

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

// ----- Auth-protected GET endpoints -----

describe("GET /api/orders", () => {
  const testArtist = { id: "art1", name: "Alice", bio: "Bio", userId: "test-user-id" };

  it("returns only the logged-in artist's orders", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);
    const orders = [{ id: "o1", artworkId: "a1", status: "pending" }];
    (mockStorage.getOrdersByArtist as ReturnType<typeof vi.fn>).mockResolvedValue(orders);

    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(200);
    expect(mockStorage.getOrdersByArtist).toHaveBeenCalledWith("art1");
    expect(res.body).toEqual(orders);
  });
});

describe("GET /api/artists/:id/orders", () => {
  const testArtist = { id: "art1", name: "Alice", bio: "Bio", userId: "test-user-id" };

  it("returns orders when artist views their own", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);
    const orders = [{ id: "o1", artworkId: "a1", status: "pending" }];
    (mockStorage.getOrdersByArtist as ReturnType<typeof vi.fn>).mockResolvedValue(orders);

    const res = await request(app).get("/api/artists/art1/orders");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(orders);
  });

  it("returns 403 when viewing another artist's orders", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const res = await request(app).get("/api/artists/other-artist/orders");
    expect(res.status).toBe(403);
  });
});

// ----- POST validation -----

describe("POST /api/orders", () => {
  const artworkForSale = {
    id: "a1",
    title: "Painting",
    price: "500.00",
    isForSale: true,
    artistId: "art1",
    artist: { id: "art1", name: "Alice" },
  };

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
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(artworkForSale);
    (mockStorage.createOrder as ReturnType<typeof vi.fn>).mockResolvedValue(createdOrder);
    (mockStorage.updateArtwork as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockStorage.getArtist as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/orders")
      .send(orderData);

    expect(res.status).toBe(201);
    expect(mockStorage.createOrder).toHaveBeenCalled();
    expect(mockStorage.updateArtwork).not.toHaveBeenCalled();
  });

  it("uses DB price instead of client-sent price", async () => {
    const orderData = {
      artworkId: "a1",
      buyerName: "John",
      buyerEmail: "john@example.com",
      shippingAddress: "123 Main St",
      totalAmount: "1.00",
      status: "pending",
    };

    const createdOrder = { id: "o1", ...orderData, totalAmount: "500.00", createdAt: new Date().toISOString() };
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(artworkForSale);
    (mockStorage.createOrder as ReturnType<typeof vi.fn>).mockResolvedValue(createdOrder);
    (mockStorage.updateArtwork as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (mockStorage.getArtist as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/orders")
      .send(orderData);

    expect(res.status).toBe(201);
    expect(mockStorage.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: "500.00" })
    );
  });

  it("returns 404 when artwork does not exist", async () => {
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/orders")
      .send({
        artworkId: "nonexistent",
        buyerName: "John",
        buyerEmail: "john@example.com",
        shippingAddress: "123 Main St",
        totalAmount: "500.00",
        status: "pending",
      });

    expect(res.status).toBe(404);
  });

  it("returns 400 when artwork is not for sale", async () => {
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...artworkForSale,
      isForSale: false,
    });

    const res = await request(app)
      .post("/api/orders")
      .send({
        artworkId: "a1",
        buyerName: "John",
        buyerEmail: "john@example.com",
        shippingAddress: "123 Main St",
        totalAmount: "500.00",
        status: "pending",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("not available");
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
      id: "a1", title: "Painting", artistId: "art1", isPublished: true, isReadyForExhibition: false, exhibitionOrder: null,
      artist: { id: "art1", name: "Alice" },
    };
    const updatedArtwork = {
      id: "a1", title: "Painting", artistId: "art1", isPublished: true, isReadyForExhibition: true, exhibitionOrder: null,
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
      id: "a1", title: "Painting", artistId: "art1", isPublished: true, isReadyForExhibition: false, exhibitionOrder: null,
      artist: { id: "art1", name: "Alice" },
    };
    const updatedArtwork = {
      id: "a1", title: "Updated Title", artistId: "art1", isPublished: true, isReadyForExhibition: false, exhibitionOrder: null,
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

  it("clamps isForSale/isInGallery/isReadyForExhibition when creating a draft", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);
    (mockStorage.createArtwork as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "a1", artistId: "art1", isPublished: false, isForSale: false, isInGallery: false, isReadyForExhibition: false,
    });

    const res = await request(app).post("/api/artworks").send({
      title: "Draft",
      description: "In progress",
      imageUrl: "https://example.com/x.jpg",
      artistId: "art1",
      price: "100.00",
      medium: "oil",
      category: "painting",
      isPublished: false,
      isForSale: true,
      isInGallery: true,
      isReadyForExhibition: true,
    });

    expect(res.status).toBe(201);
    expect(mockStorage.createArtwork).toHaveBeenCalledWith(expect.objectContaining({
      isPublished: false,
      isForSale: false,
      isInGallery: false,
      isReadyForExhibition: false,
    }));
    expect(mockStorage.regenerateArtistGallery).not.toHaveBeenCalled();
  });

  it("auto-resets gated flags when unpublishing, preserves exhibitionOrder, and regenerates gallery", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const existingArtwork = {
      id: "a1", title: "Painting", artistId: "art1",
      isPublished: true, isForSale: true, isInGallery: true, isReadyForExhibition: true, exhibitionOrder: 3,
      artist: { id: "art1", name: "Alice" },
    };
    const updatedArtwork = {
      id: "a1", title: "Painting", artistId: "art1",
      isPublished: false, isForSale: false, isInGallery: false, isReadyForExhibition: false, exhibitionOrder: 3,
    };

    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(existingArtwork);
    (mockStorage.updateArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(updatedArtwork);

    const res = await request(app)
      .patch("/api/artworks/a1")
      .send({ isPublished: false });

    expect(res.status).toBe(200);
    expect(mockStorage.updateArtwork).toHaveBeenCalledWith("a1", expect.objectContaining({
      isPublished: false,
      isForSale: false,
      isInGallery: false,
      isReadyForExhibition: false,
    }));
    const [, updatePayload] = (mockStorage.updateArtwork as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(updatePayload).not.toHaveProperty("exhibitionOrder");
    expect(mockStorage.regenerateArtistGallery).toHaveBeenCalledWith("art1");
  });

  it("leaves gated flags alone when staying published", async () => {
    (mockStorage.getArtistByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(testArtist);

    const existingArtwork = {
      id: "a1", title: "Painting", artistId: "art1",
      isPublished: true, isForSale: true, isInGallery: true, isReadyForExhibition: true, exhibitionOrder: 2,
      artist: { id: "art1", name: "Alice" },
    };
    const updatedArtwork = { ...existingArtwork, title: "New title" };

    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(existingArtwork);
    (mockStorage.updateArtwork as ReturnType<typeof vi.fn>).mockResolvedValue(updatedArtwork);

    const res = await request(app)
      .patch("/api/artworks/a1")
      .send({ title: "New title" });

    expect(res.status).toBe(200);
    expect(mockStorage.updateArtwork).toHaveBeenCalledWith("a1", { title: "New title" });
  });
});

describe("GET /api/artworks/:id draft visibility", () => {
  it("returns 404 for a draft when viewer is anonymous", async () => {
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "a1", artistId: "art1", isPublished: false,
      artist: { id: "art1", name: "Alice" },
    });

    const res = await request(app).get("/api/artworks/a1");
    expect(res.status).toBe(404);
  });

  it("returns 200 for a published artwork", async () => {
    (mockStorage.getArtwork as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "a1", artistId: "art1", isPublished: true,
      artist: { id: "art1", name: "Alice" },
    });

    const res = await request(app).get("/api/artworks/a1");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/artists/:id/artworks draft visibility", () => {
  it("omits drafts for anonymous viewers", async () => {
    await request(app).get("/api/artists/art1/artworks");
    expect(mockStorage.getArtworksByArtist).toHaveBeenCalledWith("art1", { includeDrafts: false });
  });
});

// ----- Admin logs endpoint -----

describe("GET /api/admin/logs", () => {
  // The logger mock in test-app.ts sets logFilePath to a temp dir.
  // We write test NDJSON there before hitting the endpoint.
  const logDir = path.join(os.tmpdir(), `artverse-test-logs-${process.pid}`);
  const logFile = path.join(logDir, "app.log");

  const testEntries = [
    { level: 30, time: "2026-03-15T10:00:00.000Z", module: "app", msg: "Server started" },
    { level: 30, time: "2026-03-15T10:01:00.000Z", module: "mcp", msg: "MCP registered" },
    { level: 40, time: "2026-03-15T10:02:00.000Z", module: "auth", msg: "Token expired" },
    { level: 50, time: "2026-03-15T10:03:00.000Z", module: "auth", msg: "Login failed", err: { message: "bad password" } },
    { level: 30, time: "2026-03-15T10:04:00.000Z", req: { method: "GET", url: "/api/artists" }, res: { statusCode: 200 }, responseTime: 15, msg: "request completed" },
  ];

  beforeAll(() => {
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(logFile, testEntries.map((e) => JSON.stringify(e)).join("\n") + "\n");
  });

  afterAll(() => {
    fs.rmSync(logDir, { recursive: true, force: true });
  });

  it("returns all log entries with default params", async () => {
    const res = await request(app).get("/api/admin/logs");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(5);
    expect(res.body.total).toBe(5);
  });

  it("filters by log level", async () => {
    const res = await request(app).get("/api/admin/logs?level=warn");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
    expect(res.body.entries.every((e: any) => e.level >= 40)).toBe(true);
  });

  it("filters by module", async () => {
    const res = await request(app).get("/api/admin/logs?module=auth");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
    expect(res.body.entries.every((e: any) => e.module === "auth")).toBe(true);
  });

  it("filters by text search", async () => {
    const res = await request(app).get("/api/admin/logs?search=artists");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0].req.url).toBe("/api/artists");
  });

  it("filters by since timestamp", async () => {
    const res = await request(app).get("/api/admin/logs?since=2026-03-15T10:03:00.000Z");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
  });

  it("respects limit parameter", async () => {
    const res = await request(app).get("/api/admin/logs?limit=2");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
    expect(res.body.total).toBe(5);
  });

  it("combines filters", async () => {
    const res = await request(app).get("/api/admin/logs?level=error&module=auth");
    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0].msg).toBe("Login failed");
  });

  it("returns empty when log file does not exist", async () => {
    const tmpPath = logFile + ".bak";
    fs.renameSync(logFile, tmpPath);
    try {
      const res = await request(app).get("/api/admin/logs");
      expect(res.status).toBe(200);
      expect(res.body.entries).toHaveLength(0);
    } finally {
      fs.renameSync(tmpPath, logFile);
    }
  });
});
