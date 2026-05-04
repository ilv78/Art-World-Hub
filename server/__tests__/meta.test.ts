import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorageState: {
  artwork: Record<string, unknown> | undefined;
  artist: Record<string, unknown> | undefined;
  curatorGallery: Record<string, unknown> | undefined;
  homeHero: { id: string; imageUrl: string } | null;
} = { artwork: undefined, artist: undefined, curatorGallery: undefined, homeHero: null };

const getHomeHeroSlide0Mock = vi.fn(async () => mockStorageState.homeHero);

vi.mock("../storage", () => ({
  storage: {
    getArtist: vi.fn(async () => mockStorageState.artist),
    getArtistBySlug: vi.fn(async () => mockStorageState.artist),
    getBlogPost: vi.fn().mockResolvedValue(undefined),
    getPublishedArtworkBySlug: vi.fn(async () => mockStorageState.artwork),
    getCuratorGallery: vi.fn(async () => mockStorageState.curatorGallery),
    getHomeHeroSlide0: getHomeHeroSlide0Mock,
  },
}));

const { resolveMetaTags, injectMetaTags, __resetHomeHeroCache } = await import("../meta");

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

describe("LCP image preload — / only (issue #560)", () => {
  beforeEach(() => {
    __resetHomeHeroCache();
    getHomeHeroSlide0Mock.mockClear();
    mockStorageState.homeHero = null;
  });

  it("populates lcpImagePreload on / when storage returns a hero", async () => {
    mockStorageState.homeHero = {
      id: "art-1",
      imageUrl: "/uploads/artworks/featured.jpg",
    };
    const meta = await resolveMetaTags("/");
    expect(meta.lcpImagePreload).toBe("/uploads/artworks/featured.jpg");
  });

  it("leaves lcpImagePreload undefined on / when storage returns null", async () => {
    mockStorageState.homeHero = null;
    const meta = await resolveMetaTags("/");
    expect(meta.lcpImagePreload).toBeUndefined();
  });

  it("never populates lcpImagePreload on non-root static routes", async () => {
    mockStorageState.homeHero = {
      id: "art-1",
      imageUrl: "/uploads/artworks/featured.jpg",
    };
    for (const path of ["/gallery", "/store", "/artists", "/blog", "/changelog"]) {
      const meta = await resolveMetaTags(path);
      expect(meta.lcpImagePreload).toBeUndefined();
    }
  });

  it("caches the storage result within the TTL (only one DB call across N / requests)", async () => {
    mockStorageState.homeHero = {
      id: "art-1",
      imageUrl: "/uploads/artworks/featured.jpg",
    };
    await resolveMetaTags("/");
    await resolveMetaTags("/");
    await resolveMetaTags("/");
    expect(getHomeHeroSlide0Mock).toHaveBeenCalledTimes(1);
  });

  it("returns null and does not cache on storage error", async () => {
    getHomeHeroSlide0Mock.mockRejectedValueOnce(new Error("db down"));
    const first = await resolveMetaTags("/");
    expect(first.lcpImagePreload).toBeUndefined();

    // Second call should retry, not serve a cached null
    mockStorageState.homeHero = {
      id: "art-2",
      imageUrl: "/uploads/artworks/recovered.jpg",
    };
    const second = await resolveMetaTags("/");
    expect(second.lcpImagePreload).toBe("/uploads/artworks/recovered.jpg");
    expect(getHomeHeroSlide0Mock).toHaveBeenCalledTimes(2);
  });
});

describe("injectMetaTags — LCP preload tag (issue #560)", () => {
  function baseMeta(): Parameters<typeof injectMetaTags>[1] {
    return {
      title: "T",
      description: "D",
      ogTitle: "OT",
      ogDescription: "OD",
      ogType: "website",
      ogUrl: "https://x/",
      ogImage: "https://x/og.png",
      jsonLd: [],
    };
  }

  it("injects imagesrcset preload pointing at the variant set when hero is /uploads/artworks/* (#567)", () => {
    const html = "<head>__LCP_IMAGE_PRELOAD__</head>";
    const out = injectMetaTags(html, {
      ...baseMeta(),
      lcpImagePreload: "/uploads/artworks/abc-uuid.jpg",
    });
    expect(out).toContain('rel="preload"');
    expect(out).toContain('as="image"');
    expect(out).toContain('imagesrcset=');
    expect(out).toContain('imagesizes="100vw"');
    expect(out).toContain('fetchpriority="high"');
    // Variant URLs the <picture> would render — preload must match so the
    // bytes the browser preloads are the bytes the picture displays.
    expect(out).toContain("/uploads/artworks/abc-uuid-480.webp 480w");
    expect(out).toContain("/uploads/artworks/abc-uuid-960.webp 960w");
    expect(out).toContain("/uploads/artworks/abc-uuid-1440.webp 1440w");
    expect(out).toContain("/uploads/artworks/abc-uuid-2400.webp 2400w");
    // Original-href form must NOT be present — that's the regression we fixed
    expect(out).not.toContain('href="/uploads/artworks/abc-uuid.jpg"');
  });

  it("falls back to single-href preload for external (non-/uploads/artworks/) hero URLs", () => {
    const html = "<head>__LCP_IMAGE_PRELOAD__</head>";
    const out = injectMetaTags(html, {
      ...baseMeta(),
      lcpImagePreload: "https://lh3.googleusercontent.com/pw/abcdef",
    });
    expect(out).toContain(
      '<link rel="preload" as="image" href="https://lh3.googleusercontent.com/pw/abcdef" fetchpriority="high">',
    );
    expect(out).not.toContain("imagesrcset");
  });

  it("strips the placeholder to empty when lcpImagePreload is undefined", () => {
    const html = "<head>__LCP_IMAGE_PRELOAD__</head>";
    const out = injectMetaTags(html, baseMeta());
    expect(out).toBe("<head></head>");
  });

  it("escapes attribute-injection attempts in the URL", () => {
    const html = "<head>__LCP_IMAGE_PRELOAD__</head>";
    const out = injectMetaTags(html, {
      ...baseMeta(),
      // Doesn't match /uploads/artworks/ so falls through to single-href path
      lcpImagePreload: '/uploads/x.jpg" onerror="alert(1)',
    });
    expect(out).not.toContain('onerror="alert(1)"');
    expect(out).toContain("&quot;");
  });
});

