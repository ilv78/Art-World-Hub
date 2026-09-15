/**
 * Warn before a `.trivyignore.yaml` suppression expires, instead of finding out
 * when it lapses mid-scan.
 *
 * Background (#729, action item 4 of
 * docs/postmortems/2026-09-10-trivy-scan-blocked-staging-61-days.md): five
 * `libgnutls30` suppressions reached `expired_at` and lapsed silently, adding a
 * second independent failure cause to an already-red pipeline. `expired_at` was
 * meant as a forcing function to prompt review, but the force arrived as a red
 * pipeline after the fact, not a reminder before it.
 *
 * This fails the run when any entry is already past `expired_at`, or within
 * `warnDays` (default 14) of it — run weekly so the warning lands with time to
 * act before the next scan finds it expired.
 *
 * Hand-rolled parser rather than a YAML library, same reasoning as
 * script/partition-trivy.mjs: this must run on the runner's bare Node with no
 * `npm ci`, and the file's own convention (specs/SECURITY_AGENT.md §6) keeps
 * every entry to a flat `id` / `paths` / `statement` / `expired_at` shape, so a
 * full YAML parser buys nothing a few line patterns don't already cover.
 *
 * Usage: node script/check-trivyignore-expiry.mjs [file] [--warn-days N] [--now ISO-DATE]
 */

import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DEFAULT_FILE = ".trivyignore.yaml";
const DEFAULT_WARN_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Extract `{ id, expiredAt }` for each list item under `vulnerabilities:`.
 * Only `id` and `expired_at` are read — `paths` and `statement` are irrelevant
 * to expiry and skipped by falling through the two patterns below.
 */
export function parseEntries(text) {
  const entries = [];
  let current = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/#.*$/, "");
    const trimmed = line.trim();
    if (trimmed === "") continue;

    const idMatch = trimmed.match(/^-\s*id:\s*(.+)$/);
    if (idMatch) {
      current = { id: unquote(idMatch[1]), expiredAt: null };
      entries.push(current);
      continue;
    }

    const expiredMatch = trimmed.match(/^expired_at:\s*(.+)$/);
    if (expiredMatch && current) {
      current.expiredAt = unquote(expiredMatch[1]);
    }
  }

  return entries;
}

/** Split parsed entries into already-expired, expiring-soon, and malformed. */
export function classifyExpiry(entries, { now = new Date(), warnDays = DEFAULT_WARN_DAYS } = {}) {
  const warnMs = warnDays * DAY_MS;
  const expired = [];
  const expiring = [];
  const missing = [];

  for (const entry of entries) {
    if (!entry.expiredAt) {
      missing.push(entry);
      continue;
    }

    const expiry = new Date(`${entry.expiredAt}T00:00:00Z`);
    if (Number.isNaN(expiry.getTime())) {
      missing.push(entry);
      continue;
    }

    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS);
    if (daysLeft < 0) {
      expired.push({ ...entry, daysLeft });
    } else if (daysLeft <= warnDays) {
      expiring.push({ ...entry, daysLeft });
    }
  }

  return { expired, expiring, missing, warnMs };
}

function table(rows) {
  const header = "| CVE | expired_at | Days |\n|---|---|---|";
  const body = rows.map((r) => `| ${r.id} | ${r.expiredAt} | ${r.daysLeft} |`);
  return [header, ...body].join("\n");
}

export function renderSummary({ expired, expiring, missing }, warnDays) {
  const lines = ["## Trivyignore expiry check"];

  if (expired.length === 0 && expiring.length === 0 && missing.length === 0) {
    lines.push("", "✅ No suppressions expired or expiring within " + warnDays + " days.");
    return `${lines.join("\n")}\n`;
  }

  if (expired.length > 0) {
    lines.push(
      "",
      `### ❌ Already expired: ${expired.length}`,
      "",
      "These suppressions lapsed. Re-verify against the current scan: remove the",
      "entry if the upstream fix shipped, or re-justify with a fresh `expired_at`.",
      "",
      table(expired),
    );
  }

  if (expiring.length > 0) {
    lines.push(
      "",
      `### ⚠️ Expiring within ${warnDays} days: ${expiring.length}`,
      "",
      "Review before these lapse — see specs/SECURITY_AGENT.md §6.",
      "",
      table(expiring),
    );
  }

  if (missing.length > 0) {
    lines.push(
      "",
      `### ❌ Missing or unparseable expired_at: ${missing.length}`,
      "",
      "Every entry must have an `expired_at` (specs/SECURITY_AGENT.md §6).",
      "",
      missing.map((e) => `- ${e.id ?? "(no id)"}`).join("\n"),
    );
  }

  return `${lines.join("\n")}\n`;
}

export function parseArgs(argv) {
  const args = argv.slice(2);
  const warnIndex = args.indexOf("--warn-days");
  const nowIndex = args.indexOf("--now");
  const skip = new Set(
    [warnIndex, nowIndex].flatMap((i) => (i === -1 ? [] : [i, i + 1])),
  );

  return {
    file: args.find((arg, i) => !arg.startsWith("--") && !skip.has(i)) ?? DEFAULT_FILE,
    warnDays: warnIndex === -1 ? DEFAULT_WARN_DAYS : Number(args[warnIndex + 1]),
    now: nowIndex === -1 ? new Date() : new Date(args[nowIndex + 1]),
  };
}

function main(argv) {
  const { file, warnDays, now } = parseArgs(argv);
  const text = readFileSync(file, "utf8");
  const entries = parseEntries(text);
  const result = classifyExpiry(entries, { now, warnDays });
  const summary = renderSummary(result, warnDays);

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  const failing = result.expired.length + result.expiring.length + result.missing.length;
  if (failing > 0) {
    console.error(
      `Trivyignore expiry check failed: ${result.expired.length} expired, ${result.expiring.length} expiring, ${result.missing.length} malformed.`,
    );
    return 1;
  }

  console.error(`Trivyignore expiry check passed: ${entries.length} entries, none expiring within ${warnDays} days.`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv));
}
