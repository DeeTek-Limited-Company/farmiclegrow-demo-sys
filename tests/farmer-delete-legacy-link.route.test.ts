import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
  batch: { findMany: vi.fn() },
  orderItem: { deleteMany: vi.fn() },
  farmer: { deleteMany: vi.fn() },
  user: { findFirst: vi.fn(), deleteMany: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  agronomistDistrict: { findMany: vi.fn() },
  farmer: { findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/auth/guards", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/security/audit", () => ({
  logAudit: vi.fn(async () => undefined),
}));

vi.mock("@/lib/tenant/scope", () => ({
  requireOrgScope: vi.fn(() => "org-1"),
}));

describe("farmer delete legacy user-link safety", () => {
  beforeEach(() => {
    vi.resetModules();
    requireApiRoleMock.mockReset();
    prismaMock.agronomistDistrict.findMany.mockReset();
    prismaMock.farmer.findFirst.mockReset();
    prismaMock.$transaction.mockReset();
    txMock.batch.findMany.mockReset();
    txMock.orderItem.deleteMany.mockReset();
    txMock.farmer.deleteMany.mockReset();
    txMock.user.findFirst.mockReset();
    txMock.user.deleteMany.mockReset();

    requireApiRoleMock.mockResolvedValue({
      ok: true,
      user: { id: "ag-1", organizationId: "org-1", roles: ["agronomist"] },
    });
  });

  it("does not delete unrelated users when Farmer.externalRef points to a non-farmer user", async () => {
    prismaMock.agronomistDistrict.findMany.mockResolvedValue([]);
    prismaMock.farmer.findFirst.mockResolvedValue({
      id: "farmer-1",
      externalRef: "user-admin",
    });

    txMock.batch.findMany.mockResolvedValue([]);
    txMock.user.findFirst.mockResolvedValue({
      id: "user-admin",
      userRoles: [{ role: { key: "admin" } }],
    });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) =>
      callback(txMock),
    );

    const { DELETE } = await import("@/app/api/farmers/[farmerId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/farmers/farmer-1", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ farmerId: "farmer-1" }),
      },
    );

    expect(response.status).toBe(200);
    expect(txMock.user.deleteMany).not.toHaveBeenCalled();
  });
});
