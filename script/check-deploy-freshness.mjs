/**
 * Alert when a deployed environment's commit SHA has fallen behind `main` by
 * more than N days.
 *
 * Background (#730, postmortem
 * docs/postmortems/2026-09-10-trivy-scan-blocked-staging-61-days.md, action item
 * 6): `/api/version` reports the CHANGELOG-derived release string, and during
 * that incident it read `v3.19.0` on both a freshly-deployed staging and a
 * 67-day-stale production — identical output two months apart. It cannot be the
 * freshness signal. The only reliable one is the deployed commit SHA itself:
 * `IMAGE_TAG` in the environment's `.env` (both ci.yml's staging deploy and
 * deploy-production.yml write the deployed SHA there), or, if that is not
 * reachable, the build number `/health` reports as `version` resolved to a SHA
 * via the `release-<run_number>` git tag ci.yml pushes on every successful
 * staging deploy.
 *
 * "Behind" is measured as the age of the oldest commit on `main` the deployed
 * SHA does not contain — not the age of the deployed SHA itself. A deploy that
 * is one commit behind a `main` that hasn't moved in a month still reports as
 * fresh; a deploy that just missed a commit from an hour ago reports as fresh
 * until that commit ages past the threshold. This matches what actually hurt in
 * the incident this issue traces to: staging sat on a fixed SHA while `main`
 * kept moving underneath it for 61 days.
 *
 * Plain .mjs, no dependencies: run on the bare CI runner via `node`, same
 * constraint as script/check-trivyignore-expiry.mjs and script/partition-trivy.mjs.
 *
 * Usage:
 *   node script/check-deploy-freshness.mjs [--max-days N] [--main-ref REF] name=<sha> [name=<sha> ...]
 *
 * Requires the checkout to have full history (`fetch-depth: 0`) — `git log
 * A..B` cannot see commits a shallow clone never fetched.
 */

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_MAX_DAYS = 3;
const DEFAULT_MAIN_REF = "origin/main";
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseArgs(argv) {
  const args = argv.slice(2);
  const maxDaysIndex = args.indexOf("--max-days");
  const mainRefIndex = args.indexOf("--main-ref");
  const skip = new Set(
    [maxDaysIndex, mainRefIndex].flatMap((i) => (i === -1 ? [] : [i, i + 1])),
  );

  const environments = [];
  args.forEach((arg, i) => {
    if (skip.has(i) || arg.startsWith("--")) return;
    const eq = arg.indexOf("=");
    if (eq === -1) {
      throw new Error(`Expected NAME=SHA, got "${arg}"`);
    }
    environments.push({ name: arg.slice(0, eq), sha: arg.slice(eq + 1) });
  });

  return {
    environments,
    maxDays: maxDaysIndex === -1 ? DEFAULT_MAX_DAYS : Number(args[maxDaysIndex + 1]),
    mainRef: mainRefIndex === -1 ? DEFAULT_MAIN_REF : args[mainRefIndex + 1],
  };
}

/** Commits reachable from `mainRef` but not from `deployedSha`, oldest first. */
export function commitsBehind(deployedSha, mainRef, execFile = execFileSync) {
  const out = execFile(
    "git",
    ["log", "--reverse", "--format=%H|%cI|%s", `${deployedSha}..${mainRef}`],
    { encoding: "utf8" },
  );
  return out
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [sha, date, ...subjectParts] = line.split("|");
      return { sha, date, subject: subjectParts.join("|") };
    });
}

/** Whole days between the oldest undeployed commit and `now`; 0 when none are missing. */
export function daysBehind(commits, now = new Date()) {
  if (commits.length === 0) return 0;
  const oldest = new Date(commits[0].date);
  return Math.floor((now.getTime() - oldest.getTime()) / DAY_MS);
}

/** Resolve one environment's freshness. Never throws — a bad SHA is a result, not a crash. */
export function evaluate({ name, sha }, { mainRef, maxDays, now, execFile }) {
  let commits;
  try {
    commits = commitsBehind(sha, mainRef, execFile);
  } catch (err) {
    return { name, sha, unresolved: true, ok: false, error: String(err.message ?? err) };
  }

  const days = daysBehind(commits, now);
  return {
    name,
    sha,
    unresolved: false,
    ok: days <= maxDays,
    days,
    missingCount: commits.length,
    oldest: commits[0] ?? null,
  };
}

export function renderSummary(results, maxDays) {
  const lines = [
    "## Deploy freshness check",
    "",
    `Threshold: ${maxDays} day(s) behind \`main\`, measured from the oldest commit each environment is missing.`,
    "",
  ];

  for (const r of results) {
    if (r.unresolved) {
      lines.push(`- ❌ **${r.name}** (\`${r.sha}\`): could not resolve against main — ${r.error}`);
      continue;
    }
    if (r.missingCount === 0) {
      lines.push(`- ✅ **${r.name}** (\`${r.sha}\`): up to date with main.`);
      continue;
    }
    const icon = r.ok ? "✅" : "❌";
    lines.push(
      `- ${icon} **${r.name}** (\`${r.sha}\`): ${r.missingCount} commit(s) behind main, oldest missing merged ${r.days} day(s) ago (\`${r.oldest.sha.slice(0, 7)}\` "${r.oldest.subject}").`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function main(argv) {
  const { environments, maxDays, mainRef } = parseArgs(argv);
  if (environments.length === 0) {
    console.error(
      "Usage: node script/check-deploy-freshness.mjs [--max-days N] [--main-ref REF] name=<sha> [name=<sha> ...]",
    );
    return 1;
  }

  const now = new Date();
  const results = environments.map((env) => evaluate(env, { mainRef, maxDays, now }));
  const summary = renderSummary(results, maxDays);

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  const failing = results.filter((r) => r.unresolved || !r.ok);
  if (failing.length > 0) {
    console.error(`Deploy freshness check failed: ${failing.map((r) => r.name).join(", ")}`);
    return 1;
  }

  console.error(`Deploy freshness check passed: all environments within ${maxDays} day(s) of main.`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv));
}
