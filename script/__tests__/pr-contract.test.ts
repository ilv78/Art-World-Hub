/**
 * The PR contract (#744) — the mechanical half of the reviewer step.
 *
 * Same asymmetry as the gated-path check: a false failure costs the agent a cycle,
 * while a false pass lets an unexamined change merge itself. But this check is
 * deliberately weak in one direction — it enforces that a PR *says* something, never
 * that what it says is true. These tests pin that boundary so nobody later mistakes
 * a green contract check for a review.
 */
import { describe, it, expect } from "vitest";
import { checkContract, exemption, isCodeChange, renderReport, section } from "../pr-contract.mjs";

const rules = (body: string, files: string[] = ["server/routes.ts"]) =>
  checkContract(body, files).map((failure: { rule: string }) => failure.rule);

const COMPLETE = `Closes #123.

## Verification

- \`npm test\` — 283 pass
- CI does not exercise the ANALYZE path, so it was run locally.

## Deviation

None — implemented as the issue describes.
`;

describe("section extraction", () => {
  it("reads a section up to the next heading of the same level", () => {
    const body = "## A\nalpha\n\n## B\nbeta";
    expect(section(body, /A/)).toBe("alpha");
  });

  it("keeps deeper subheadings inside the section", () => {
    const body = "## Verification\nintro\n### Locally\nran it\n## Next\nother";
    expect(section(body, /verif/i)).toContain("ran it");
    expect(section(body, /verif/i)).not.toContain("other");
  });

  it("ignores headings inside fenced code", () => {
    const body = "```\n## Verification\n```\ntext";
    expect(section(body, /verif/i)).toBe("");
  });

  it("returns empty when absent", () => {
    expect(section("no headings here", /verif/i)).toBe("");
  });
});

describe("code vs documentation changes", () => {
  it.each([["server/routes.ts"], ["script/build.ts"], [".github/workflows/ci.yml"], ["Dockerfile"]])(
    "treats %s as code",
    (file) => {
      expect(isCodeChange([file])).toBe(true);
    },
  );

  it.each([[["specs/X.md"]], [["docs/postmortems/a.md"]], [["README.md"]], [["specs/a.md", "docs/b.md"]]])(
    "treats %s as documentation",
    (files) => {
      expect(isCodeChange(files)).toBe(false);
    },
  );
});

describe("contract", () => {
  it("passes a complete PR body", () => {
    expect(rules(COMPLETE)).toEqual([]);
  });

  it("requires an issue reference", () => {
    expect(rules(COMPLETE.replace("Closes #123.", "Some change."))).toContain("issue-reference");
  });

  it("requires a verification section", () => {
    const body = "Closes #123.\n\n## Deviation\nNone.";
    expect(rules(body)).toContain("verification-section");
  });

  it("requires a deviation statement", () => {
    const body = "Closes #123.\n\n## Verification\nCI is green and covers this.";
    expect(rules(body)).toContain("deviation-declared");
  });

  it("requires code PRs to speak about CI coverage", () => {
    // The #628 lesson: a green pipeline that exercised none of the change.
    const body = "Closes #123.\n\n## Verification\nRan it locally.\n\n## Deviation\nNone.";
    expect(rules(body, ["server/routes.ts"])).toContain("ci-coverage");
  });

  it("does not demand CI coverage from a docs-only PR", () => {
    const body = "Closes #123.\n\n## Verification\nProofread.\n\n## Deviation\nNone.";
    expect(rules(body, ["specs/AGENT-AUTONOMY-POLICY.md"])).toEqual([]);
  });

  it("is not satisfied by a checklist inside an example block", () => {
    const body = "```\nCloses #1\n## Verification\nCI\n## Deviation\nnone\n```";
    expect(rules(body).length).toBeGreaterThan(0);
  });

  it("does not count an HTML-commented template as a real section", () => {
    const body = "<!--\nCloses #1\n## Verification\nCI covers it\n## Deviation\nnone\n-->\nreal text";
    expect(rules(body).length).toBeGreaterThan(0);
  });
});

describe("report", () => {
  it("says plainly that it checks declaration, not truth", () => {
    // Nobody should later read a green contract check as a review.
    const report = renderReport(checkContract("nothing", ["server/routes.ts"]));
    expect(report).toContain("declaration*, not truth");
  });

  it("names each missing rule", () => {
    const report = renderReport(checkContract("nothing", ["server/routes.ts"]));
    expect(report).toContain("issue-reference");
    expect(report).toContain("verification-section");
    expect(report).toContain("deviation-declared");
  });

  it("passes cleanly", () => {
    expect(renderReport([])).toContain("✅");
  });

  it("says a skipped PR was skipped, not that it passed", () => {
    // A required check reads as authoritative. An exempt PR must not look reviewed.
    const report = renderReport([], "authored by dependabot[bot] — machine-generated");
    expect(report).toContain("Skipped");
    expect(report).not.toContain("✅");
  });
});

describe("exemptions", () => {
  // This check is a *required* status check (#752). A required check a PR can never
  // satisfy is a permanent block, not a gate — and neither Dependabot nor release.yml
  // can be asked to rewrite the body they generate.

  it("exempts Dependabot, which cannot add a Verification section", () => {
    expect(exemption({ author: "dependabot[bot]" })).toContain("dependabot[bot]");
  });

  it("exempts the release PR, whose issue refs live in a stripped HTML comment", () => {
    expect(exemption({ author: "ilv78", labels: ["autorelease"] })).toContain("labelled `autorelease`");
  });

  it("does not exempt an ordinary PR, including one with other labels", () => {
    expect(exemption({ author: "ilv78", labels: ["agent-review", "devops"] })).toBeNull();
    expect(exemption({})).toBeNull();
  });

  it("does not exempt a human PR that merely mentions dependabot", () => {
    // The author field is the identity; the body is not.
    expect(exemption({ author: "not-dependabot[bot]" })).toBeNull();
  });

  it("a real Dependabot body would fail the contract without the exemption", () => {
    // The reason the exemption exists, pinned so nobody removes it as redundant.
    const body = "Bumps the npm-minor-and-patch group with 21 updates in the / directory:";
    expect(rules(body).length).toBeGreaterThan(0);
  });
});
