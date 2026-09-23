import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module to avoid a real database connection, capturing the
// `values`/`set` payloads so assertions can inspect exactly what would be
// written — this is the only way to check that a genuinely new user is
// inserted "pending" while an existing one's approvalStatus is left alone
// on the same upsert call (#831).
const { insertValuesCalls, setCalls } = vi.hoisted(() => ({
  insertValuesCalls: [] as any[],
  setCalls: [] as any[],
}));

vi.mock("../db", () => {
  const mockInsertChain: any = {
    values: vi.fn((v: any) => {
      insertValuesCalls.push(v);
      return mockInsertChain;
    }),
    onConflictDoUpdate: vi.fn((opts: any) => {
      setCalls.push(opts.set);
      return mockInsertChain;
    }),
    returning: vi.fn().mockResolvedValue([{ id: "user-1", email: "new@example.com", approvalStatus: "pending" }]),
  };

  const mockUpdateChain: any = {
    set: vi.fn((v: any) => {
      setCalls.push(v);
      return mockUpdateChain;
    }),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "user-1", approvalStatus: "approved" }]),
  };

  const dbObj: any = {
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) }),
    insert: vi.fn().mockReturnValue(mockInsertChain),
    update: vi.fn().mockReturnValue(mockUpdateChain),
  };

  return { db: dbObj };
});

import { authStorage } from "../replit_integrations/auth/storage";

beforeEach(() => {
  insertValuesCalls.length = 0;
  setCalls.length = 0;
});

describe("authStorage.upsertUser — approval status (#831)", () => {
  it("inserts a brand-new (email) user with approvalStatus pending, overriding the column's approved default", async () => {
    await authStorage.upsertUser({ email: "new@example.com", firstName: "New" });

    expect(insertValuesCalls[0]).toMatchObject({ approvalStatus: "pending", email: "new@example.com" });
  });

  it("never resets approvalStatus on the update path of an upsert", async () => {
    await authStorage.upsertUser({ email: "existing@example.com", firstName: "Existing" });

    const updateSet = setCalls[0];
    expect(updateSet).not.toHaveProperty("approvalStatus");
  });

  it("inserts a brand-new (id-keyed) user with approvalStatus pending when no email is present", async () => {
    await authStorage.upsertUser({ id: "oidc-sub-1", firstName: "NoEmail" });

    expect(insertValuesCalls[0]).toMatchObject({ approvalStatus: "pending", id: "oidc-sub-1" });
  });

  it("lets an explicit approvalStatus override the pending default", async () => {
    await authStorage.upsertUser({ email: "grandfathered@example.com", approvalStatus: "approved" } as any);

    expect(insertValuesCalls[0]).toMatchObject({ approvalStatus: "approved" });
  });
});

describe("authStorage.setApprovalStatus (#831)", () => {
  it("updates approvalStatus and returns the updated user", async () => {
    const user = await authStorage.setApprovalStatus("user-1", "approved");

    expect(setCalls[0]).toMatchObject({ approvalStatus: "approved" });
    expect(user).toMatchObject({ id: "user-1", approvalStatus: "approved" });
  });
});
