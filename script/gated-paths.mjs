/**
 * Mechanical enforcement of the gated list in `specs/AGENT-AUTONOMY-POLICY.md` §1.
 *
 * The autonomy policy (#744) lets agents merge without plan approval. That is only
 * safe because a small set of genuinely irreversible changes still needs a human,
 * and agents are not trusted to self-assess which set they are in. This script is
 * that assessment: it reads a PR's diff and fails the build when a gated change
 * arrives without a human-applied approval label.
 *
 * WHAT THIS CAN AND CANNOT SEE. Of the five gated items in the policy, only two
 * are visible in a diff:
 *
 *   1. destructive schema / data operations  → detected here
 *   3. secrets and credentials               → detected here (path-shaped only)
 *
 *   2. production promotion — a workflow_dispatch, not a PR; gated by the deploy
 *      workflow being manual.
 *   4. spending money / reaching third parties — not inferable from a diff. Stays
 *      a policy rule, enforced by the reviewer agent and the PR's own declaration.
 *   5. deleting things not in git — by definition not in the diff. A runtime rule.
 *
 * Claiming otherwise would be worse than not having the check, so the failure
 * message says which items it covers.
 *
 * Plain .mjs with no imports beyond node builtins, matching
 * `script/partition-trivy.mjs`: the job runs before any `npm ci`.
 *
 * Usage: node script/gated-paths.mjs --files <file-list> [--labels a,b] [--changed-only]
 */

import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const APPROVAL_LABEL = "human-approved";

/**
 * Paths whose change needs a human, matched as prefixes or suffixes.
 *
 * `self` entries guard the gate itself: without them an agent could widen its own
 * authority by editing the detector or the workflow that runs it, which is the one
 * change that makes every other rule unenforceable.
 *
 * `specs/AGENT-AUTONOMY-POLICY.md` is deliberately NOT guarded, though the first
 * version guarded it. The policy's own write-back rule requires that file to be
 * edited every time the developer answers an escalation — guarding it would charge
 * a label for each of those, which is precisely the cost the policy exists to
 * remove. Enforcement lives in this list, not in the prose: editing the document
 * cannot widen what CI actually blocks, so the guard bought nothing and billed the
 * developer for it.
 */
