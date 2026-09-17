import { describe, it, expect, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// @ts-expect-error — plain .mjs, kept dependency-free so CI can run it without npm ci
import {
  parseArgs,
  commitsBehind,
  daysBehind,
  evaluate,
  renderSummary,
} from "../check-deploy-freshness.mjs";

const NOW = new Date("2026-09-16T12:00:00Z");

describe("parseArgs", () => {
  it("parses one or more NAME=SHA pairs with defaults", () => {
    const parsed = parseArgs(["node", "script.mjs", "staging=abc123"]);
    expect(parsed.environments).toEqual([{ name: "staging", sha: "abc123" }]);
    expect(parsed.maxDays).toBe(3);
    expect(parsed.mainRef).toBe("origin/main");
  });

  it("parses --max-days and --main-ref alongside multiple environments", () => {
    const parsed = parseArgs([
      "node",
      "script.mjs",
      "--max-days",
      "5",
      "--main-ref",
      "main",
      "staging=abc123",
      "production=def456",
    ]);
    expect(parsed.maxDays).toBe(5);
    expect(parsed.mainRef).toBe("main");
    expect(parsed.environments).toEqual([
      { name: "staging", sha: "abc123" },
      { name: "production", sha: "def456" },
    ]);
  });

  it("rejects an argument with no SHA", () => {
    expect(() => parseArgs(["node", "script.mjs", "staging"])).toThrow(/Expected NAME=SHA/);
  });
});

describe("commitsBehind", () => {
  it("shells out to git log with the deployed..main range, oldest first", () => {
    const calls: unknown[] = [];
    const fakeExec = (cmd: string, args: string[]) => {
      calls.push([cmd, args]);
      return "aaa|2026-09-01T00:00:00Z|first\nbbb|2026-09-02T00:00:00Z|second\n";
    };
    const commits = commitsBehind("deadbeef", "origin/main", fakeExec as typeof execFileSync);
    expect(calls[0][0]).toBe("git");
    expect(calls[0][1]).toEqual([
      "log",
      "--reverse",
      "--format=%H|%cI|%s",
      "deadbeef..origin/main",
    ]);
    expect(commits).toEqual([
      { sha: "aaa", date: "2026-09-01T00:00:00Z", subject: "first" },
      { sha: "bbb", date: "2026-09-02T00:00:00Z", subject: "second" },
    ]);
  });

  it("returns no commits for an empty range", () => {
    const fakeExec = () => "";
    expect(commitsBehind("deadbeef", "origin/main", fakeExec as typeof execFileSync)).toEqual([]);
  });

  it("keeps a `|` inside a commit subject intact", () => {
    const fakeExec = () => "aaa|2026-09-01T00:00:00Z|fix: a|b split\n";
    const commits = commitsBehind("deadbeef", "origin/main", fakeExec as typeof execFileSync);
    expect(commits[0].subject).toBe("fix: a|b split");
  });
});

describe("daysBehind", () => {
  it("is 0 when nothing is missing", () => {
    expect(daysBehind([], NOW)).toBe(0);
  });

  it("counts from the oldest missing commit, not the newest", () => {
    const commits = [
      { sha: "aaa", date: "2026-09-10T12:00:00Z", subject: "old" },
      { sha: "bbb", date: "2026-09-15T12:00:00Z", subject: "new" },
    ];
    expect(daysBehind(commits, NOW)).toBe(6);
  });

  it("matches the issue's success criterion: a same-day miss is not yet a day behind", () => {
    const commits = [{ sha: "aaa", date: "2026-09-16T06:00:00Z", subject: "just landed" }];
    expect(daysBehind(commits, NOW)).toBe(0);
  });
});

describe("evaluate", () => {
  it("passes an environment with no missing commits", () => {
    const fakeExec = () => "";
    const result = evaluate(
      { name: "staging", sha: "deadbeef" },
      { mainRef: "origin/main", maxDays: 3, now: NOW, execFile: fakeExec as typeof execFileSync },
    );
    expect(result).toMatchObject({ ok: true, unresolved: false, missingCount: 0, days: 0 });
  });

  it("fails an environment whose oldest missing commit is past the threshold", () => {
    const fakeExec = () => "aaa|2026-09-10T12:00:00Z|old fix\n";
    const result = evaluate(
      { name: "production", sha: "deadbeef" },
      { mainRef: "origin/main", maxDays: 3, now: NOW, execFile: fakeExec as typeof execFileSync },
    );
    expect(result.ok).toBe(false);
    expect(result.days).toBe(6);
    expect(result.missingCount).toBe(1);
  });

  it("passes an environment behind by fewer days than the threshold", () => {
    const fakeExec = () => "aaa|2026-09-15T12:00:00Z|recent\n";
    const result = evaluate(
      { name: "staging", sha: "deadbeef" },
      { mainRef: "origin/main", maxDays: 3, now: NOW, execFile: fakeExec as typeof execFileSync },
    );
    expect(result.ok).toBe(true);
  });

  it("reports unresolved rather than throwing when the SHA is unknown to git", () => {
    const fakeExec = () => {
      throw new Error("fatal: bad revision 'unknownsha..origin/main'");
    };
    const result = evaluate(
      { name: "staging", sha: "unknownsha" },
      { mainRef: "origin/main", maxDays: 3, now: NOW, execFile: fakeExec as typeof execFileSync },
    );
    expect(result.unresolved).toBe(true);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/bad revision/);
  });
});

