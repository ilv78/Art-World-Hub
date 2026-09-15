import type { Server } from "http";
import { logger } from "./logger";

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

interface ClosablePool {
  end(): Promise<unknown>;
}

/**
 * Registers SIGTERM/SIGINT handlers that stop accepting new connections,
 * let in-flight requests finish, close the DB pool, then exit — with a
 * timeout fallback in case a request never finishes. Returns the handler
 * so tests can invoke it without going through `process.on`.
 */
export function registerGracefulShutdown(
  httpServer: Pick<Server, "close" | "closeIdleConnections">,
  pool: ClosablePool,
  timeoutMs: number = DEFAULT_SHUTDOWN_TIMEOUT_MS,
) {
  let isShuttingDown = false;

  function shutdown(signal: NodeJS.Signals) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, "Shutdown signal received, draining connections");

    const forceExitTimer = setTimeout(() => {
      logger.error({ timeoutMs }, "Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, timeoutMs);
    forceExitTimer.unref();

    httpServer.close((err) => {
      if (err) {
        logger.error({ err }, "Error while closing HTTP server");
      }
      pool
        .end()
        .catch((poolErr) => {
          logger.error({ err: poolErr }, "Error while closing database pool");
        })
        .finally(() => {
          clearTimeout(forceExitTimer);
          logger.info("Shutdown complete");
          process.exit(err ? 1 : 0);
        });
    });

    // Idle keep-alive sockets don't hold up in-flight requests but can hold
    // the server open indefinitely; drop those immediately.
    httpServer.closeIdleConnections();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  return shutdown;
}
