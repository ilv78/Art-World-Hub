import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

vi.mock("../replit_integrations/auth/storage", () => ({
  authStorage: { getUser: getUserMock },
}));

import { isAuthenticated, isAdmin, isCurator, isSessionValid } from "../replit_integrations/auth/replitAuth";

function makeReq(userId = "user-1") {
  return {
    isAuthenticated: () => true,
    user: { claims: { sub: userId } },
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  getUserMock.mockReset();
});

// isAuthenticated gates every resource-consuming route on both a valid
// session and administrator sign-off (#831): a pending or rejected account
// must not be able to touch these, but isSessionValid ("who am I") still
// has to work for the same account so the client can show its state.
describe("isAuthenticated — approval gate (#831)", () => {
  it("calls next() for an approved user", async () => {
    getUserMock.mockResolvedValue({ id: "user-1", approvalStatus: "approved" });
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects a pending user with 403", async () => {
    getUserMock.mockResolvedValue({ id: "user-1", approvalStatus: "pending" });
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "ACCOUNT_NOT_APPROVED", approvalStatus: "pending" }));
  });

  it("rejects a rejected user with 403", async () => {
    getUserMock.mockResolvedValue({ id: "user-1", approvalStatus: "rejected" });
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("rejects with 401 when the session user no longer exists in the db", async () => {
    getUserMock.mockResolvedValue(undefined);
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("isSessionValid — no approval check (#831)", () => {
  it("calls next() for a pending user (so the client can read its own status)", async () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await isSessionValid(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(getUserMock).not.toHaveBeenCalled();
  });
});

describe("isAdmin / isCurator — approval gate (#831)", () => {
  it("isAdmin rejects a pending admin-role user with 403 before the role check", async () => {
    getUserMock.mockResolvedValue({ id: "user-1", role: "admin", approvalStatus: "pending" });
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await isAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "ACCOUNT_NOT_APPROVED" }));
  });

  it("isCurator rejects a pending curator-role user with 403 before the role check", async () => {
    getUserMock.mockResolvedValue({ id: "user-1", role: "curator", approvalStatus: "pending" });
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await isCurator(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("isAdmin still enforces the role check once approved", async () => {
    getUserMock.mockResolvedValue({ id: "user-1", role: "user", approvalStatus: "approved" });
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await isAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("admin") }));
  });
});
