import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

/**
 * #684: an idle-client error on the pg pool used to be an unhandled 'error'
 * event — Node treats that as an uncaught exception and crashes the process.
 * These assert the listener is present and that the pool's timeouts are no
 * longer left at node-postgres's defaults (unbounded `connectionTimeoutMillis`
 * meant an exhausted pool hung requests instead of failing them).
 */
describe("db pool configuration", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  let dbModule: typeof import("../db");

  beforeAll(async () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/testdb";
    dbModule = await import("../db");
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("registers an error listener on the pool", () => {
    const pool = dbModule.pool;
    expect(pool.listenerCount("error")).toBeGreaterThan(0);
  });

  it("does not crash the process when the pool emits an idle-client error", () => {
    const pool = dbModule.pool;
    expect(() => pool.emit("error", new Error("simulated idle client error"))).not.toThrow();
  });

  it("sets explicit pool bounds instead of node-postgres's wait-forever default", () => {
    const options = dbModule.pool.options;
    expect(options.max).toBe(10);
    expect(options.connectionTimeoutMillis).toBe(5_000);
    expect(options.idleTimeoutMillis).toBe(30_000);
    expect(options.statement_timeout).toBe(30_000);
  });
});
