import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module to avoid real database connection
vi.mock("../db", () => {
  const mockChain = () => {
    const chain: any = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };
    return chain;
  };

  const dbObj: any = {
    select: vi.fn().mockReturnValue(mockChain()),
    insert: vi.fn().mockReturnValue(mockChain()),
    update: vi.fn().mockReturnValue(mockChain()),
    delete: vi.fn().mockReturnValue(mockChain()),
    transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(dbObj)),
  };

  return { db: dbObj };
});

import { generateWhiteRoomLayout, DatabaseStorage, ArtworkAlreadySoldError } from "../storage";
import { db } from "../db";
import { artworks, orders } from "@shared/schema";
import type { MazeLayout } from "@shared/schema";

// ----- generateWhiteRoomLayout tests (pure function) -----

describe("generateWhiteRoomLayout", () => {
  it("returns a valid layout for 0 artworks (empty room)", () => {
    const layout = generateWhiteRoomLayout(0);

    expect(layout.width).toBeGreaterThanOrEqual(3);
    expect(layout.height).toBeGreaterThanOrEqual(3);
    expect(layout.cells).toBeDefined();
    expect(layout.cells.length).toBe(layout.width * layout.height);
    expect(layout.spawnPoint).toBeDefined();

    // No artwork slots when count is 0
    const totalSlots = layout.cells.reduce((sum, c) => sum + c.artworkSlots.length, 0);
    expect(totalSlots).toBe(0);
  });

  it("scales room dimensions with artwork count", () => {
    const small = generateWhiteRoomLayout(2);
    const large = generateWhiteRoomLayout(20);

    expect(large.width).toBeGreaterThanOrEqual(small.width);
    expect(large.height).toBeGreaterThanOrEqual(small.height);
  });

  it("places artwork slots on wall cells", () => {
    const layout = generateWhiteRoomLayout(4);
    const totalSlots = layout.cells.reduce((sum, c) => sum + c.artworkSlots.length, 0);

    // 4 artworks + 1 extra = 5 total slots
    expect(totalSlots).toBe(5);

    // Every cell with artwork slots should be on a wall (edge of room)
    for (const cell of layout.cells) {
      if (cell.artworkSlots.length > 0) {
        const isEdge =
          cell.x === 0 ||
          cell.x === layout.width - 1 ||
          cell.z === 0 ||
          cell.z === layout.height - 1;
        expect(isEdge).toBe(true);
      }
    }
  });

  it("places spawn point inside the room", () => {
    const layout = generateWhiteRoomLayout(6);

    expect(layout.spawnPoint.x).toBeGreaterThanOrEqual(0);
    expect(layout.spawnPoint.x).toBeLessThan(layout.width);
    expect(layout.spawnPoint.z).toBeGreaterThanOrEqual(0);
    expect(layout.spawnPoint.z).toBeLessThan(layout.height);
  });

  it("handles 1 artwork correctly", () => {
    const layout = generateWhiteRoomLayout(1);
    const totalSlots = layout.cells.reduce((sum, c) => sum + c.artworkSlots.length, 0);

    // 1 artwork + 1 = 2 slots
    expect(totalSlots).toBe(2);
  });

  it("assigns sequential positions to artwork slots", () => {
    const layout = generateWhiteRoomLayout(8);
    const allSlots = layout.cells.flatMap((c) => c.artworkSlots);
    const positions = allSlots.map((s) => s.position).sort((a, b) => a - b);

    // Positions should be 0, 1, 2, ..., n-1
    for (let i = 0; i < positions.length; i++) {
      expect(positions[i]).toBe(i);
    }
  });
});

// ----- DatabaseStorage method tests (mocked db) -----

