/**
 * The reviewer step of the autonomy pipeline (#744), in its mechanical form.
 *
 * An autonomous agent merges its own work. What a human reviewer would have caught
 * is therefore caught by three things instead: the CI gates, verification on
 * staging, and this — a check that the PR *says* the things a reader needs.
 *
 * The three rules come from three real failures on 2026-09-11, and each is chosen
 * because nothing else in the pipeline catches it:
 *
 *   - #628 — a fully green pipeline that verified nothing. The plugin under test
 *     only loads when ANALYZE is set, and no CI job sets it. A PR must therefore
 *     say what CI does *not* cover.
 *   - #742 — an implementation that deliberately departed from the issue text
 *     (@types/node 25 where the issue said 26). Correct, but invisible to anyone
 *     not reading both. A PR must declare deviation, or declare there is none.
 *   - The issue-first workflow — a PR with no issue has no recorded intent to
 *     compare the diff against.
 *
 * WHAT THIS ENFORCES IS DECLARATION, NOT TRUTH. It cannot tell whether the stated
 * CI gap is real or the deviation honest; it makes the omission impossible. The
 * judgement half belongs to a model-based reviewer, which needs an API key and
 * spends money — both on the policy's gated list, so it is the developer's call.
 *
 * Documentation consistency is deliberately absent: `specs/DOC-AGENT-SPEC.md`
 * already covers it (C-001, C-003, ST-001/004/005) and duplicating a rule means
 * two places to change when it is wrong.
 *
 * Plain .mjs, node builtins only — the job runs before any `npm ci`.
 *
 * Usage: node script/pr-contract.mjs --body <file> --files <file-list>
 */

import { appendFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Paths whose change is documentation or configuration rather than behaviour. */
const NON_CODE = [/^specs\//, /^docs\//, /\.md$/, /^\.github\/ISSUE_TEMPLATE\//];

export const isCodeChange = (files) =>
  files.some((file) => !NON_CODE.some((pattern) => pattern.test(file)));

/** Strip fenced code and HTML comments: a checklist inside an example does not count. */
function prose(body) {
  return body.replace(/```[\s\S]*?```/g, " ").replace(/<!--[\s\S]*?-->/g, " ");
}

/**
 * The body of a section whose heading matches, up to the next heading of the same
 * or higher level. Returns "" when there is no such section.
 */
export function section(body, headingPattern) {
  const lines = prose(body).split("\n");
  const start = lines.findIndex((line) => /^#{1,6}\s/.test(line) && headingPattern.test(line));
  if (start === -1) return "";

  const level = lines[start].match(/^(#{1,6})/)[1].length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => {
    const match = line.match(/^(#{1,6})\s/);
    return match !== null && match[1].length <= level;
  });

  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

export function checkContract(body, changedFiles) {
  const failures = [];
  const text = prose(body);

  if (!/#\d+/.test(text)) {
    failures.push({
      rule: "issue-reference",
      message:
        "No issue referenced. Every PR cites the issue it implements (`#123`), so the diff can be read against a recorded intent.",
    });
  }

  const verification = section(body, /verif/i);
  if (!verification) {
    failures.push({
      rule: "verification-section",
      message:
        "No `## Verification` section. State how the change was checked — a reader cannot tell a tested change from an untested one by looking at a green pipeline.",
    });
  } else if (isCodeChange(changedFiles) && !/\bCI\b/.test(verification)) {
    failures.push({
      rule: "ci-coverage",
      message:
        "The Verification section does not mention CI. Say what CI does *and does not* cover for this change — #628 shipped behind a fully green pipeline that exercised none of it.",
    });
  }

  if (!/deviat/i.test(text)) {
    failures.push({
      rule: "deviation-declared",
      message:
        "No deviation statement. Say how the implementation departs from the issue, or that it does not — #742 deliberately departed from its issue and only a reader of both would have known.",
    });
  }

  return failures;
}

export function renderReport(failures) {
  const lines = ["## PR contract"];

  if (failures.length === 0) {
    lines.push("", "✅ The PR states its issue, its verification, its CI coverage and any deviation.");
    return `${lines.join("\n")}\n`;
  }

  lines.push(
    "",
    `### ❌ ${failures.length} missing`,
    "",
    ...failures.map((failure) => `- **${failure.rule}** — ${failure.message}`),
    "",
    "This check enforces *declaration*, not truth: it cannot tell whether a stated CI",
    "gap is real, only that the PR does not say. Edit the PR body and it re-runs.",
  );

  return `${lines.join("\n")}\n`;
}

function main(argv) {
  const args = argv.slice(2);
  const valueOf = (flag) => {
    const index = args.indexOf(flag);
    return index === -1 ? undefined : args[index + 1];
  };

  const bodyPath = valueOf("--body");
  const filesPath = valueOf("--files");
  if (!bodyPath || !filesPath) {
    console.error("usage: node script/pr-contract.mjs --body <file> --files <file-list>");
    return 2;
  }

  const body = readFileSync(bodyPath, "utf8");
  const changedFiles = readFileSync(filesPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const failures = checkContract(body, changedFiles);
  const report = renderReport(failures);

  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }

  if (failures.length > 0) {
    console.error(`PR contract failed: ${failures.map((f) => f.rule).join(", ")}.`);
    return 1;
  }

  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv));
}
