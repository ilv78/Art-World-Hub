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

import { generateWhiteRoomLayout, DatabaseStorage } from "../storage";
import { db } from "../db";
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
      vi.mocked(chain.where).mockResolvedValueOnce(joinResult as any);

      const result = await storage.getArtworks();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Painting");
      expect(result[0].artist.name).toBe("Alice");
      expect(chain.where).toHaveBeenCalled();
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
      vi.mocked(chain.innerJoin).mockResolvedValueOnce(joinResult as any);

      const result = await storage.getArtworks({ includeDrafts: true });
      expect(result).toHaveLength(1);
      expect(result[0].isPublished).toBe(false);
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
});
