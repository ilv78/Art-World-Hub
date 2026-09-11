/**
 * Minimal declarations for `pino-roll`, which ships no types (#738).
 *
 * Only the stream form is declared — the module's default export resolves to a
 * SonicBoom-compatible writable. It is deliberately not used as a
 * `pino.transport()`, because transports spawn worker threads that cannot
 * resolve modules inside the single-file CJS bundle (see `server/logger.ts`).
 */
declare module "pino-roll" {
  import type { Writable } from "node:stream";

  interface PinoRollOptions {
    file: string;
    size?: string | number;
    frequency?: "daily" | "hourly" | number;
    mkdir?: boolean;
    symlink?: boolean;
    limit?: { count?: number; removeOtherLogFiles?: boolean };
  }

  export default function roll(options: PinoRollOptions): Promise<Writable>;
}
