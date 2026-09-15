import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// @ts-expect-error — plain .mjs, kept dependency-free so CI can run it without npm ci
import { parseEntries, classifyExpiry, renderSummary, parseArgs } from "../check-trivyignore-expiry.mjs";

const REPO_FILE = path.resolve(__dirname, "../../.trivyignore.yaml");
const NOW = new Date("2026-09-15T00:00:00Z");

describe("parseEntries", () => {
  it("reads id and expired_at, ignoring paths/statement and comments", () => {
    const yaml = `
# a comment above the list
vulnerabilities:
  # ─── some section header ───
  - id: CVE-2026-0001
    paths:
      - "app/node_modules/foo/bar.js"
    statement: "not reachable" # trailing comment
    expired_at: 2026-10-01
  - id: CVE-2026-0002
    statement: "global, no paths"
    expired_at: "2026-07-25"
`;
    expect(parseEntries(yaml)).toEqual([
      { id: "CVE-2026-0001", expiredAt: "2026-10-01" },
      { id: "CVE-2026-0002", expiredAt: "2026-07-25" },
    ]);
  });

  it("returns no entries for an empty flow-style list", () => {
    expect(parseEntries("vulnerabilities: []\n")).toEqual([]);
  });

  it("flags an entry with no expired_at as missing rather than dropping it", () => {
    const yaml = `
vulnerabilities:
  - id: CVE-2026-0003
    statement: "forgot the expiry"
`;
    expect(parseEntries(yaml)).toEqual([{ id: "CVE-2026-0003", expiredAt: null }]);
  });
});

describe("classifyExpiry", () => {
  const entries = [
    { id: "CVE-FAR-FUTURE", expiredAt: "2027-01-01" },
    { id: "CVE-EXPIRING-SOON", expiredAt: "2026-09-20" }, // 5 days out
    { id: "CVE-ALREADY-EXPIRED", expiredAt: "2026-09-01" },
    { id: "CVE-NO-EXPIRY", expiredAt: null },
  ];

  it("buckets entries by days remaining against warnDays", () => {
    const result = classifyExpiry(entries, { now: NOW, warnDays: 14 });
    expect(result.expiring.map((e) => e.id)).toEqual(["CVE-EXPIRING-SOON"]);
    expect(result.expired.map((e) => e.id)).toEqual(["CVE-ALREADY-EXPIRED"]);
    expect(result.missing.map((e) => e.id)).toEqual(["CVE-NO-EXPIRY"]);
  });

  it("does not flag an entry safely outside the warning window", () => {
    const result = classifyExpiry([entries[0]], { now: NOW, warnDays: 14 });
    expect(result.expired).toHaveLength(0);
    expect(result.expiring).toHaveLength(0);
  });

  it("matches the issue's success criterion: an entry 10 days out is flagged under a 14-day window", () => {
    const result = classifyExpiry([{ id: "CVE-10-DAYS", expiredAt: "2026-09-25" }], {
      now: NOW,
      warnDays: 14,
    });
    expect(result.expiring.map((e) => e.id)).toEqual(["CVE-10-DAYS"]);
  });
});

describe("renderSummary", () => {
  it("reports clean when nothing is expired, expiring, or malformed", () => {
    const summary = renderSummary({ expired: [], expiring: [], missing: [] }, 14);
    expect(summary).toContain("No suppressions expired or expiring");
  });

  it("lists expired, expiring, and malformed entries under separate headings", () => {
    const summary = renderSummary(
      {
        expired: [{ id: "CVE-OLD", expiredAt: "2026-09-01", daysLeft: -14 }],
        expiring: [{ id: "CVE-SOON", expiredAt: "2026-09-20", daysLeft: 5 }],
        missing: [{ id: "CVE-BAD", expiredAt: null }],
      },
      14,
    );
    expect(summary).toContain("Already expired: 1");
    expect(summary).toContain("CVE-OLD");
    expect(summary).toContain("Expiring within 14 days: 1");
    expect(summary).toContain("CVE-SOON");
    expect(summary).toContain("Missing or unparseable expired_at: 1");
    expect(summary).toContain("CVE-BAD");
  });
});

describe("parseArgs", () => {
  it("resolves a bare file path with no --warn-days or --now given", () => {
    // Regression: the skip-index set used to include (-1 + 1 === 0) whenever a
    // flag was absent, which masked the file argument sitting at index 0.
    const parsed = parseArgs(["node", "script.mjs", "/tmp/some-file.yaml"]);
    expect(parsed.file).toBe("/tmp/some-file.yaml");
    expect(parsed.warnDays).toBe(14);
  });

  it("still resolves the file path when --warn-days and --now are given", () => {
    const parsed = parseArgs([
      "node",
      "script.mjs",
      "/tmp/some-file.yaml",
      "--warn-days",
      "7",
      "--now",
      "2026-09-15",
    ]);
    expect(parsed.file).toBe("/tmp/some-file.yaml");
    expect(parsed.warnDays).toBe(7);
    expect(parsed.now.toISOString()).toBe(new Date("2026-09-15").toISOString());
  });

  it("defaults to .trivyignore.yaml when no file is given", () => {
    const parsed = parseArgs(["node", "script.mjs"]);
    expect(parsed.file).toBe(".trivyignore.yaml");
  });
});

describe("against the real .trivyignore.yaml", () => {
  it("parses cleanly and reports nothing outstanding while the file is empty (#739)", () => {
    const text = readFileSync(REPO_FILE, "utf8");
    const entries = parseEntries(text);
    const result = classifyExpiry(entries, { now: NOW, warnDays: 14 });
    expect(result.expired).toHaveLength(0);
    expect(result.expiring).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
  });
});
