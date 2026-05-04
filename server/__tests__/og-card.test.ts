import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import path from "path";
import fs from "fs/promises";
import os from "os";
import sharp from "sharp";

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    getPublishedArtworkBySlug: vi.fn(),
    getBlogPost: vi.fn(),
    getCuratorGallery: vi.fn(),
    getArtistBySlug: vi.fn(),
  },
}));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

let ogCardsRouter: express.Router;
let originalCwd: string;
let cacheDir: string;
let fixturesDir: string;
let fixtureImage: string;

async function makeFixtureImage(): Promise<string> {
  // 200x200 solid JPEG saved into the cwd-relative uploads/ tree so the route's
  // resolveAssetPath() (cwd + asset URL) resolves to a real file.
  const uploads = path.join(process.cwd(), "uploads", "artworks");
  await fs.mkdir(uploads, { recursive: true });
  const out = path.join(uploads, "test-fixture.jpg");
  await sharp({
    create: {
      width: 200,
      height: 200,
      channels: 3,
      background: { r: 100, g: 100, b: 200 },
    },
  })
    .jpeg()
    .toFile(out);
  return out;
}

beforeAll(async () => {
  const mod = await import("../routes/og-cards");
  ogCardsRouter = mod.default;

  // Run in an isolated cwd so the on-disk cache (uploads/og-cards) and our
  // fixture (uploads/artworks/test-fixture.jpg) live under a tmp dir and the
  // real repo isn't touched. We still need client/public/og-default.png to
  // exist so the fallback path works — copy it from the real cwd first.
  originalCwd = process.cwd();
  fixturesDir = await fs.mkdtemp(path.join(os.tmpdir(), "og-card-test-"));
  await fs.mkdir(path.join(fixturesDir, "client", "public"), { recursive: true });
  await fs.copyFile(
    path.join(originalCwd, "client", "public", "og-default.png"),
    path.join(fixturesDir, "client", "public", "og-default.png"),
  );
  process.chdir(fixturesDir);

  fixtureImage = await makeFixtureImage();
  cacheDir = path.join(fixturesDir, "uploads", "og-cards");
});

beforeEach(async () => {
  vi.clearAllMocks();
  // Wipe the cache between tests so each test deterministically exercises the
  // first-render path or the cache-hit path as it intends.
  await fs.rm(cacheDir, { recursive: true, force: true });
});

function makeApp() {
  const app = express();
  app.use("/", ogCardsRouter);
  return app;
}

function artworkRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "artwork-1",
    slug: "my-piece-abc",
    title: "My Piece",
    description: "Test artwork",
    imageUrl: "/uploads/artworks/test-fixture.jpg",
    price: "100",
    medium: "oil",
    year: 2026,
    category: "painting",
    isPublished: true,
    isForSale: true,
    artist: { id: "a1", slug: "alexandra", name: "Alexandra", avatarUrl: null },
    ...overrides,
  };
}

describe("GET /api/og/:type/:id.jpg", () => {
  it("returns a 1200x630 JPEG for a published artwork", async () => {
    mockStorage.getPublishedArtworkBySlug.mockResolvedValue(artworkRow());
    const res = await request(makeApp()).get("/api/og/artwork/my-piece-abc.jpg");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/jpeg");
    expect(res.headers["x-og-cache"]).toBe("miss");
    const meta = await sharp(res.body).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(meta.format).toBe("jpeg");
  });

  it("serves from cache on the second request and sets X-OG-Cache: hit", async () => {
    mockStorage.getPublishedArtworkBySlug.mockResolvedValue(artworkRow());
    const app = makeApp();
    const first = await request(app).get("/api/og/artwork/my-piece-abc.jpg");
    expect(first.headers["x-og-cache"]).toBe("miss");
    const second = await request(app).get("/api/og/artwork/my-piece-abc.jpg");
    expect(second.headers["x-og-cache"]).toBe("hit");
    expect(second.body.equals(first.body)).toBe(true);
  });

  it("falls back to og-default.png when the item is not found", async () => {
    mockStorage.getPublishedArtworkBySlug.mockResolvedValue(undefined);
    const res = await request(makeApp()).get("/api/og/artwork/missing.jpg");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["cache-control"]).toMatch(/max-age=300/);
  });

  it("rejects unknown types by serving the default card", async () => {
    const res = await request(makeApp()).get("/api/og/auction/whatever.jpg");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  });

  it("falls back to default when the source image is unreadable", async () => {
    mockStorage.getPublishedArtworkBySlug.mockResolvedValue(
      artworkRow({ imageUrl: "/uploads/artworks/does-not-exist.jpg" }),
    );
    const res = await request(makeApp()).get("/api/og/artwork/my-piece-abc.jpg");
    // Composition fails inside sharp — route catches and returns default PNG.
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/png");
  });

  it("renders without a source image (uses solid background)", async () => {
    mockStorage.getArtistBySlug.mockResolvedValue({
      id: "a1",
      slug: "no-avatar",
      name: "No Avatar Artist",
      bio: "Test",
      avatarUrl: null,
      specialization: "Painter",
    });
    const res = await request(makeApp()).get("/api/og/artist/no-avatar.jpg");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/jpeg");
    const meta = await sharp(res.body).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
  });
});