export const GATED_PATHS = [
  { pattern: /^\.env(?!\.example$)/, reason: "environment file — may carry credentials", item: 3 },
  { pattern: /(^|\/)secrets?\//, reason: "secrets directory", item: 3 },
  { pattern: /\.(pem|key|p12|pfx)$/, reason: "key material", item: 3 },
  { pattern: /(^|\/)id_(rsa|ed25519|ecdsa)/, reason: "private SSH key", item: 3 },
  { pattern: /^script\/gated-paths\.mjs$/, reason: "the gate's own detector (self-guard)", item: 0 },
  { pattern: /^\.github\/workflows\/gated-paths\.yml$/, reason: "the gate's own workflow (self-guard)", item: 0 },
];

/**
 * Strip SQL comments and split into statements.
 *
 * Drizzle separates statements with `--> statement-breakpoint`, but a file may also
 * use bare semicolons, and a statement can span several lines — so joining lines and
 * splitting on both is the only way to see a statement's leading keyword.
 */
export function sqlStatements(sql) {
  const withoutComments = sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .map((line) => line.replace(/--(?!> statement-breakpoint).*$/, ""))
    .join("\n");

  return withoutComments
    .split(/-->\s*statement-breakpoint|;/)
    .map((statement) => statement.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * Destructive statements in a migration.
 *
 * Matching on the statement's *leading keyword* rather than anywhere in the text is
 * the whole difficulty: every additive Drizzle migration carries
 * `... ON DELETE no action ON UPDATE no action` inside its foreign-key constraints,
 * so a naive search for DELETE or UPDATE flags every migration in the repository.
 */
export function destructiveStatements(sql) {
  const findings = [];

  for (const statement of sqlStatements(sql)) {
    const normalized = statement.toUpperCase();

    if (/^DROP\s+(TABLE|SCHEMA|TYPE|DATABASE)\b/.test(normalized)) {
      findings.push({ statement, why: "drops a table, schema or type" });
    } else if (/^TRUNCATE\b/.test(normalized)) {
      findings.push({ statement, why: "truncates a table" });
    } else if (/^ALTER\s+TABLE\b/.test(normalized) && /\bDROP\s+COLUMN\b/.test(normalized)) {
      findings.push({ statement, why: "drops a column" });
    } else if (/^ALTER\s+TABLE\b/.test(normalized) && /\bRENAME\b/.test(normalized)) {
      findings.push({ statement, why: "renames a table or column" });
    } else if (/^ALTER\s+TABLE\b/.test(normalized) && /\bALTER\s+COLUMN\b.*\bSET\s+NOT\s+NULL\b/.test(normalized)) {
      // #543: adding NOT NULL to a populated column fails, or locks, without a
      // backfill first. Drizzle emits NOT NULL inline for *new* columns, so this
      // separate form only appears for existing ones — the risky case.
      findings.push({ statement, why: "makes an existing column NOT NULL (#543 failure shape)" });
    } else if (/^UPDATE\b/.test(normalized)) {
      findings.push({ statement, why: "data backfill — and staging runs push mode, so it will not run there" });
    } else if (/^DELETE\s+FROM\b/.test(normalized)) {
      findings.push({ statement, why: "deletes rows" });
    } else if (/^INSERT\s+INTO\b/.test(normalized)) {
      findings.push({ statement, why: "seeds data" });
    }
  }

  return findings;
}

const truncate = (text, max = 140) => (text.length > max ? `${text.slice(0, max)}…` : text);

/**
 * Findings for a set of changed files. `readFile` is injected so tests do not need
 * a filesystem.
 */
export function findGatedChanges(changedFiles, readFile) {
  const findings = [];

  for (const file of changedFiles) {
    for (const rule of GATED_PATHS) {
      if (rule.pattern.test(file)) {
        findings.push({ file, reason: rule.reason, item: rule.item });
      }
    }

    if (/^migrations\/.*\.sql$/.test(file)) {
      let sql;
      try {
        sql = readFile(file);
      } catch {
        // Deleted in this PR: the file is gone from the working tree. Deleting a
        // migration is itself a change to applied history — gate it.
        findings.push({ file, reason: "migration removed from history", item: 1 });
        continue;
      }
      for (const { statement, why } of destructiveStatements(sql)) {
        findings.push({ file, reason: `${why} — \`${truncate(statement)}\``, item: 1 });
      }
    }
  }

  return findings;
}

export function renderReport(findings, { approved }) {
  const lines = ["## Gated path review"];

  if (findings.length === 0) {
    lines.push("", "✅ No gated changes. This PR may merge autonomously.");
    return `${lines.join("\n")}\n`;
  }

  lines.push(
    "",
    `### ${approved ? "✅" : "❌"} ${findings.length} gated change(s) found`,
    "",
    "| File | Why it needs a human |",
    "|---|---|",
    ...findings.map((f) => `| \`${f.file}\` | ${f.reason} |`),
    "",
  );

  if (approved) {
    lines.push(`Approved: a human applied the \`${APPROVAL_LABEL}\` label.`);
  } else {
    lines.push(
      `This PR touches the gated list in \`specs/AGENT-AUTONOMY-POLICY.md\` §1 and has no \`${APPROVAL_LABEL}\` label.`,
      "",
      "An agent must **not** apply the label to its own PR. Ask the developer to review and label it.",
      "",
      "Note this check only sees gated items **1 (destructive schema/data)** and **3 (secrets)** —",
      "the other three (production promotion, spending money or reaching third parties, deleting",
      "things not in git) are not visible in a diff and remain policy rules.",
    );
  }

  return `${lines.join("\n")}\n`;
}

function main(argv) {
  const args = argv.slice(2);
  const valueOf = (flag) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };

  const fileList = valueOf("--files");
  if (!fileList) {
    console.error("usage: node script/gated-paths.mjs --files <file-list> [--labels a,b]");
    return 2;
  }

  const changedFiles = readFileSync(fileList, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const labels = (valueOf("--labels") ?? "")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  const approved = labels.includes(APPROVAL_LABEL);
  const findings = findGatedChanges(changedFiles, (file) => readFileSync(file, "utf8"));
  const report = renderReport(findings, { approved });

  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }

  if (findings.length > 0 && !approved) {
    console.error(
      `Gated path review failed: ${findings.length} change(s) need the "${APPROVAL_LABEL}" label from the developer.`,
    );
    return 1;
  }

  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv));
}