describe("resolveMetaTags — ?artwork=<slug> modal-share variant (issue #569)", () => {
  it("emits artwork-specific OG when ?artwork=<slug> is on a non-artwork path", async () => {
    setMockArtwork(baseArtwork());
    const meta = await resolveMetaTags("/store?artwork=red-harbor-sunset-aaaaaaaa");
    expect(meta.title).toBe("Red Harbor Sunset by Ana Popescu — Vernis9");
    expect(meta.ogType).toBe("article");
    expect(findLd(meta.jsonLd, "VisualArtwork")).toBeDefined();
  });

  it("canonical (og:url) points at /artworks/<slug>, not the parent path", async () => {
    setMockArtwork(baseArtwork());
    const meta = await resolveMetaTags("/store?artwork=red-harbor-sunset-aaaaaaaa");
    expect(meta.ogUrl).toMatch(/\/artworks\/red-harbor-sunset-aaaaaaaa$/);
    expect(meta.ogUrl).not.toContain("/store");
    expect(meta.ogUrl).not.toContain("?artwork=");
  });

  it("falls through to parent-path meta when ?artwork=<slug> is unknown", async () => {
    setMockArtwork(undefined);
    const meta = await resolveMetaTags("/store?artwork=missing");
    // Should resolve as plain /store (the static-route branch)
    expect(meta.title).toBe("Art Store — Vernis9");
  });

  it("works on the gallery, artist, and curator-gallery parent paths too", async () => {
    setMockArtwork(baseArtwork());
    for (const parentUrl of [
      "/gallery?artwork=red-harbor-sunset-aaaaaaaa",
      "/artists/ana-popescu-artist01?artwork=red-harbor-sunset-aaaaaaaa",
      "/curator-gallery/some-id?artwork=red-harbor-sunset-aaaaaaaa",
    ]) {
      const meta = await resolveMetaTags(parentUrl);
      expect(findLd(meta.jsonLd, "VisualArtwork")).toBeDefined();
      expect(meta.ogUrl).toMatch(/\/artworks\/red-harbor-sunset-aaaaaaaa$/);
    }
  });
});

describe("resolveMetaTags — /curator-gallery/:id (issue #569)", () => {
  function baseGallery(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: "gallery-1",
      curatorId: "user-1",
      name: "Spring Exhibition 2026",
      description: "A curated walk through emerging Romanian artists.",
      isPublished: true,
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2026-06-01T00:00:00Z"),
      curator: { id: "user-1", firstName: "Diana", lastName: "Pop" },
      artworks: [
        {
          id: "aw-1",
          title: "Light over the Carpathians",
          imageUrl: "/uploads/artworks/lc.jpg",
          artist: { id: "a-1", slug: "ana", name: "Ana", avatarUrl: null },
        },
      ],
      ...overrides,
    };
  }

  it("emits ExhibitionEvent JSON-LD with virtual location and curator organizer", async () => {
    mockStorageState.curatorGallery = baseGallery();
    const meta = await resolveMetaTags("/curator-gallery/gallery-1");
    const event = findLd(meta.jsonLd, "ExhibitionEvent");
    expect(event).toBeDefined();
    expect(event!.name).toBe("Spring Exhibition 2026");
    expect((event!.location as Record<string, unknown>)["@type"]).toBe("VirtualLocation");
    expect((event!.organizer as Record<string, unknown>).name).toBe("Diana Pop");
    expect(event!.startDate).toBe("2026-04-01T00:00:00.000Z");
    expect(event!.endDate).toBe("2026-06-01T00:00:00.000Z");
  });

  it("uses the branded /api/og endpoint as the OG image (absolute, with cache-bust)", async () => {
    mockStorageState.curatorGallery = baseGallery();
    const meta = await resolveMetaTags("/curator-gallery/gallery-1");
    // Per #577 every item-share OG image goes through the branded card route;
    // the raw asset URL still appears in the Event JSON-LD `image` field.
    expect(meta.ogImage).toMatch(/\/api\/og\/exhibition\/gallery-1\.jpg\?v=[A-Za-z0-9_-]+$/);
    expect(meta.ogImage.startsWith("http")).toBe(true);
  });

  it("title contains the gallery name and Vernis9 brand", async () => {
    mockStorageState.curatorGallery = baseGallery();
    const meta = await resolveMetaTags("/curator-gallery/gallery-1");
    expect(meta.title).toContain("Spring Exhibition 2026");
    expect(meta.title).toContain("Vernis9");
    expect(meta.ogType).toBe("article");
  });

  it("falls back to default meta when gallery is not published", async () => {
    mockStorageState.curatorGallery = baseGallery({ isPublished: false });
    const meta = await resolveMetaTags("/curator-gallery/gallery-1");
    // Should NOT find an ExhibitionEvent on the fallback path
    expect(findLd(meta.jsonLd, "ExhibitionEvent")).toBeUndefined();
  });

  it("falls back to default meta when id not found", async () => {
    mockStorageState.curatorGallery = undefined;
    const meta = await resolveMetaTags("/curator-gallery/missing-id");
    expect(findLd(meta.jsonLd, "ExhibitionEvent")).toBeUndefined();
  });
});