describe("DatabaseStorage", () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new DatabaseStorage();
  });

  describe("getArtists", () => {
    it("returns db results directly", async () => {
      const mockArtists = [
        { id: "1", name: "Alice", bio: "Bio", userId: null, avatarUrl: null, country: null, specialization: null, email: null, galleryLayout: null, socialLinks: null },
      ];
      const selectMock = vi.mocked(db.select);
      const chain = selectMock();
      vi.mocked(chain.from).mockResolvedValueOnce(mockArtists as any);

      const result = await storage.getArtists();
      expect(result).toEqual(mockArtists);
    });

    it("selects an explicit column list without galleryLayout by default (#689)", async () => {
      const mockRows = [
        { id: "1", name: "Alice", bio: "Bio", userId: null, avatarUrl: null, country: null, specialization: null, email: null, galleryTemplate: "contemporary", socialLinks: null },
      ];
      const selectMock = vi.mocked(db.select);
      const chain = selectMock();
      vi.mocked(chain.from).mockResolvedValueOnce(mockRows as any);

      const result = await storage.getArtists();

      const columns = selectMock.mock.calls.at(-1)?.[0] as Record<string, unknown> | undefined;
      expect(columns).toBeDefined();
      expect(columns).not.toHaveProperty("galleryLayout");
      expect(result[0].galleryLayout).toBeNull();
    });

    it("selects the full row, including galleryLayout, when explicitly requested", async () => {
      const mockArtists = [
        { id: "1", name: "Alice", bio: "Bio", userId: null, avatarUrl: null, country: null, specialization: null, email: null, galleryLayout: { width: 5, height: 5, cells: [] }, socialLinks: null },
      ];
      const selectMock = vi.mocked(db.select);
      const chain = selectMock();
      vi.mocked(chain.from).mockResolvedValueOnce(mockArtists as any);

      const result = await storage.getArtists({ includeGalleryLayout: true });

      expect(selectMock.mock.calls.at(-1)?.[0]).toBeUndefined();
      expect(result).toEqual(mockArtists);
    });
  });

  describe("getArtworks", () => {
    it("filters to published by default and transforms join result", async () => {
      const joinResult = [
        {
          artworks: { id: "a1", title: "Painting", artistId: "art1", description: "desc", imageUrl: "url", price: "100", medium: "oil", dimensions: null, year: null, isPublished: true, isForSale: true, isInGallery: true, isReadyForExhibition: false, exhibitionOrder: null, category: "painting" },
          artists: { id: "art1", name: "Alice", bio: "Bio", userId: null, avatarUrl: null, country: null, specialization: null, email: null, galleryLayout: null, socialLinks: null },
        },
      ];

      const selectMock = vi.mocked(db.select);
      const chain = selectMock();
      vi.mocked(chain.from).mockReturnThis();
      vi.mocked(chain.innerJoin).mockReturnThis();
      vi.mocked(chain.where).mockReturnThis();
      vi.mocked(chain.orderBy).mockResolvedValueOnce(joinResult as any);

      const result = await storage.getArtworks();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Painting");
      expect(result[0].artist.name).toBe("Alice");
      expect(chain.where).toHaveBeenCalled();
      expect(chain.orderBy).toHaveBeenCalled();
    });

    it("strips galleryLayout from the joined artist (#689)", async () => {
      const joinResult = [
        {
          artworks: { id: "a1", title: "Painting", artistId: "art1", description: "desc", imageUrl: "url", price: "100", medium: "oil", dimensions: null, year: null, isPublished: true, isForSale: true, isInGallery: true, isReadyForExhibition: false, exhibitionOrder: null, category: "painting" },
          artists: { id: "art1", name: "Alice", bio: "Bio", userId: null, avatarUrl: null, country: null, specialization: null, email: null, galleryLayout: { width: 5, height: 5, cells: [] }, socialLinks: null },
        },
      ];

      const selectMock = vi.mocked(db.select);
      const chain = selectMock();
      vi.mocked(chain.from).mockReturnThis();
      vi.mocked(chain.innerJoin).mockReturnThis();
      vi.mocked(chain.where).mockReturnThis();
      vi.mocked(chain.orderBy).mockResolvedValueOnce(joinResult as any);

      const result = await storage.getArtworks();

      expect(result[0].artist.galleryLayout).toBeNull();
      const selectArg = selectMock.mock.calls.at(-1)?.[0] as { artists?: Record<string, unknown> } | undefined;
      expect(selectArg?.artists).toBeDefined();
      expect(selectArg?.artists).not.toHaveProperty("galleryLayout");
    });

    it("skips the published filter when includeDrafts is set", async () => {
      const joinResult = [
        {
          artworks: { id: "a1", title: "Draft", artistId: "art1", description: "", imageUrl: "url", price: "0", medium: "oil", dimensions: null, year: null, isPublished: false, isForSale: false, isInGallery: false, isReadyForExhibition: false, exhibitionOrder: null, category: "painting" },
          artists: { id: "art1", name: "Alice", bio: "Bio", userId: null, avatarUrl: null, country: null, specialization: null, email: null, galleryLayout: null, socialLinks: null },
        },
      ];

      const selectMock = vi.mocked(db.select);
      const chain = selectMock();
      vi.mocked(chain.from).mockReturnThis();
      vi.mocked(chain.innerJoin).mockReturnThis();
      vi.mocked(chain.orderBy).mockResolvedValueOnce(joinResult as any);

      const result = await storage.getArtworks({ includeDrafts: true });
      expect(result).toHaveLength(1);
      expect(result[0].isPublished).toBe(false);
      expect(chain.orderBy).toHaveBeenCalled();
    });
  });

  describe("getArtwork", () => {
    it("returns undefined for empty result", async () => {
      const selectMock = vi.mocked(db.select);
      const chain = selectMock();
      vi.mocked(chain.from).mockReturnThis();
      vi.mocked(chain.innerJoin).mockReturnThis();
      vi.mocked(chain.where).mockResolvedValueOnce([] as any);

      const result = await storage.getArtwork("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("createArtist", () => {
    it("passes data to insert and returns first row", async () => {
      const insertData = { name: "Bob", bio: "Hello" };
      const createdArtist = { id: "new-id", ...insertData, userId: null, avatarUrl: null, country: null, specialization: null, email: null, galleryLayout: null, socialLinks: null };

      const insertMock = vi.mocked(db.insert);
      const chain = insertMock(undefined as any);
      vi.mocked(chain.values).mockReturnThis();
      vi.mocked(chain.returning).mockResolvedValueOnce([createdArtist] as any);

      const result = await storage.createArtist(insertData);
      expect(result).toEqual(createdArtist);
    });

    it("derives a slug from name + id (issue #537)", async () => {
      const insertMock = vi.mocked(db.insert);
      let capturedValues: any;
      insertMock.mockImplementation(() => {
        const chain: any = {
          values: vi.fn().mockImplementation((v: any) => {
            capturedValues = v;
            return chain;
          }),
          returning: vi.fn().mockResolvedValue([{ id: "x", slug: capturedValues?.slug }]),
        };
        return chain;
      });

      await storage.createArtist({ name: "Alexandra Constantin", bio: "b" });

      expect(capturedValues).toBeDefined();
      expect(capturedValues.id).toMatch(/^[0-9a-f-]{36}$/i);
      const idPrefix = capturedValues.id.replace(/-/g, "").slice(0, 8);
      expect(capturedValues.slug).toBe(`alexandra-constantin-${idPrefix}`);
    });
  });

  describe("updateArtist (issue #537)", () => {
    it("regenerates slug and retires the old slug into history on rename", async () => {
      // Current row returned by the pre-update SELECT inside the transaction.
      const selectMock = vi.mocked(db.select);
      selectMock.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi
                .fn()
                .mockResolvedValue([{ slug: "old-name-4493f600" }]),
            }),
          }) as any,
      );

      // Capture the insert into artist_slug_history.
      const insertMock = vi.mocked(db.insert);
      let historyValues: any;
      insertMock.mockImplementation(() => {
        const chain: any = {
          values: vi.fn().mockImplementation((v: any) => {
            historyValues = v;
            return chain;
          }),
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
          returning: vi.fn().mockResolvedValue([]),
        };
        return chain;
      });

      // Capture the update to artists.
      const updateMock = vi.mocked(db.update);
      let capturedSet: any;
      updateMock.mockImplementation(() => {
        const chain: any = {
          set: vi.fn().mockImplementation((data: any) => {
            capturedSet = data;
            return chain;
          }),
          where: vi.fn().mockReturnValue({
            returning: vi
              .fn()
              .mockResolvedValue([{ id: "4493f600-2619-47f9-979c-abc5b45ba92d" }]),
          }),
        };
        return chain;
      });

      await storage.updateArtist(
        "4493f600-2619-47f9-979c-abc5b45ba92d",
        { name: "New Name" },
      );

      expect(capturedSet.slug).toBe("new-name-4493f600");
      expect(historyValues).toEqual({
        slug: "old-name-4493f600",
        artistId: "4493f600-2619-47f9-979c-abc5b45ba92d",
      });
    });

    it("leaves slug untouched when name is not in the update payload", async () => {
      const updateMock = vi.mocked(db.update);
      let capturedSet: any;
      updateMock.mockImplementation(() => {
        const chain: any = {
          set: vi.fn().mockImplementation((data: any) => {
            capturedSet = data;
            return chain;
          }),
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "a1" }]),
          }),
        };
        return chain;
      });

      await storage.updateArtist("a1", { bio: "Updated bio" });

      expect(capturedSet).toBeDefined();
      expect(capturedSet.slug).toBeUndefined();
      expect(capturedSet.bio).toBe("Updated bio");
    });

    it("does not retire the slug when the new slug is identical to the current one", async () => {
      // The current row already has the slug we'd generate for "Alice" /
      // this id, so the old-vs-new compare short-circuits.
      const selectMock = vi.mocked(db.select);
      selectMock.mockImplementationOnce(
        () =>
          ({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ slug: "alice-4493f600" }]),
            }),
          }) as any,
      );

      const insertMock = vi.mocked(db.insert);
      insertMock.mockClear();

      const updateMock = vi.mocked(db.update);
      updateMock.mockImplementation(() => {
        const chain: any = {};
        chain.set = vi.fn().mockReturnValue(chain);
        chain.where = vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "x" }]),
        });
        return chain;
      });

      await storage.updateArtist(
        "4493f600-2619-47f9-979c-abc5b45ba92d",
        { name: "Alice" },
      );

      // No history insert should have happened.
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  describe("deleteArtwork", () => {
    it("executes cascading deletes in correct order", async () => {
      const callOrder: string[] = [];

      const deleteMock = vi.mocked(db.delete);
      deleteMock.mockImplementation((table: any) => {
        callOrder.push(table?.toString?.() ?? "unknown");
        const chain: any = {
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "a1" }]),
          }),
        };
        return chain;
      });

      await storage.deleteArtwork("a1");

      // Should have called delete 6 times (curator_gallery_artworks, exhibition_artworks, bids, auctions, orders, artworks)
      expect(deleteMock).toHaveBeenCalledTimes(6);
    });
  });

  describe("createOrder / updateOrderStatus (issue #687)", () => {
    it("createOrder inserts the order and marks the artwork not for sale, in one transaction", async () => {
      const insertMock = vi.mocked(db.insert);
      insertMock.mockImplementation(() => {
        const chain: any = {
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ id: "o1", artworkId: "a1", status: "pending" }]),
        };
        return chain;
      });

      const updateMock = vi.mocked(db.update);
      let updatedTable: any;
      let capturedSet: any;
      updateMock.mockImplementation((table: any) => {
        updatedTable = table;
        const chain: any = {
          set: vi.fn().mockImplementation((data: any) => {
            capturedSet = data;
            return chain;
          }),
          where: vi.fn().mockResolvedValue(undefined),
        };
        return chain;
      });

      const order = await storage.createOrder({
        artworkId: "a1",
        buyerName: "John",
        buyerEmail: "john@example.com",
        shippingAddress: "123 Main St",
        totalAmount: "500.00",
        status: "pending",
      } as any);

      expect(order).toEqual({ id: "o1", artworkId: "a1", status: "pending" });
      expect(db.transaction).toHaveBeenCalled();
      expect(updatedTable).toBe(artworks);
      expect(capturedSet).toEqual({ isForSale: false });
    });

    it("createOrder translates a unique-constraint violation into ArtworkAlreadySoldError", async () => {
      const insertMock = vi.mocked(db.insert);
      insertMock.mockImplementation(() => {
        const chain: any = {
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockRejectedValue(Object.assign(new Error("duplicate key"), { code: "23505" })),
        };
        return chain;
      });

      await expect(
        storage.createOrder({
          artworkId: "a1",
          buyerName: "John",
          buyerEmail: "john@example.com",
          shippingAddress: "123 Main St",
          totalAmount: "500.00",
          status: "pending",
        } as any),
      ).rejects.toThrow(ArtworkAlreadySoldError);
    });

    it("updateOrderStatus re-lists the artwork when the order is canceled", async () => {
      const updateMock = vi.mocked(db.update);
      const updatedTables: any[] = [];
      let artworkSet: any;
      updateMock.mockImplementation((table: any) => {
        updatedTables.push(table);
        if (table === orders) {
          const chain: any = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "o1", artworkId: "a1", status: "canceled" }]),
            }),
          };
          return chain;
        }
        const chain: any = {
          set: vi.fn().mockImplementation((data: any) => {
            artworkSet = data;
            return chain;
          }),
          where: vi.fn().mockResolvedValue(undefined),
        };
        return chain;
      });

      const result = await storage.updateOrderStatus("o1", "canceled");

      expect(result).toEqual({ id: "o1", artworkId: "a1", status: "canceled" });
      expect(updatedTables).toContain(artworks);
      expect(artworkSet).toEqual({ isForSale: true });
    });

    it("updateOrderStatus does not touch the artwork for a non-canceling transition", async () => {
      const updateMock = vi.mocked(db.update);
      updateMock.mockImplementation((table: any) => {
        if (table === orders) {
          const chain: any = {
            set: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: "o1", artworkId: "a1", status: "communicating" }]),
            }),
          };
          return chain;
        }
        throw new Error("should not update artworks for a non-canceling transition");
      });

      const result = await storage.updateOrderStatus("o1", "communicating");
      expect(result).toEqual({ id: "o1", artworkId: "a1", status: "communicating" });
    });
  });

  describe("updateBlogPost", () => {
    it("sets updatedAt to current date", async () => {
      const before = new Date();

      const updateMock = vi.mocked(db.update);
      let capturedSet: any;
      updateMock.mockImplementation(() => {
        const chain: any = {
          set: vi.fn().mockImplementation((data: any) => {
            capturedSet = data;
            return chain;
          }),
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "p1", updatedAt: new Date() }]),
          }),
        };
        return chain;
      });

      await storage.updateBlogPost("p1", { title: "Updated" });

      expect(capturedSet).toBeDefined();
      expect(capturedSet.title).toBe("Updated");
      expect(capturedSet.updatedAt).toBeInstanceOf(Date);
      expect(capturedSet.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe("recordShareEvent (issue #569)", () => {
    it("inserts the event payload and returns the row", async () => {
      const insertMock = vi.mocked(db.insert);
      let capturedValues: any;
      insertMock.mockImplementation(() => {
        const chain: any = {
          values: vi.fn().mockImplementation((data: any) => {
            capturedValues = data;
            return chain;
          }),
          returning: vi.fn().mockResolvedValue([
            {
              id: "evt-1",
              itemType: "artwork",
              itemId: "aw-1",
              platform: "facebook",
              userId: null,
              userAgentClass: "desktop",
              createdAt: new Date(),
            },
          ]),
        };
        return chain;
      });

      const result = await storage.recordShareEvent({
        itemType: "artwork",
        itemId: "aw-1",
        platform: "facebook",
        userAgentClass: "desktop",
      });

      expect(capturedValues.itemType).toBe("artwork");
      expect(capturedValues.itemId).toBe("aw-1");
      expect(capturedValues.platform).toBe("facebook");
      expect(capturedValues.userId).toBeNull();
      expect(result.id).toBe("evt-1");
    });

    it("persists userId when supplied", async () => {
      const insertMock = vi.mocked(db.insert);
      let capturedValues: any;
      insertMock.mockImplementation(() => {
        const chain: any = {
          values: vi.fn().mockImplementation((data: any) => {
            capturedValues = data;
            return chain;
          }),
          returning: vi.fn().mockResolvedValue([{ id: "evt-2" }]),
        };
        return chain;
      });

      await storage.recordShareEvent({
        itemType: "blog",
        itemId: "post-1",
        platform: "x",
        userId: "user-42",
      });

      expect(capturedValues.userId).toBe("user-42");
    });
  });
});
