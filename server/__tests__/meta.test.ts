import { describe, it, expect, vi } from "vitest";

vi.mock("../storage", () => ({
  storage: {
    getArtist: vi.fn().mockResolvedValue(undefined),
    getBlogPost: vi.fn().mockResolvedValue(undefined),
  },
}));

const { resolveMetaTags } = await import("../meta");

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