describe("renderSummary", () => {
  it("reports each environment's status with the deployed SHA and threshold", () => {
    const results = [
      { name: "staging", sha: "abc1234", unresolved: false, ok: true, missingCount: 0, days: 0, oldest: null },
      {
        name: "production",
        sha: "def5678",
        unresolved: false,
        ok: false,
        missingCount: 2,
        days: 6,
        oldest: { sha: "aaa1111", date: "2026-09-10", subject: "old fix" },
      },
    ];
    const summary = renderSummary(results as never, 3);
    expect(summary).toContain("up to date with main");
    expect(summary).toContain("2 commit(s) behind main");
    expect(summary).toContain("6 day(s) ago");
    expect(summary).toContain("aaa1111".slice(0, 7));
  });

  it("surfaces an unresolved environment distinctly from a stale one", () => {
    const results = [
      { name: "staging", sha: "bad", unresolved: true, ok: false, error: "fatal: bad revision" },
    ];
    const summary = renderSummary(results as never, 3);
    expect(summary).toContain("could not resolve against main");
    expect(summary).toContain("fatal: bad revision");
  });
});

describe("against a real git repository", () => {
  // A throwaway repo rather than this checkout: the CI job that runs the test
  // suite checks out with the default shallow `fetch-depth: 1` (only the
  // `changes` job in ci.yml asks for more), so `HEAD~1` would not exist there.
  // The freshness check itself needs `fetch-depth: 0` in its own workflow —
  // documented in the PR — but the unit test should not depend on it.
  function initRepo(): string {
    const dir = mkdtempSync(path.join(tmpdir(), "deploy-freshness-"));
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: dir, encoding: "utf8", env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" } });
    git("init", "--quiet", "--initial-branch=main");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    return dir;
  }

  function commit(dir: string, message: string, isoDate: string): string {
    execFileSync("git", ["commit", "--allow-empty", "-m", message], {
      cwd: dir,
      encoding: "utf8",
      env: { ...process.env, GIT_AUTHOR_DATE: isoDate, GIT_COMMITTER_DATE: isoDate },
    });
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
  }

  let dir: string | undefined;
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("reports zero days behind when the deployed SHA is the current HEAD", () => {
    dir = initRepo();
    const head = commit(dir, "first", "2026-09-01T00:00:00Z");
    const commits = commitsBehind(head, "HEAD", (cmd, args) =>
      execFileSync(cmd, args, { cwd: dir!, encoding: "utf8" }),
    );
    expect(commits).toEqual([]);
    expect(daysBehind(commits)).toBe(0);
  });

  it("finds every commit main has that the deployed SHA lacks, oldest first", () => {
    dir = initRepo();
    const deployed = commit(dir, "deployed", "2026-09-01T00:00:00Z");
    commit(dir, "middle", "2026-09-05T00:00:00Z");
    const latest = commit(dir, "latest", "2026-09-10T00:00:00Z");
    const commits = commitsBehind(deployed, "HEAD", (cmd, args) =>
      execFileSync(cmd, args, { cwd: dir!, encoding: "utf8" }),
    );
    expect(commits.map((c) => c.subject)).toEqual(["middle", "latest"]);
    expect(commits[commits.length - 1].sha).toBe(latest);
    expect(daysBehind(commits, new Date("2026-09-16T00:00:00Z"))).toBe(11);
  });
});
