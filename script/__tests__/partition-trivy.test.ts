import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// @ts-expect-error — plain .mjs, kept dependency-free so CI can run it without npm ci
import { globToRegExp, partition, renderSummary, loadVendoredRules } from "../partition-trivy.mjs";

const CONFIG_PATH = path.resolve(__dirname, "../../.github/trivy-vendored-paths.json");
const rules = loadVendoredRules(CONFIG_PATH);

/** Shape mirrors Trivy's node-pkg results: Target is "Node.js", PkgPath locates the file. */
const nodePkgResult = (vulns: unknown[]) => ({
  Target: "Node.js",
  Class: "lang-pkgs",
  Type: "node-pkg",
  Vulnerabilities: vulns,
});

const vuln = (over: Record<string, unknown> = {}) => ({
  VulnerabilityID: "CVE-2026-0001",
  PkgName: "hono",
  InstalledVersion: "4.12.26",
  FixedVersion: "4.12.27",
  Severity: "HIGH",
  PkgPath: "app/node_modules/hono/package.json",
  ...over,
});

const npmBundled = vuln({
  VulnerabilityID: "CVE-2026-59873",
  PkgName: "tar",
  InstalledVersion: "7.5.11",
  Severity: "CRITICAL",
  PkgPath: "usr/local/lib/node_modules/npm/node_modules/tar/package.json",
});

describe("globToRegExp", () => {
  it("crosses directories for ** and stops at / for *", () => {
    expect(globToRegExp("a/**").test("a/b/c")).toBe(true);
    expect(globToRegExp("a/*").test("a/b/c")).toBe(false);
    expect(globToRegExp("a/*").test("a/b")).toBe(true);
  });

  it("matches zero directories for a leading **/", () => {
    const re = globToRegExp("**/node_modules/drizzle-kit/**");
    expect(re.test("node_modules/drizzle-kit/bin.js")).toBe(true);
    expect(re.test("app/node_modules/drizzle-kit/bin.js")).toBe(true);
  });

  it("treats dots literally rather than as any-char", () => {
    expect(globToRegExp("a/b.json").test("a/bXjson")).toBe(false);
  });
});

describe("partition", () => {
  it("blocks a lockfile finding and warns on a vendored one", () => {
    const { blocking, vendored } = partition(
      { Results: [nodePkgResult([vuln(), npmBundled])] },
      rules,
    );

    expect(blocking.map((f: { id: string }) => f.id)).toEqual(["CVE-2026-0001"]);
    expect(vendored.map((f: { id: string }) => f.id)).toEqual(["CVE-2026-59873"]);
    expect(vendored[0].reason).toMatch(/base image/i);
  });

  it("classifies the drizzle-kit esbuild binary by Target when PkgPath is absent", () => {
    const { blocking, vendored } = partition(
      {
        Results: [
          {
            Target: "app/node_modules/drizzle-kit/node_modules/@esbuild/linux-x64/bin/esbuild",
            Class: "lang-pkgs",
            Type: "gobinary",
            Vulnerabilities: [
              { VulnerabilityID: "CVE-2026-56862", PkgName: "stdlib", Severity: "HIGH" },
            ],
          },
        ],
      },
      rules,
    );

    expect(blocking).toHaveLength(0);
    expect(vendored).toHaveLength(1);
  });

  it("blocks OS packages even though they come from the base image", () => {
    // libgnutls30 (#710) sits in the base image but a Dockerfile --only-upgrade
    // fixes it, so it must never be classified as vendored.
    const { blocking } = partition(
      {
        Results: [
          {
            Target: "artverse:sha (debian 12.12)",
            Class: "os-pkgs",
            Type: "debian",
            Vulnerabilities: [
              { VulnerabilityID: "CVE-2026-33845", PkgName: "libgnutls30", Severity: "HIGH" },
            ],
          },
        ],
      },
      rules,
    );

    expect(blocking.map((f: { pkg: string }) => f.pkg)).toEqual(["libgnutls30"]);
  });

  it("ignores severities below HIGH", () => {
    const { blocking, vendored } = partition(
      { Results: [nodePkgResult([vuln({ Severity: "MEDIUM" })])] },
      rules,
    );

    expect(blocking).toHaveLength(0);
    expect(vendored).toHaveLength(0);
  });

  it("tolerates a report with no results", () => {
    expect(partition({}, rules)).toEqual({ blocking: [], vendored: [] });
  });

  it("accepts paths with and without a leading slash", () => {
    const { vendored } = partition(
      {
        Results: [
          nodePkgResult([
            npmBundled,
            { ...npmBundled, PkgPath: "/usr/local/lib/node_modules/npm/node_modules/tar/package.json" },
          ]),
        ],
      },
      rules,
    );

    expect(vendored).toHaveLength(2);
  });
});

describe("renderSummary", () => {
  it("marks the run green when only vendored findings exist", () => {
    const summary = renderSummary(partition({ Results: [nodePkgResult([npmBundled])] }, rules));

    expect(summary).toContain("✅ Blocking: no findings");
    expect(summary).toContain("⚠️ Vendored: 1 finding(s)");
    expect(summary).toContain("CVE-2026-59873");
  });

  it("lists blocking findings with the version that fixes them", () => {
    const summary = renderSummary(partition({ Results: [nodePkgResult([vuln()])] }, rules));

    expect(summary).toContain("❌ Blocking: 1 finding(s)");
    expect(summary).toContain("4.12.27");
  });
});

describe("config file", () => {
  it("gives every vendored pattern a reason", () => {
    for (const rule of loadVendoredRules(CONFIG_PATH)) {
      expect(rule.pattern, JSON.stringify(rule)).toBeTruthy();
      expect(rule.reason, `pattern ${rule.pattern} has no reason`).toBeTruthy();
    }
  });

  it("stays in sync with the file on disk", () => {
    expect(() => JSON.parse(readFileSync(CONFIG_PATH, "utf8"))).not.toThrow();
  });
});
