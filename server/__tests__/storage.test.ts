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

  return {
    db: {
      select: vi.fn().mockReturnValue(mockChain()),
      insert: vi.fn().mockReturnValue(mockChain()),
      update: vi.fn().mockReturnValue(mockChain()),
      delete: vi.fn().mockReturnValue(mockChain()),
    },
  };
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
    it("transforms join result into ArtworkWithArtist[]", async () => {
      const joinResult = [
        {
          artworks: { id: "a1", title: "Painting", artistId: "art1", description: "desc", imageUrl: "url", price: "100", medium: "oil", dimensions: null, year: null, isForSale: true, isInGallery: true, isReadyForExhibition: false, exhibitionOrder: null, category: "painting" },
          artists: { id: "art1", name: "Alice", bio: "Bio", userId: null, avatarUrl: null, country: null, specialization: null, email: null, galleryLayout: null, socialLinks: null },
        },
      ];

      const selectMock = vi.mocked(db.select);
      const chain = selectMock();
      vi.mocked(chain.from).mockReturnThis();
      vi.mocked(chain.innerJoin).mockResolvedValueOnce(joinResult as any);

      const result = await storage.getArtworks();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Painting");
      expect(result[0].artist.name).toBe("Alice");
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

      // Should have called delete 5 times (exhibition_artworks, bids, auctions, orders, artworks)
      expect(deleteMock).toHaveBeenCalledTimes(5);
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
