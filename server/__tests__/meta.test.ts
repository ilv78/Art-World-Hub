import { describe, it, expect, vi } from "vitest";

const mockStorageState: {
  artwork: Record<string, unknown> | undefined;
  artist: Record<string, unknown> | undefined;
} = { artwork: undefined, artist: undefined };

vi.mock("../storage", () => ({
  storage: {
    getArtist: vi.fn(async () => mockStorageState.artist),
    getArtistBySlug: vi.fn(async () => mockStorageState.artist),
    getBlogPost: vi.fn().mockResolvedValue(undefined),
    getPublishedArtworkBySlug: vi.fn(async () => mockStorageState.artwork),
  },
}));

const { resolveMetaTags } = await import("../meta");

function setMockArtwork(artwork: Record<string, unknown> | undefined) {
  mockStorageState.artwork = artwork;
}

function baseArtwork(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    title: "Red Harbor Sunset",
    slug: "red-harbor-sunset-aaaaaaaa",
    description: "A bold study of evening light over the harbor.",
    imageUrl: "/uploads/artwork-1.jpg",
    artistId: "artist-1",
    price: "1250.00",
    medium: "Oil on canvas",
    dimensions: "50 x 70 cm",
    year: 2024,
    isPublished: true,
    isForSale: true,
    isInGallery: true,
    isReadyForExhibition: true,
    exhibitionOrder: null,
    category: "Painting",
    artist: {
      id: "artist-1",
      slug: "ana-popescu-artist01",
      name: "Ana Popescu",
      avatarUrl: "/uploads/avatar-ana.jpg",
      bio: null,
      specialization: null,
    },
    ...overrides,
  };
}

function findLd(
  jsonLd: Record<string, unknown>[],
  type: string,
): Record<string, unknown> | undefined {
  return jsonLd.find((ld) => ld["@type"] === type);
}

describe("resolveMetaTags — homepage JSON-LD (issue #501)", () => {
  it("emits Organization, WebSite, FAQPage, and BreadcrumbList on /", async () => {
    const meta = await resolveMetaTags("/");
    const types = meta.jsonLd.map((ld) => ld["@type"]);
    expect(types).toEqual(
      expect.arrayContaining(["Organization", "WebSite", "FAQPage", "BreadcrumbList"]),
    );
    expect(meta.jsonLd).toHaveLength(4);
  });

  it("WebSite block has a SearchAction pointing at /store?q=", async () => {
    const meta = await resolveMetaTags("/");
    const website = findLd(meta.jsonLd, "WebSite");
    expect(website).toBeDefined();
    const action = website!.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    const target = action.target as Record<string, unknown>;
    expect(String(target.urlTemplate)).toMatch(/\/store\?search=\{search_term_string\}$/);
    expect(action["query-input"]).toBe("required name=search_term_string");
  });

  it("FAQPage block has Question/Answer pairs with non-empty content", async () => {
    const meta = await resolveMetaTags("/");
    const faq = findLd(meta.jsonLd, "FAQPage");
    expect(faq).toBeDefined();
    const mainEntity = faq!.mainEntity as Record<string, unknown>[];
    expect(mainEntity.length).toBeGreaterThanOrEqual(4);
    for (const q of mainEntity) {
      expect(q["@type"]).toBe("Question");
      expect(String(q.name).length).toBeGreaterThan(0);
      const answer = q.acceptedAnswer as Record<string, unknown>;
      expect(answer["@type"]).toBe("Answer");
      expect(String(answer.text).length).toBeGreaterThan(0);
    }
  });

  it("does not emit WebSite or FAQPage on non-root static routes", async () => {
    for (const path of ["/gallery", "/store", "/artists", "/blog"]) {
      const meta = await resolveMetaTags(path);
      const types = meta.jsonLd.map((ld) => ld["@type"]);
      expect(types).not.toContain("WebSite");
      expect(types).not.toContain("FAQPage");
    }
  });

  it("does not emit WebSite or FAQPage on unknown routes (fallback)", async () => {
    const meta = await resolveMetaTags("/some/unknown/path");
    const types = meta.jsonLd.map((ld) => ld["@type"]);
    expect(types).not.toContain("WebSite");
    expect(types).not.toContain("FAQPage");
  });
});

