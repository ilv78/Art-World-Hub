/**
 * Audit trail for the MCP endpoint (#738).
 *
 * `/mcp` is an authenticated, mutating surface exposing 12 tools, 14 resources
 * and 4 prompts, and until this module it recorded nothing: `pino-http` skips
 * any URL that does not start with `/api`, and `server/mcp.ts` logged only
 * errors, without caller identity. The #732 review had to answer "was the
 * pre-#695 authorization gap ever exercised?" by structural inference —
 * counting artist profiles — because no log could answer it. That worked only
 * because production has one artist; with two it becomes unanswerable.
 *
 * Instrumentation is installed by patching the registration methods rather than
 * by editing each handler, so a tool added later is audited by construction
 * instead of by remembering to instrument it.
 *
 * IDENTIFIERS ONLY. Never argument values. `/api/admin/logs` and the `get_logs`
 * MCP tool both surface `app.log` to admins, so anything written here is
 * readable back through the app — logging `create_order` arguments would put
 * buyer contact details in a file that `get_logs` hands out, a milder replay of
 * the very exposure (#681) this trail exists to detect.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { mcpLogger as logger } from "./logger";

/** The session id does not exist when `createMcpServer` runs — the transport
 * generates it later, in `onsessioninitialized`. Handlers therefore read it
 * through a holder that is populated once the session is live; calls made
 * before that honestly carry no session. */
export type SessionRef = { id?: string };

type CallBox = { denial?: string };

const callContext = new AsyncLocalStorage<CallBox>();

/**
 * Record that this call was refused on authorization grounds, and return the
 * reason so call sites can shape their own refusal with it.
 *
 * Denials matter more than successes: a burst of them is the signal that a
 * cross-tenant attempt happened at all, which is exactly what was unavailable
 * for the #732 review. Every refusal path in `server/mcp.ts` routes through
 * here — the `forbidden()` helper for tools, and the two handlers that shape
 * their own refusal (the `orders-by-artist` resource and the `order_summary`
 * prompt) — so no handler can deny silently.
 */
export function recordDenial(reason: string): string {
  const box = callContext.getStore();
  if (box) box.denial = reason;
  return reason;
}

/** Argument keys that name a record rather than describe one. Deliberately
 * explicit: a bare `id` would also match fields on the SDK's `extra` argument
 * and log something that is not the call's target. */
const TARGET_KEYS = ["artworkId", "artistId", "orderId", "postId", "auctionId", "exhibitionId"] as const;

/**
 * The identifier this call acted on, or undefined when it has none.
 *
 * Tools receive their arguments as the first parameter; resources receive a
 * `URL` plus the template variables. Named ids win over the URI, which is only
 * used when no argument names a record.
 */
export function auditTarget(args: readonly unknown[]): string | undefined {
  for (const arg of args) {
    if (!arg || typeof arg !== "object" || arg instanceof URL) continue;
    const record = arg as Record<string, unknown>;
    for (const key of TARGET_KEYS) {
      const value = record[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
  }
  for (const arg of args) {
    if (arg instanceof URL) return arg.href;
  }
  return undefined;
}

type Kind = "tool" | "resource" | "prompt";

/**
 * Patch `mcp.tool` / `mcp.resource` / `mcp.prompt` so every handler they
 * register is wrapped in an audit line.
 *
 * The SDK inspects the *types* of the registration arguments to resolve its
 * overloads and never inspects handler arity, so replacing the trailing
 * function is transparent to it.
 */
export function installAuditLogging(
  mcp: unknown,
  userId: string,
  session: SessionRef,
): void {
  const target = mcp as Record<Kind, (...args: unknown[]) => unknown>;

  for (const kind of ["tool", "resource", "prompt"] as const) {
    const register = target[kind].bind(mcp);

    target[kind] = (...registerArgs: unknown[]) => {
      const name = String(registerArgs[0]);
      const last = registerArgs.length - 1;
      const handler = registerArgs[last];

      if (typeof handler === "function") {
        registerArgs[last] = audited(kind, name, userId, session, handler as (...a: unknown[]) => unknown);
      }

      return register(...registerArgs);
    };
  }
}

function audited(
  kind: Kind,
  name: string,
  userId: string,
  session: SessionRef,
  handler: (...args: unknown[]) => unknown,
) {
  return async (...args: unknown[]): Promise<unknown> => {
    const box: CallBox = {};
    const startedAt = Date.now();

    const line = () => ({
      userId,
      sessionId: session.id,
      kind,
      name,
      targetId: auditTarget(args),
      durationMs: Date.now() - startedAt,
    });

    try {
      const result = await callContext.run(box, async () => handler(...args));

      if (box.denial) {
        logger.warn({ ...line(), outcome: "denied", reason: box.denial }, "MCP call denied");
      } else {
        logger.info({ ...line(), outcome: "ok" }, "MCP call");
      }

      return result;
    } catch (e: unknown) {
      // A handler that throws to refuse (the `order_summary` prompt) still
      // recorded its denial before throwing, so classify on that rather than on
      // the exception, which cannot distinguish refusal from failure.
      if (box.denial) {
        logger.warn({ ...line(), outcome: "denied", reason: box.denial }, "MCP call denied");
      } else {
        logger.error(
          { ...line(), outcome: "error", err: e instanceof Error ? e.message : String(e) },
          "MCP call failed",
        );
      }
      throw e;
    }
  };
}
