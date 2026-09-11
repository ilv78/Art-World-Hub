import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pino from "pino";
import fs from "fs";
import path from "path";
import os from "os";

const testLogDir = path.join(os.tmpdir(), `artverse-logger-test-${process.pid}`);
const testLogFile = path.join(testLogDir, "test.log");

describe("Logger output format", () => {
  let logger: pino.Logger;

  beforeAll(() => {
    fs.mkdirSync(testLogDir, { recursive: true });
    logger = pino(
      {
        level: "trace",
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      pino.destination({ dest: testLogFile, sync: true, mkdir: true }),
    );
  });

  afterAll(() => {
    fs.rmSync(testLogDir, { recursive: true, force: true });
  });

  it("writes valid NDJSON to the log file", () => {
    logger.info("test message");
    logger.flush();

    const content = fs.readFileSync(testLogFile, "utf-8").trim();
    const lines = content.split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(1);

    const entry = JSON.parse(lines[lines.length - 1]);
    expect(entry.msg).toBe("test message");
    expect(entry.level).toBe(30); // pino info = 30
  });

  it("includes ISO timestamp", () => {
    logger.info("timestamp test");
    logger.flush();

    const lines = fs.readFileSync(testLogFile, "utf-8").trim().split("\n");
    const entry = JSON.parse(lines[lines.length - 1]);
    expect(entry.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("child logger includes module field", () => {
    const child = logger.child({ module: "auth" });
    child.warn("auth warning");
    logger.flush();

    const lines = fs.readFileSync(testLogFile, "utf-8").trim().split("\n");
    const entry = JSON.parse(lines[lines.length - 1]);
    expect(entry.module).toBe("auth");
    expect(entry.level).toBe(40); // pino warn = 40
  });

  it("error level includes error object", () => {
    logger.error({ err: new Error("test error") }, "something failed");
    logger.flush();

    const lines = fs.readFileSync(testLogFile, "utf-8").trim().split("\n");
    const entry = JSON.parse(lines[lines.length - 1]);
    expect(entry.level).toBe(50); // pino error = 50
    expect(entry.msg).toBe("something failed");
    expect(entry.err.message).toBe("test error");
    expect(entry.err.type).toBe("Error");
  });

  it("supports structured context fields", () => {
    logger.info({ port: 5000, host: "0.0.0.0" }, "Server listening");
    logger.flush();

    const lines = fs.readFileSync(testLogFile, "utf-8").trim().split("\n");
    const entry = JSON.parse(lines[lines.length - 1]);
    expect(entry.port).toBe(5000);
    expect(entry.host).toBe("0.0.0.0");
  });
});

/**
 * Log rotation (#738).
 *
 * `app.log` grew without bound until per-call MCP audit logging made a steady
 * writer of it. These cover the two things that can silently break: the bridge
 * that carries writes into the asynchronously-created rolling destination, and
 * the ordering of the retained files that `/api/admin/logs` and `get_logs` read
 * back.
 */
describe("Log rotation", () => {
  const rotationDir = path.join(os.tmpdir(), `artverse-rotation-test-${process.pid}`);
  let loggerModule: typeof import("../logger");

  beforeAll(async () => {
    fs.mkdirSync(rotationDir, { recursive: true });
    process.env.LOG_DIR = rotationDir;
    loggerModule = await import("../logger");
  });

  afterAll(() => {
    delete process.env.LOG_DIR;
    fs.rmSync(rotationDir, { recursive: true, force: true });
  });

  it("keeps a bounded number of files of bounded size", () => {
    // 10 MB x (1 active + 9 rotated) — a ~100 MB ceiling on the volume.
    expect(loggerModule.LOG_ROTATION.size).toBe("10m");
    expect(loggerModule.LOG_ROTATION.limit.count).toBe(9);
  });

  it("writes through the bridge into a rolling destination", async () => {
    loggerModule.logger.info({ probe: "rotation" }, "rotation probe");

    // pino-roll resolves asynchronously; the bridge buffers until it does.
    const deadline = Date.now() + 3000;
    let written = "";
    while (Date.now() < deadline && !written.includes("rotation probe")) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      written = loggerModule
        .logReadPaths()
        .filter((file) => fs.existsSync(file))
        .map((file) => fs.readFileSync(file, "utf-8"))
        .join("");
    }

    expect(written).toContain("rotation probe");
  }, 10000);

  it("orders retained files numerically, not lexicographically", () => {
    // pino-roll writes `app.1.log`, not `app.log.1` — matching the wrong shape
    // makes the readers find nothing at all. And a plain string sort puts
    // app.10.log before app.2.log, handing back history out of order.
    for (const n of [2, 10, 11]) {
      fs.writeFileSync(path.join(rotationDir, `app.${n}.log`), `{"n":${n}}\n`);
    }

    const ordered = loggerModule
      .logReadPaths()
      .map((file) => path.basename(file))
      .filter((name) => /^app\.\d+\.log$/.test(name));

    expect(ordered).toEqual(["app.1.log", "app.2.log", "app.10.log", "app.11.log"]);
  });
});
