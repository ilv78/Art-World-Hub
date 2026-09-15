import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { registerGracefulShutdown } from "../shutdown";

/**
 * #686: node's default SIGTERM behavior is immediate termination, which
 * drops in-flight requests. These assert the handler drains the HTTP
 * server, closes the DB pool, and exits — including the timeout fallback
 * for a close that never completes.
 */
describe("registerGracefulShutdown", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as unknown as typeof process.exit);
  });

  afterEach(() => {
    vi.useRealTimers();
    exitSpy.mockRestore();
    vi.restoreAllMocks();
  });

  function makeHttpServer() {
    return {
      close: vi.fn((cb: (err?: Error) => void) => cb()),
      closeIdleConnections: vi.fn(),
    };
  }

  it("closes idle connections, drains the http server, and closes the pool on SIGTERM", async () => {
    const httpServer = makeHttpServer();
    const pool = { end: vi.fn().mockResolvedValue(undefined) };

    const shutdown = registerGracefulShutdown(httpServer, pool);
    shutdown("SIGTERM");

    expect(httpServer.closeIdleConnections).toHaveBeenCalledTimes(1);
    expect(httpServer.close).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      expect(pool.end).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });

  it("is a no-op on a second signal once shutdown has started", async () => {
    const httpServer = makeHttpServer();
    const pool = { end: vi.fn().mockResolvedValue(undefined) };

    const shutdown = registerGracefulShutdown(httpServer, pool);
    shutdown("SIGTERM");
    shutdown("SIGINT");

    await vi.waitFor(() => {
      expect(exitSpy).toHaveBeenCalledTimes(1);
    });
    expect(httpServer.close).toHaveBeenCalledTimes(1);
  });

  it("exits non-zero when the http server reports a close error", async () => {
    const httpServer = {
      close: vi.fn((cb: (err?: Error) => void) => cb(new Error("boom"))),
      closeIdleConnections: vi.fn(),
    };
    const pool = { end: vi.fn().mockResolvedValue(undefined) };

    const shutdown = registerGracefulShutdown(httpServer, pool);
    shutdown("SIGTERM");

    await vi.waitFor(() => {
      expect(pool.end).toHaveBeenCalledTimes(1);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  it("forces exit if the http server never finishes closing", () => {
    const httpServer = {
      close: vi.fn(), // never calls back
      closeIdleConnections: vi.fn(),
    };
    const pool = { end: vi.fn().mockResolvedValue(undefined) };

    const shutdown = registerGracefulShutdown(httpServer, pool, 10_000);
    shutdown("SIGTERM");

    expect(exitSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
