import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    getArtists: vi.fn(),
    getAllBlogPosts: vi.fn(),
    getArtworks: vi.fn(),
  },
}));

vi.mock("../storage", () => ({ storage: mockStorage }));

vi.mock("../logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Dynamic import after mocks so the router picks up the mocked storage.
let sitemapRouter: express.Router;
let resetCache: () => void;

beforeAll(async () => {
  const mod = await import("../routes/sitemap");
  sitemapRouter = mod.default;
  resetCache = mod.__resetSitemapCacheForTests;
});

function makeApp() {
  const app = express();
  app.use("/", sitemapRouter);
  return app;
}

function artistRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "artist-1",
    name: "Alexandra",
    bio: "bio",
    avatarUrl: null,
    galleryLayout: null,
    ...overrides,
  };
}

function artworkRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "artwork-1",
    slug: "my-piece-abc123",
    title: "My Piece",
    description: "A reverse glass painting, hand-finished.",
    imageUrl: "https://cdn.example.com/images/piece.jpg",
    artistId: "artist-1",
    price: "100",
    medium: "oil",
    dimensions: null,
    year: 2026,
    isPublished: true,
    isForSale: true,
    isInGallery: true,
    isReadyForExhibition: false,
    exhibitionOrder: null,
    category: "painting",
    ...overrides,
  };
}

function blogPostRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    title: "My Post",
    content: "body",
    excerpt: "excerpt",
    artistId: "artist-1",
    coverImageUrl: null,
    isPublished: true,
    createdAt: new Date("2026-04-01T00:00:00Z"),
    updatedAt: new Date("2026-04-10T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  resetCache();
  mockStorage.getArtists.mockReset();
  mockStorage.getAllBlogPosts.mockReset();
  mockStorage.getArtworks.mockReset();
  mockStorage.getArtists.mockResolvedValue([]);
  mockStorage.getAllBlogPosts.mockResolvedValue([]);
  mockStorage.getArtworks.mockResolvedValue([]);
});

describe("GET /sitemap.xml — image sitemap (#504)", () => {
  it("declares the Google image-sitemap namespace", async () => {
    const res = await request(makeApp()).get("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/xml/);
    expect(res.text).toContain(
      'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
    );
  });

  it("adds <image:image> with title + caption for each artwork URL", async () => {
    mockStorage.getArtworks.mockResolvedValue([artworkRow()]);
    const res = await request(makeApp()).get("/sitemap.xml");
    expect(res.text).toContain("<loc>https://vernis9.art/artworks/my-piece-abc123</loc>");
    expect(res.text).toContain("<image:loc>https://cdn.example.com/images/piece.jpg</image:loc>");
    expect(res.text).toContain("<image:title>My Piece</image:title>");
    expect(res.text).toContain(
      "<image:caption>A reverse glass painting, hand-finished.</image:caption>",
    );
  });

  it("adds <image:image> for an artist with an avatar", async () => {
    mockStorage.getArtists.mockResolvedValue([
      artistRow({ avatarUrl: "https://cdn.example.com/avatars/a.jpg" }),
    ]);
    const res = await request(makeApp()).get("/sitemap.xml");
    expect(res.text).toContain("<image:loc>https://cdn.example.com/avatars/a.jpg</image:loc>");
    expect(res.text).toContain("<image:title>Alexandra</image:title>");
  });

  it("omits <image:image> for an artist without an avatar", async () => {
    mockStorage.getArtists.mockResolvedValue([artistRow({ avatarUrl: null })]);
    const res = await request(makeApp()).get("/sitemap.xml");
    const artistBlock = res.text.match(
      /<url>\s*<loc>https:\/\/vernis9\.art\/artists\/artist-1<\/loc>[\s\S]*?<\/url>/,
    );
    expect(artistBlock).not.toBeNull();
    expect(artistBlock![0]).not.toContain("<image:image>");
  });

  it("XML-escapes titles and captions containing special characters", async () => {
    mockStorage.getArtworks.mockResolvedValue([
      artworkRow({
        title: 'Foo & Bar <i> "quoted"',
        description: "He said: 'escape me'",
      }),
    ]);
    const res = await request(makeApp()).get("/sitemap.xml");
    expect(res.text).toContain(
      "<image:title>Foo &amp; Bar &lt;i&gt; &quot;quoted&quot;</image:title>",
    );
    expect(res.text).toContain(
      "<image:caption>He said: &apos;escape me&apos;</image:caption>",
    );
    // And crucially, no raw ampersand escapes into the emitted XML body.
    expect(res.text).not.toMatch(/<image:title>[^<]*& [^<]*<\/image:title>/);
  });

  it("truncates oversize captions to ~500 chars with an ellipsis", async () => {
    const longDesc = "x".repeat(1200);
    mockStorage.getArtworks.mockResolvedValue([artworkRow({ description: longDesc })]);
    const res = await request(makeApp()).get("/sitemap.xml");
    const match = res.text.match(/<image:caption>([\s\S]*?)<\/image:caption>/);
    expect(match).not.toBeNull();
    expect(match![1].length).toBeLessThanOrEqual(500);
    expect(match![1].endsWith("…")).toBe(true);
  });

  it("adds <image:image> for a blog post with a cover image, skips posts without one", async () => {
    mockStorage.getAllBlogPosts.mockResolvedValue([
      blogPostRow({ id: "post-with-cover", coverImageUrl: "https://cdn.example.com/cover.jpg" }),
      blogPostRow({ id: "post-no-cover", coverImageUrl: null }),
    ]);
    const res = await request(makeApp()).get("/sitemap.xml");
    expect(res.text).toContain("<loc>https://vernis9.art/blog/post-with-cover</loc>");
    expect(res.text).toContain("<image:loc>https://cdn.example.com/cover.jpg</image:loc>");
    const noCoverBlock = res.text.match(
      /<url>\s*<loc>https:\/\/vernis9\.art\/blog\/post-no-cover<\/loc>[\s\S]*?<\/url>/,
    );
    expect(noCoverBlock).not.toBeNull();
    expect(noCoverBlock![0]).not.toContain("<image:image>");
  });

  it("drops unpublished blog posts (published gate preserved)", async () => {
    mockStorage.getAllBlogPosts.mockResolvedValue([
      blogPostRow({ id: "draft-post", isPublished: false }),
    ]);
    const res = await request(makeApp()).get("/sitemap.xml");
    expect(res.text).not.toContain("/blog/draft-post");
  });

  it("serves the cached XML on the second hit without re-querying storage", async () => {
    const app = makeApp();
    await request(app).get("/sitemap.xml");
    const callsAfterFirst = mockStorage.getArtworks.mock.calls.length;
    await request(app).get("/sitemap.xml");
    expect(mockStorage.getArtworks.mock.calls.length).toBe(callsAfterFirst);
  });

  it("absolutizes image URLs that come in as site-relative paths", async () => {
    mockStorage.getArtworks.mockResolvedValue([
      artworkRow({ imageUrl: "/uploads/foo.jpg" }),
    ]);
    const res = await request(makeApp()).get("/sitemap.xml");
    expect(res.text).toContain("<image:loc>https://vernis9.art/uploads/foo.jpg</image:loc>");
  });
});
