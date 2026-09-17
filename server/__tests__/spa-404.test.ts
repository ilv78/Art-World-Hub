import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

const mockStorageState: {
  artist: Record<string, unknown> | undefined;
  artwork: Record<string, unknown> | undefined;
} = { artist: undefined, artwork: undefined };

vi.mock("../storage", () => ({
  storage: {
    getArtistBySlug: vi.fn(async () => mockStorageState.artist),
    getPublishedArtworkBySlug: vi.fn(async () => mockStorageState.artwork),
    getBlogPost: vi.fn().mockResolvedValue(undefined),
    getCuratorGallery: vi.fn().mockResolvedValue(undefined),
    getHomeHeroSlide0: vi.fn().mockResolvedValue(null),
  },
}));

const { createSpaCatchAllHandler } = await import("../static");

const TEMPLATE =
  "<html><head><title>__META_TITLE__</title></head><body>App shell</body></html>";

function buildApp() {
  const app = express();
  app.use("/{*path}", createSpaCatchAllHandler(TEMPLATE));
  return app;
}

describe("SPA catch-all HTTP status (issue #508 — no soft-404)", () => {
  beforeEach(() => {
    mockStorageState.artist = undefined;
    mockStorageState.artwork = undefined;
  });

  it("returns 200 and the SPA shell for real static routes", async () => {
    const app = buildApp();
    for (const url of ["/", "/gallery", "/store", "/artists", "/exhibitions"]) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
      expect(res.text).toContain("App shell");
    }
  });

  it("returns 200 for app routes with no custom SEO meta", async () => {
    const app = buildApp();
    for (const url of ["/dashboard", "/admin", "/auth", "/curator", "/koningsdag"]) {
      const res = await request(app).get(url);
      expect(res.status).toBe(200);
    }
  });

  it("returns 404 (still serving the SPA shell) for an unknown top-level route", async () => {
    const app = buildApp();
    const res = await request(app).get("/this-page-does-not-exist");
    expect(res.status).toBe(404);
    expect(res.text).toContain("App shell");
  });

  it("returns 404 for /artists/:slug when the artist doesn't exist", async () => {
    mockStorageState.artist = undefined;
    const app = buildApp();
    const res = await request(app).get("/artists/nonexistent-uuid");
    expect(res.status).toBe(404);
  });

  it("returns 200 for /artists/:slug when the artist exists", async () => {
    mockStorageState.artist = { name: "Ana", slug: "ana", bio: null, avatarUrl: null, specialization: null, socialLinks: null };
    const app = buildApp();
    const res = await request(app).get("/artists/ana");
    expect(res.status).toBe(200);
  });

  it("still 404s /uploads, /api, /assets misses ahead of route resolution", async () => {
    const app = buildApp();
    const res = await request(app).get("/uploads/artworks/missing.webp");
    expect(res.status).toBe(404);
  });
});
