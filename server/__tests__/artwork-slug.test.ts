import { describe, it, expect } from "vitest";
import { makeArtworkSlug, slugify } from "@shared/artwork-slug";

describe("slugify", () => {
  it("lowercases and replaces whitespace with dashes", () => {
    expect(slugify("Red Harbor Sunset")).toBe("red-harbor-sunset");
  });

  it("strips diacritics", () => {
    expect(slugify("Câmpia Română")).toBe("campia-romana");
  });

  it("collapses runs of non-alphanumeric characters", () => {
    expect(slugify("A -- B // C!!!")).toBe("a-b-c");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugify("   Hello!   ")).toBe("hello");
  });

  it("caps length at 60 characters", () => {
    const long = "x".repeat(100);
    expect(slugify(long).length).toBe(60);
  });
});

describe("makeArtworkSlug", () => {
  it("appends 8 hex chars of the uuid (dashes stripped)", () => {
    const id = "4493f600-2619-47f9-979c-abc5b45ba92d";
    expect(makeArtworkSlug("Red Harbor Sunset", id)).toBe("red-harbor-sunset-4493f600");
  });

  it("uses 'artwork' fallback when title slugifies to empty", () => {
    const id = "4493f600-2619-47f9-979c-abc5b45ba92d";
    expect(makeArtworkSlug("   !!!   ", id)).toBe("artwork-4493f600");
  });

  it("is deterministic for the same inputs", () => {
    const id = "4493f600-2619-47f9-979c-abc5b45ba92d";
    expect(makeArtworkSlug("Test", id)).toBe(makeArtworkSlug("Test", id));
  });
});
