/**
 * MCP audit trail (#738).
 *
 * The point of these tests is not that a log line is emitted — it is that the
 * line can answer "did user X call tool Y against record Z, and was it
 * allowed?", and that it never carries an argument value. The PII boundary is
 * enforced here rather than by care: `/api/admin/logs` and the `get_logs` MCP
 * tool both surface `app.log` to admins, so a value logged here is readable
 * back through the app.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const { mockStorage, mockAuthStorage } = vi.hoisted(() => {
  const fn = vi.fn;
  return {
    mockStorage: {
      getArtists: fn(),
      getArtist: fn(),
      getArtistByUserId: fn(),
      getArtwork: fn(),
      createArtwork: fn(),
      updateArtwork: fn(),
      getOrdersByArtist: fn(),
      regenerateArtistGallery: fn(),
    },
    mockAuthStorage: { getUser: fn() },
  };
});

vi.mock("../storage", () => ({ storage: mockStorage }));

vi.mock("../replit_integrations/auth", () => ({
  isAuthenticated: (req: any, _res: any, next: any) => {
    req.user = { claims: { sub: "user-1" } };
    next();
  },
  authStorage: mockAuthStorage,
}));

const { auditLog, testLogDir } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tmpdir = require("os").tmpdir();
  return {
    auditLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    testLogDir: `${tmpdir}/artverse-mcp-audit-test-logs-${process.pid}`,
  };
});

vi.mock("../logger", () => {
  const noopLogger = {
    ...auditLog,
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return {
    logger: noopLogger,
    mcpLogger: noopLogger,
    logFilePath: `${testLogDir}/app.log`,
    logReadPaths: () => [`${testLogDir}/app.log`],
    LOG_ROTATION: { size: "10m", limit: { count: 9 } },
    LOG_DIR: testLogDir,
  };
});

import { createMcpServer } from "../mcp";
import type { SessionRef } from "../mcp-audit";

const callerArtist = { id: "artist-1", name: "Caller Artist", userId: "user-1" };
const otherArtist = { id: "artist-2", name: "Other Artist", userId: "user-2" };

async function connectAs(userId: string, session: SessionRef = { id: "session-abc" }): Promise<Client> {
  const server = createMcpServer(userId, session);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/** Every field of every audit line, as one searchable string. */
function allLoggedText(): string {
  return [...auditLog.info.mock.calls, ...auditLog.warn.mock.calls, ...auditLog.error.mock.calls]
    .map((call) => JSON.stringify(call))
    .join("\n");
}

function lineFor(spy: typeof auditLog.info, name: string): any {
  const call = spy.mock.calls.find(([fields]: any[]) => fields?.name === name);
  return call?.[0];
}

const baseArgs = {
  title: "T", description: "D", imageUrl: "https://x/img.png",
  price: "100", medium: "Painting", category: "Painting",
};

beforeEach(() => {
  Object.values(mockStorage).forEach((fn) => fn.mockReset());
  mockAuthStorage.getUser.mockReset();
  auditLog.info.mockReset();
  auditLog.warn.mockReset();
  auditLog.error.mockReset();

  mockStorage.getArtistByUserId.mockImplementation(async (userId: string) =>
    userId === "user-1" ? callerArtist : undefined,
  );
  mockStorage.getArtist.mockImplementation(async (id: string) =>
    id === "artist-1" ? callerArtist : id === "artist-2" ? otherArtist : undefined,
  );
  mockAuthStorage.getUser.mockResolvedValue({ id: "user-1", role: "user" });
  mockStorage.getArtists.mockResolvedValue([]);
});

describe("MCP audit trail (#738)", () => {
  it("logs an allowed tool call with caller, session and target", async () => {
    mockStorage.createArtwork.mockResolvedValue({ id: "aw-1", artistId: "artist-1", isReadyForExhibition: false });

    const client = await connectAs("user-1");
    await client.callTool({ name: "create_artwork", arguments: { ...baseArgs, artistId: "artist-1" } });

    const line = lineFor(auditLog.info, "create_artwork");
    expect(line).toMatchObject({
      userId: "user-1",
      sessionId: "session-abc",
      kind: "tool",
      name: "create_artwork",
      targetId: "artist-1",
      outcome: "ok",
    });
    expect(typeof line.durationMs).toBe("number");
  });

  it("logs a cross-tenant denial at warn with the reason", async () => {
    const client = await connectAs("user-1");
    await client.callTool({ name: "create_artwork", arguments: { ...baseArgs, artistId: "artist-2" } });

    const line = lineFor(auditLog.warn, "create_artwork");
    expect(line).toMatchObject({
      userId: "user-1",
      kind: "tool",
      name: "create_artwork",
      targetId: "artist-2",
      outcome: "denied",
    });
    expect(line.reason).toContain("another artist");
    // A denial must not also be counted as a success.
    expect(lineFor(auditLog.info, "create_artwork")).toBeUndefined();
  });

  it("logs a resource denial that shapes its own refusal", async () => {
    const client = await connectAs("user-1");
    await client.readResource({ uri: "vernis9://artists/artist-2/orders" });

    const line = lineFor(auditLog.warn, "orders-by-artist");
    expect(line).toMatchObject({ kind: "resource", outcome: "denied", targetId: "artist-2" });
    expect(mockStorage.getOrdersByArtist).not.toHaveBeenCalled();
  });

  it("logs a prompt denial that refuses by throwing", async () => {
    const client = await connectAs("user-1");
    await expect(
      client.getPrompt({ name: "order_summary", arguments: { artistId: "artist-2" } }),
    ).rejects.toThrow();

    const line = lineFor(auditLog.warn, "order_summary");
    expect(line).toMatchObject({ kind: "prompt", outcome: "denied", targetId: "artist-2" });
    // Classified as a refusal, not as a failure.
    expect(lineFor(auditLog.error, "order_summary")).toBeUndefined();
  });

  it("never logs argument values", async () => {
    mockStorage.createArtwork.mockResolvedValue({ id: "aw-1", artistId: "artist-1", isReadyForExhibition: false });

    const client = await connectAs("user-1");
    await client.callTool({
      name: "create_artwork",
      arguments: {
        ...baseArgs,
        artistId: "artist-1",
        title: "UNIQUE-TITLE-SENTINEL",
        description: "buyer@example.com lives at 12 Sentinel Street",
      },
    });

    const logged = allLoggedText();
    expect(logged).not.toContain("UNIQUE-TITLE-SENTINEL");
    expect(logged).not.toContain("buyer@example.com");
    expect(logged).not.toContain("Sentinel Street");
    // …while still identifying the call.
    expect(logged).toContain("create_artwork");
    expect(logged).toContain("artist-1");
  });

  it("carries no session id for calls made before the session is initialised", async () => {
    // createMcpServer runs before the transport generates the id, so the holder
    // is empty until onsessioninitialized fires.
    const client = await connectAs("user-1", {});
    await client.readResource({ uri: "vernis9://artists" });

    const line = lineFor(auditLog.info, "all-artists");
    expect(line.sessionId).toBeUndefined();
    expect(line.outcome).toBe("ok");
  });

  it("audits a tool registered later without touching its handler", async () => {
    // The wrapper is installed at registration, so coverage does not depend on
    // remembering to instrument each new handler.
    const client = await connectAs("user-1");
    await client.readResource({ uri: "vernis9://artists" });

    expect(lineFor(auditLog.info, "all-artists")).toMatchObject({ kind: "resource", outcome: "ok" });
  });
});
