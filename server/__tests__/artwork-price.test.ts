import { describe, it, expect } from "vitest";
import { insertArtworkSchema, updateArtworkSchema } from "@shared/schema";
import { formatArtworkPrice, PRICE_ON_REQUEST_LABEL } from "@/lib/utils";

// Price-on-request feature — issue #668.

describe("insertArtworkSchema price/priceOnRequest validation", () => {
  const base = {
    artistId: "art1",
    title: "Painting",
    description: "desc",
    imageUrl: "/uploads/x.jpg",
    medium: "Oil",
    category: "painting",
  };

  it("accepts a numeric price when not price-on-request", () => {
    const r = insertArtworkSchema.safeParse({ ...base, price: "500", priceOnRequest: false });
    expect(r.success).toBe(true);
  });

  it("accepts a missing price when price-on-request is set", () => {
    const r = insertArtworkSchema.safeParse({ ...base, price: null, priceOnRequest: true });
    expect(r.success).toBe(true);
  });

  it("rejects a missing price when not price-on-request", () => {
    const r = insertArtworkSchema.safeParse({ ...base, price: null, priceOnRequest: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toContain("price");
    }
  });

  it("rejects an empty-string price when not price-on-request", () => {
    const r = insertArtworkSchema.safeParse({ ...base, price: "", priceOnRequest: false });
    expect(r.success).toBe(false);
  });
});

describe("updateArtworkSchema partial validation", () => {
  it("allows unrelated partial updates without touching price", () => {
    const r = updateArtworkSchema.safeParse({ title: "New title" });
    expect(r.success).toBe(true);
  });

  it("rejects turning price-on-request off without providing a price", () => {
    const r = updateArtworkSchema.safeParse({ priceOnRequest: false, price: "" });
    expect(r.success).toBe(false);
  });

  it("allows turning price-on-request on", () => {
    const r = updateArtworkSchema.safeParse({ priceOnRequest: true });
    expect(r.success).toBe(true);
  });
});

describe("formatArtworkPrice", () => {
  it("formats a numeric price", () => {
    expect(formatArtworkPrice({ price: "1500", priceOnRequest: false })).toBe("1,500 €");
  });

  it("shows the POR label when priceOnRequest is set", () => {
    expect(formatArtworkPrice({ price: "1500", priceOnRequest: true })).toBe(PRICE_ON_REQUEST_LABEL);
  });

  it("shows the POR label when price is missing", () => {
    expect(formatArtworkPrice({ price: null, priceOnRequest: false })).toBe(PRICE_ON_REQUEST_LABEL);
  });
});
