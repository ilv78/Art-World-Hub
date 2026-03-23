import pino from "pino";
import path from "path";
import fs from "fs";

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

// Ensure log directory exists
fs.mkdirSync(LOG_DIR, { recursive: true });

export const logFilePath = path.join(LOG_DIR, "app.log");

// Use pino.multistream (no worker threads) — compatible with esbuild bundling.
// pino.transport() spawns worker threads that can't resolve modules inside a
// single-file CJS bundle, so we use direct streams instead.
export const logger = pino(
  {
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream([
    { level: "trace", stream: process.stdout },
    { level: "trace", stream: pino.destination({ dest: logFilePath, sync: false, mkdir: true }) },
  ]),
);

// Child loggers for different modules
export const authLogger = logger.child({ module: "auth" });
export const mcpLogger = logger.child({ module: "mcp" });

export { LOG_DIR };
