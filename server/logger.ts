import pino from "pino";
import path from "path";
import fs from "fs";
import { PassThrough, type Writable } from "node:stream";
import roll from "pino-roll";

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

// Ensure log directory exists
fs.mkdirSync(LOG_DIR, { recursive: true });

/** Base name for the log files. pino-roll inserts an increasing number before
 * the extension, so the files on disk are `app.1.log`, `app.2.log`, … — read
 * them through `logReadPaths()` rather than opening this path directly. This
 * path itself exists only on a pre-#738 volume, and in tests. */
export const logFilePath = path.join(LOG_DIR, "app.log");

/**
 * Rotation policy (#738): 10 MB per file, 10 files kept (~100 MB ceiling).
 *
 * Before this, `app.log` grew without bound on the `artverse-production_logs`
 * volume — ~3.9 MB over six months, which was survivable only because nothing
 * wrote to it often. Per-call MCP audit logging adds a steady writer, and an
 * audit trail must never become the reason a volume fills.
 *
 * `count` is the number of rotated files kept *in addition to* the active one.
 * The trade-off this accepts: the trail is now bounded by size rather than
 * time, so a sudden burst of traffic shortens the window it covers.
 */
export const LOG_ROTATION = { size: "10m", limit: { count: 9 } } as const;

/**
 * The retained log files, oldest first, or an empty list when none exist yet.
 *
 * pino-roll numbers files as it rolls, so the numeric suffix is chronological.
 * `/api/admin/logs` and the `get_logs` MCP tool both read across these — before
 * rotation they read one unbounded file, and reading only the active one would
 * have silently shortened their history to whatever had accumulated since the
 * last roll.
 */
export function logReadPaths(): string[] {
  const { name, ext } = path.parse(logFilePath);
  let names: string[];
  try {
    names = fs.readdirSync(LOG_DIR);
  } catch {
    return [];
  }

  // pino-roll writes `<name>.<n><ext>` — `app.1.log`, not `app.log.1`.
  const pattern = new RegExp(
    `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.(\\d+)${ext.replace(/\./g, "\\.")}$`,
  );

  const numbered = names
    .map((fileName) => ({ fileName, match: fileName.match(pattern) }))
    .filter((entry): entry is { fileName: string; match: RegExpMatchArray } => entry.match !== null)
    // Numeric, not lexicographic: a string sort puts `app.10.log` before `app.2.log`.
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map((entry) => path.join(LOG_DIR, entry.fileName));

  // An un-rotated file is what a pre-#738 volume holds, and what tests write.
  if (fs.existsSync(logFilePath)) return [logFilePath, ...numbered];
  return numbered;
}

/**
 * Rolling file destination.
 *
 * pino-roll resolves asynchronously, but the logger is built at import time and
 * the server is bundled as CJS (`script/build.ts`), where top-level await is
 * unavailable. Writes therefore go to a PassThrough that is piped into the
 * rolling destination as soon as it is ready — a window of milliseconds at
 * startup, during which lines are buffered rather than dropped.
 *
 * Note this is a *stream*, not a `pino.transport()`: transports spawn worker
 * threads that cannot resolve modules inside a single-file CJS bundle, which is
 * the same constraint that shaped the multistream setup below.
 */
function rollingFileStream(): PassThrough {
  const bridge = new PassThrough();

  roll({ file: logFilePath, mkdir: true, ...LOG_ROTATION })
    .then((destination) => {
      bridge.pipe(destination);
    })
    .catch((err: unknown) => {
      // Losing rotation is recoverable; losing file logging is not. Fall back to
      // the single unbounded file rather than leaving the bridge unpiped.
      process.stderr.write(
        `logger: rotation unavailable, falling back to a single file (${String(err)})\n`,
      );
      bridge.pipe(pino.destination({ dest: logFilePath, sync: false, mkdir: true }) as unknown as Writable);
    });

  return bridge;
}

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
    { level: "trace", stream: rollingFileStream() },
  ]),
);

// Child loggers for different modules
export const authLogger = logger.child({ module: "auth" });
export const mcpLogger = logger.child({ module: "mcp" });

export { LOG_DIR };
