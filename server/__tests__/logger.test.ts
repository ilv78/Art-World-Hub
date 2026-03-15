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
