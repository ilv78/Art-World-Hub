/**
 * Partition a Trivy JSON report into findings we can act on and findings
 * vendored inside software we do not control.
 *
 * Background (#728): a single gate that failed on any HIGH/CRITICAL anywhere in
 * the image could not distinguish "bump the lockfile" from "wait for upstream to
 * rebuild its base image". Because the advisory database updates continuously and
 * independently of us, every upstream disclosure against vendored content became a
 * red `main` whose only remedy was hand-writing a suppression — three times over
 * (#631, #670, #710), the last of which blocked staging for 61 days.
 *
 * Blocking findings fail the build. Vendored findings are reported for review.
 *
 * Plain .mjs on purpose: the CI jobs that run this build a Docker image and never
 * `npm ci`, so this must run on the runner's bare Node with no dependencies.
 *
 * Usage: node script/partition-trivy.mjs <report.json> [--config <paths.json>]
 */

import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BLOCKING_SEVERITIES = new Set(["HIGH", "CRITICAL"]);
const DEFAULT_CONFIG = ".github/trivy-vendored-paths.json";

/**
 * Convert a path glob to a RegExp. A doubled star crosses directory separators,
 * a single star does not, and a doubled star followed by a slash also matches zero
 * directories, so a leading one still hits a top-level `node_modules/x`.
 */
export function globToRegExp(pattern) {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char !== "*") {
      source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
      continue;
    }
    if (pattern[i + 1] === "*") {
      while (pattern[i + 1] === "*") i++;
      if (pattern[i + 1] === "/") {
        source += "(?:.*/)?";
        i++;
      } else {
        source += ".*";
      }
    } else {
      source += "[^/]*";
    }
  }
  return new RegExp(`^${source}$`);
}

/** Trivy reports paths without a leading slash; accept either form on both sides. */
const normalize = (value) => String(value ?? "").replace(/^\/+/, "");

/**
 * Flatten a Trivy report into one row per vulnerability.
 *
 * `PkgPath` is what locates a finding for language packages — for node-pkg
 * results Trivy sets `Target` to the literal string "Node.js" and puts the real
 * location in `PkgPath`. Go binaries carry the path in `Target` instead, so fall
 * back to it.
 */
export function flattenFindings(report) {
  const findings = [];
  for (const result of report?.Results ?? []) {
    for (const vuln of result.Vulnerabilities ?? []) {
      findings.push({
        id: vuln.VulnerabilityID,
        severity: vuln.Severity,
        pkg: vuln.PkgName,
        installed: vuln.InstalledVersion,
        fixed: vuln.FixedVersion,
        path: normalize(vuln.PkgPath || result.Target),
        target: result.Target,
        class: result.Class,
        url: vuln.PrimaryURL,
      });
    }
  }
  return findings;
}

/**
 * Split findings into `blocking` and `vendored`.
 *
 * OS packages are always blocking regardless of path: they come from the base
 * image but we can still upgrade them ourselves with a Dockerfile line, which is
 * exactly how the libgnutls30 batch in #710 was fixed for real.
 */
export function partition(report, vendoredRules) {
  const matchers = vendoredRules.map((rule) => ({
    ...rule,
    test: globToRegExp(normalize(rule.pattern)),
  }));

  const blocking = [];
  const vendored = [];

  for (const finding of flattenFindings(report)) {
    if (!BLOCKING_SEVERITIES.has(finding.severity)) continue;

    const rule =
      finding.class === "os-pkgs"
        ? undefined
        : matchers.find((matcher) => matcher.test.test(finding.path));

    if (rule) {
      vendored.push({ ...finding, reason: rule.reason, pattern: rule.pattern });
    } else {
      blocking.push(finding);
    }
  }

  return { blocking, vendored };
}

const cell = (value) => String(value ?? "—").replace(/\|/g, "\\|");

function table(findings, { withReason = false } = {}) {
  const header = withReason
    ? "| Severity | CVE | Package | Installed | Location | Why vendored |\n|---|---|---|---|---|---|"
    : "| Severity | CVE | Package | Installed | Fixed in | Location |\n|---|---|---|---|---|---|";

  const rows = findings.map((f) =>
    withReason
      ? `| ${cell(f.severity)} | ${cell(f.id)} | ${cell(f.pkg)} | ${cell(f.installed)} | \`${cell(f.path)}\` | ${cell(f.reason)} |`
      : `| ${cell(f.severity)} | ${cell(f.id)} | ${cell(f.pkg)} | ${cell(f.installed)} | ${cell(f.fixed)} | \`${cell(f.path)}\` |`,
  );

  return [header, ...rows].join("\n");
}

export function renderSummary({ blocking, vendored }) {
  const lines = ["## Container scan"];

  if (blocking.length === 0) {
    lines.push("", "### ✅ Blocking: no findings in project-controlled paths");
  } else {
    lines.push(
      "",
      `### ❌ Blocking: ${blocking.length} finding(s) we can fix`,
      "",
      "These are in our lockfile or in OS packages. Bump the dependency or add the",
      "upgrade to the Dockerfile — do not suppress them.",
      "",
      table(blocking),
    );
  }

  if (vendored.length > 0) {
    lines.push(
      "",
      `### ⚠️ Vendored: ${vendored.length} finding(s) we cannot fix`,
      "",
      "Reported for review; these do not fail the build. If one of these becomes",
      "fixable by us, it belongs in the blocking set — remove its pattern from",
      "`.github/trivy-vendored-paths.json`.",
      "",
      table(vendored, { withReason: true }),
    );
  }

  return `${lines.join("\n")}\n`;
}

export function loadVendoredRules(configPath) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  if (!Array.isArray(config.vendored)) {
    throw new Error(`${configPath}: expected a "vendored" array`);
  }
  return config.vendored;
}

function main(argv) {
  const args = argv.slice(2);
  const configIndex = args.indexOf("--config");
  const configPath = configIndex === -1 ? DEFAULT_CONFIG : args[configIndex + 1];
  const configValueIndex = configIndex === -1 ? -1 : configIndex + 1;
  const reportPath = args.find((arg, i) => !arg.startsWith("--") && i !== configValueIndex);

  if (!reportPath) {
    console.error("usage: node script/partition-trivy.mjs <report.json> [--config <paths.json>]");
    return 2;
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const result = partition(report, loadVendoredRules(configPath));
  const summary = renderSummary(result);

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }

  if (result.blocking.length > 0) {
    console.error(
      `Container scan failed: ${result.blocking.length} HIGH/CRITICAL finding(s) in project-controlled paths.`,
    );
    return 1;
  }

  console.error(
    `Container scan passed: 0 blocking, ${result.vendored.length} vendored finding(s) reported.`,
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv));
}
