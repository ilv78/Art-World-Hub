/**
 * The gate that makes autonomous merging safe (#744).
 *
 * Two failure directions matter, and they are not symmetric:
 *
 *   - Under-gating lets an irreversible change merge itself.
 *   - Over-gating costs the developer time, which is the thing the whole policy
 *     exists to protect. Every false positive is a question they did not need.
 *
 * The real migrations in this repository are the over-gating test: every additive
 * Drizzle migration contains `ON DELETE no action ON UPDATE no action` inside its
 * foreign keys, so a careless detector flags all of them.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  destructiveStatements,
  findGatedChanges,
  renderReport,
  sqlStatements,
  APPROVAL_LABEL,
} from "../gated-paths.mjs";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../migrations");
const noFiles = () => {
  throw new Error("not found");
};

describe("SQL statement splitting", () => {
  it("splits on drizzle breakpoints and semicolons", () => {
    const sql = `ALTER TABLE "a" ADD COLUMN "b" text;--> statement-breakpoint\nDROP TABLE "c";`;
    expect(sqlStatements(sql)).toEqual(['ALTER TABLE "a" ADD COLUMN "b" text', 'DROP TABLE "c"']);
  });

  it("strips comments so a commented-out drop is not a finding", () => {
    const sql = `-- DROP TABLE "artworks";\nALTER TABLE "a" ADD COLUMN "b" text;`;
    expect(destructiveStatements(sql)).toEqual([]);
  });

  it("reads a statement split across lines", () => {
    const sql = `ALTER TABLE "artworks"\n  DROP COLUMN "price";`;
    expect(destructiveStatements(sql)).toHaveLength(1);
  });
});

describe("destructive statement detection", () => {
  it.each([
    ['DROP TABLE "artworks";', "drops a table"],
    ['TRUNCATE "orders";', "truncates"],
    ['ALTER TABLE "artworks" DROP COLUMN "price";', "drops a column"],
    ['ALTER TABLE "artworks" RENAME COLUMN "a" TO "b";', "renames"],
    ['ALTER TABLE "artists" ALTER COLUMN "slug" SET NOT NULL;', "NOT NULL on an existing column"],
    ['UPDATE "artworks" SET "is_published" = true;', "data backfill"],
    ['DELETE FROM "orders" WHERE 1=1;', "deletes rows"],
    ['INSERT INTO "artists" ("id") VALUES (\'x\');', "seeds data"],
  ])("flags %s", (sql) => {
    expect(destructiveStatements(sql)).toHaveLength(1);
  });

  it.each([
    'ALTER TABLE "artworks" ADD COLUMN "is_published" boolean DEFAULT false;',
    'CREATE TABLE "x" ("id" text PRIMARY KEY);',
    'CREATE INDEX "idx" ON "artworks" ("artist_id");',
    'ALTER TABLE "artworks" ADD COLUMN "slug" text NOT NULL;',
  ])("does not flag additive statement %s", (sql) => {
    expect(destructiveStatements(sql)).toEqual([]);
  });

  it("does not flag foreign keys carrying ON DELETE / ON UPDATE clauses", () => {
    // The trap: this clause appears in every additive migration in the repo.
    const sql =
      'ALTER TABLE "artworks" ADD CONSTRAINT "fk" FOREIGN KEY ("artist_id") ' +
      'REFERENCES "public"."artists"("id") ON DELETE no action ON UPDATE no action;';
    expect(destructiveStatements(sql)).toEqual([]);
  });
});

describe("against this repository's real migrations", () => {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));

  it("finds migrations to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("flags exactly the three migrations that backfill or tighten data", () => {
    // 0007 backfills is_published (#513) — the migration that taught us staging's
    // push mode skips SQL bodies. 0008 and 0010 backfill a slug and then
    // ALTER COLUMN ... SET NOT NULL, which is the #543 failure shape and the
    // reason the local dev DB is currently broken. All three genuinely need a
    // human. The other 11 are additive and must pass untouched.
    const flagged = files
      .filter((file) => destructiveStatements(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8")).length > 0)
      .sort();

    expect(flagged).toEqual([
      "0007_grey_mac_gargan.sql",
      "0008_superb_silver_centurion.sql",
      "0010_nappy_psynapse.sql",
    ]);
    expect(files.length - flagged.length).toBeGreaterThanOrEqual(10);
  });
});

describe("gated path matching", () => {
  it.each([
    ".env",
    ".env.production",
    "deploy/secrets/token.txt",
    "certs/server.pem",
    "ssh/id_rsa",
  ])("gates %s", (file) => {
    expect(findGatedChanges([file], noFiles)).toHaveLength(1);
  });

  it.each([".env.example", "server/routes.ts", "specs/workflows/CI-CD.md", "README.md"])(
    "does not gate %s",
    (file) => {
      expect(findGatedChanges([file], noFiles)).toEqual([]);
    },
  );

  it("guards its own detector, workflow and policy", () => {
    // Without this an agent could widen its own authority in one PR, which would
    // make every other rule unenforceable.
    const selfGuarded = [
      "script/gated-paths.mjs",
      ".github/workflows/gated-paths.yml",
      "specs/AGENT-AUTONOMY-POLICY.md",
    ];
    expect(findGatedChanges(selfGuarded, noFiles)).toHaveLength(3);
  });

  it("gates a deleted migration", () => {
    const findings = findGatedChanges(["migrations/0007_grey_mac_gargan.sql"], noFiles);
    expect(findings[0].reason).toContain("removed from history");
  });

  it("reports the offending statement, not just the file", () => {
    const findings = findGatedChanges(["migrations/0009_x.sql"], () => 'DROP TABLE "orders";');
    expect(findings[0].reason).toContain("DROP TABLE");
  });
});

describe("report", () => {
  it("passes a clean PR", () => {
    const report = renderReport([], { approved: false });
    expect(report).toContain("No gated changes");
  });

  it("explains what it cannot see, so the gate is not mistaken for total coverage", () => {
    const report = renderReport([{ file: ".env", reason: "x", item: 3 }], { approved: false });
    expect(report).toContain(APPROVAL_LABEL);
    expect(report).toContain("not visible in a diff");
  });

  it("tells agents not to self-approve", () => {
    const report = renderReport([{ file: ".env", reason: "x", item: 3 }], { approved: false });
    expect(report).toContain("must **not** apply the label to its own PR");
  });

  it("accepts a human-labelled PR", () => {
    const report = renderReport([{ file: ".env", reason: "x", item: 3 }], { approved: true });
    expect(report).toContain("a human applied");
  });
});
