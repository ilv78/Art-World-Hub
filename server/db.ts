import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { dbLogger } from "./logger";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Bounds on an otherwise-unbounded pool (#684). Defaults left every one of
  // these at either "unlimited" or "wait forever", so a stuck backend query
  // or an exhausted pool hung requests instead of failing them.
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 30_000,
});

// node-postgres surfaces a broken *idle* client (e.g. the backend restarting
// under it) as an 'error' event on the pool. Without a listener, Node treats
// that as an uncaught exception and crashes the process. The pool recovers
// the connection on its own; logging is all this handler needs to do.
pool.on("error", (err) => {
  dbLogger.error({ err }, "idle pg client error");
});

export const db = drizzle(pool, { schema });
