import { describe, it, expect } from "vitest";
import { loadEntries, parseEntry, CATEGORIES } from "../decision-log.mjs";

// The directory is the index (#808). This test is what makes `--check` run in CI without
// touching any workflow file: `npm test` already runs here.
describe("decision log (one file per decision)", () => {
  it("every committed entry is valid", () => {
    const entries = loadEntries();
    expect(entries.length).toBeGreaterThan(0);
    const bad = entries.filter((e) => e.problems.length);
    expect(bad.map((e) => `${e.name}: ${e.problems.join("; ")}`)).toEqual([]);
  });

  it("rejects a filename that does not carry the date and a kebab slug", () => {
    const e = parseEntry("notes.md", "---\ndate: 2026-09-17\ntitle: t\nissue: 1\ncategory: Process\n---\n" + "x".repeat(100));
    expect(e.problems).toContain("filename must be YYYY-MM-DD-<kebab-slug>.md");
  });

  it("rejects a date that disagrees with the filename", () => {
    const e = parseEntry("2026-09-17-thing.md", "---\ndate: 2026-09-16\ntitle: t\nissue: 1\ncategory: Process\n---\n" + "x".repeat(100));
    expect(e.problems.some((p) => p.includes("does not match filename date"))).toBe(true);
  });

  it("rejects an unknown category and a non-numeric issue", () => {
    const e = parseEntry("2026-09-17-thing.md", "---\ndate: 2026-09-17\ntitle: t\nissue: #1\ncategory: Misc\n---\n" + "x".repeat(100));
    expect(e.problems.some((p) => p.includes("category must be one of"))).toBe(true);
    expect(e.problems.some((p) => p.includes("issue must be a bare number"))).toBe(true);
    expect(CATEGORIES).toContain("Process");
  });

  it("rejects a body too short to be a reasoned decision", () => {
    const e = parseEntry("2026-09-17-thing.md", "---\ndate: 2026-09-17\ntitle: t\nissue: 1\ncategory: Process\n---\nshort");
    expect(e.problems.some((p) => p.includes("too short"))).toBe(true);
  });
});
