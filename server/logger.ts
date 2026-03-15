import pino from "pino";
import path from "path";
import fs from "fs";

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const isDev = process.env.NODE_ENV !== "production";

// Ensure log directory exists
fs.mkdirSync(LOG_DIR, { recursive: true });

export const logFilePath = path.join(LOG_DIR, "app.log");

// Build transport targets: always log JSON to file; pretty-print to stdout
// in dev (pino-pretty is a devDependency), raw JSON to stdout in production.
const targets: pino.TransportTargetOptions[] = [
  { target: "pino/file", options: { destination: logFilePath, mkdir: true } },
];

if (isDev) {
  targets.push({ target: "pino-pretty", options: { colorize: true } });
} else {
  targets.push({ target: "pino/file", options: { destination: 1 } }); // stdout
}

export const logger = pino(
  {
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.transport({ targets }),
);

// Child loggers for different modules
export const authLogger = logger.child({ module: "auth" });
export const mcpLogger = logger.child({ module: "mcp" });
export const seedLogger = logger.child({ module: "seed" });

export { LOG_DIR };