describe("resolveMetaTags — /artworks/:slug (issue #503)", () => {
  it("emits VisualArtwork JSON-LD with creator + Offer when for-sale", async () => {
    setMockArtwork(baseArtwork());
    const meta = await resolveMetaTags("/artworks/red-harbor-sunset-aaaaaaaa");
    const types = meta.jsonLd.map((ld) => ld["@type"]);
    expect(types).toContain("VisualArtwork");
    expect(types).toContain("BreadcrumbList");

    const visual = findLd(meta.jsonLd, "VisualArtwork")!;
    expect(visual.name).toBe("Red Harbor Sunset");
    expect(visual.artMedium).toBe("Oil on canvas");
    expect(visual.dateCreated).toBe("2024");

    const creator = visual.creator as Record<string, unknown>;
    expect(creator["@type"]).toBe("Person");
    expect(creator.name).toBe("Ana Popescu");

    const offer = visual.offers as Record<string, unknown>;
    expect(offer["@type"]).toBe("Offer");
    expect(offer.price).toBe("1250.00");
    expect(offer.priceCurrency).toBe("EUR");
    expect(offer.availability).toBe("https://schema.org/InStock");

    expect(meta.title).toBe("Red Harbor Sunset by Ana Popescu — Vernis9");
    expect(meta.ogType).toBe("article");
  });

  it("omits Offer block when not for sale", async () => {
    setMockArtwork(baseArtwork({ isForSale: false }));
    const meta = await resolveMetaTags("/artworks/red-harbor-sunset-aaaaaaaa");
    const visual = findLd(meta.jsonLd, "VisualArtwork")!;
    expect(visual.offers).toBeUndefined();
  });

  it("omits Offer block when price is zero or missing", async () => {
    setMockArtwork(baseArtwork({ price: "0" }));
    const meta = await resolveMetaTags("/artworks/red-harbor-sunset-aaaaaaaa");
    const visual = findLd(meta.jsonLd, "VisualArtwork")!;
    expect(visual.offers).toBeUndefined();
  });

  it("falls back to default meta when slug not found", async () => {
    setMockArtwork(undefined);
    const meta = await resolveMetaTags("/artworks/does-not-exist-00000000");
    const types = meta.jsonLd.map((ld) => ld["@type"]);
    expect(types).not.toContain("VisualArtwork");
  });
});

function setMockArtist(artist: Record<string, unknown> | undefined) {
  mockStorageState.artist = artist;
}

function baseArtist(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "artist-alex",
    slug: "alexandra-constantin-alex0001",
    name: "Alexandra Constantin",
    bio: "Reverse glass painter based in the Netherlands.",
    avatarUrl: "/uploads/avatar-alex.jpg",
    country: "Netherlands",
    specialization: "Reverse glass painting",
    email: "a@example.com",
    socialLinks: null,
    ...overrides,
  };
}

describe("resolveMetaTags — /artists/:slug Person.sameAs (issue #535)", () => {
  it("emits sameAs from absolute URLs in socialLinks", async () => {
    setMockArtist(
      baseArtist({
        socialLinks: {
          instagram: "https://www.instagram.com/alexandraconstantin1983/",
          website: "https://www.je-suis-une-femme.art/femme/",
        },
      }),
    );
    const meta = await resolveMetaTags("/artists/alexandra-constantin-alex0001");
    const person = findLd(meta.jsonLd, "Person")!;
    expect(person.name).toBe("Alexandra Constantin");
    const sameAs = person.sameAs as string[];
    expect(sameAs).toContain("https://www.instagram.com/alexandraconstantin1983/");
    expect(sameAs).toContain("https://www.je-suis-une-femme.art/femme/");
    expect(sameAs.length).toBe(2);
  });

  it("omits sameAs entirely when socialLinks is empty or null", async () => {
    setMockArtist(baseArtist({ socialLinks: null }));
    let person = findLd(
      (await resolveMetaTags("/artists/alexandra-constantin-alex0001")).jsonLd,
      "Person",
    )!;
    expect(person.sameAs).toBeUndefined();

    setMockArtist(baseArtist({ socialLinks: {} }));
    person = findLd(
      (await resolveMetaTags("/artists/alexandra-constantin-alex0001")).jsonLd,
      "Person",
    )!;
    expect(person.sameAs).toBeUndefined();
  });

  it("drops non-URL entries (empty strings, relative paths, bare handles)", async () => {
    setMockArtist(
      baseArtist({
        socialLinks: {
          instagram: "https://instagram.com/alex",
          website: "", // empty
          twitter: "@alex", // bare handle
          portfolio: "/portfolio", // relative path
          blog: "http://blog.example.com",
        },
      }),
    );
    const person = findLd(
      (await resolveMetaTags("/artists/alexandra-constantin-alex0001")).jsonLd,
      "Person",
    )!;
    const sameAs = person.sameAs as string[];
    expect(sameAs).toEqual([
      "https://instagram.com/alex",
      "http://blog.example.com",
    ]);
  });

  it("puts the artist's full name in the title and Person.name", async () => {
    setMockArtist(baseArtist());
    const meta = await resolveMetaTags("/artists/alexandra-constantin-alex0001");
    expect(meta.title).toBe("Alexandra Constantin \u2014 Vernis9");
    expect(meta.ogTitle).toBe("Alexandra Constantin \u2014 Vernis9");
    const person = findLd(meta.jsonLd, "Person")!;
    expect(person.name).toBe("Alexandra Constantin");
  });
});

describe("resolveMetaTags — /artists/:slug canonical URL (issue #537)", () => {
  it("Person.url and ogUrl use the slug, not the id", async () => {
    setMockArtist(baseArtist());
    const meta = await resolveMetaTags("/artists/alexandra-constantin-alex0001");
    const person = findLd(meta.jsonLd, "Person")!;
    expect(person.url).toBe(
      "https://vernis9.art/artists/alexandra-constantin-alex0001",
    );
    expect(meta.ogUrl).toBe(
      "https://vernis9.art/artists/alexandra-constantin-alex0001",
    );
  });

  it("falls back to default meta when slug not found", async () => {
    setMockArtist(undefined);
    const meta = await resolveMetaTags("/artists/does-not-exist-00000000");
    const types = meta.jsonLd.map((ld) => ld["@type"]);
    expect(types).not.toContain("Person");
  });
});
