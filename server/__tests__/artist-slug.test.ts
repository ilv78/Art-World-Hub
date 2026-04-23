import { describe, it, expect } from "vitest";
import { makeArtistSlug } from "@shared/artist-slug";

describe("makeArtistSlug", () => {
  const id = "4493f600-2619-47f9-979c-abc5b45ba92d";

  it("appends 8 hex chars of the uuid (dashes stripped)", () => {
    expect(makeArtistSlug("Alexandra Constantin", id)).toBe("alexandra-constantin-4493f600");
  });

  it("strips diacritics and normalises punctuation", () => {
    expect(makeArtistSlug("Élène Côté!", id)).toBe("elene-cote-4493f600");
  });

  it("uses 'artist' fallback when name slugifies to empty", () => {
    expect(makeArtistSlug("   !!!   ", id)).toBe("artist-4493f600");
  });

  it("trims trailing whitespace/punctuation to match UI display", () => {
    expect(makeArtistSlug("Alexandra C. ", id)).toBe("alexandra-c-4493f600");
  });

  it("is deterministic for the same inputs", () => {
    expect(makeArtistSlug("Test", id)).toBe(makeArtistSlug("Test", id));
  });
});
