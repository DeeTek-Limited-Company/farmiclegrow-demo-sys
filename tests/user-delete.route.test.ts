import { beforeEach, describe, expect, it, vi } from "vitest";

const requireApiRoleMock = vi.hoisted(() => vi.fn());

const txMock = vi.hoisted(() => ({
  auditLog: { updateMany: vi.fn() },
  approvalAction: { deleteMany: vi.fn() },
  farmerSubmission: { deleteMany: vi.fn() },
  orderMessage: { deleteMany: vi.fn() },
  farmer: { deleteMany: vi.fn() },
  user: { delete: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
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

describe("DELETE /api/users/[userId]", () => {
  beforeEach(() => {
    vi.resetModules();
    requireApiRoleMock.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.$transaction.mockReset();
    txMock.auditLog.updateMany.mockReset();
    txMock.approvalAction.deleteMany.mockReset();
    txMock.farmerSubmission.deleteMany.mockReset();
    txMock.orderMessage.deleteMany.mockReset();
    txMock.farmer.deleteMany.mockReset();
    txMock.user.delete.mockReset();
  });

  it("returns 403 if caller is not authorized as admin", async () => {
    requireApiRoleMock.mockResolvedValue({
      ok: false,
      status: 403,
      message: "Forbidden",
    });

    const { DELETE } = await import("@/app/api/users/[userId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/users/user-2", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "user-2" }) }
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe("Forbidden");
  });

  it("returns 400 if admin tries to delete their own account", async () => {
    requireApiRoleMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", organizationId: "org-1", roles: ["admin"] },
    });

    const { DELETE } = await import("@/app/api/users/[userId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/users/admin-1", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "admin-1" }) }
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("You cannot delete your own account.");
  });

  it("returns 404 if user is not found or belongs to another organization", async () => {
    requireApiRoleMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", organizationId: "org-1", roles: ["admin"] },
    });
    prismaMock.user.findUnique.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/users/[userId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/users/user-other", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "user-other" }) }
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.message).toBe("User not found");
  });

  it("returns 403 if target user is a super_admin", async () => {
    requireApiRoleMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", organizationId: "org-1", roles: ["admin"] },
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "super-1",
      organizationId: "org-1",
      userRoles: [{ role: { key: "super_admin" } }],
    });

    const { DELETE } = await import("@/app/api/users/[userId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/users/super-1", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "super-1" }) }
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toBe("Super admin accounts cannot be deleted.");
  });

  it("successfully deletes user and performs cascade cleanups", async () => {
    requireApiRoleMock.mockResolvedValue({
      ok: true,
      user: { id: "admin-1", organizationId: "org-1", roles: ["admin"] },
    });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "agronomist-1",
      email: "agro@example.com",
      fullName: "Agro Test",
      organizationId: "org-1",
      userRoles: [{ role: { key: "agronomist" } }],
    });
    prismaMock.$transaction.mockImplementation(async (cb: (tx: typeof txMock) => Promise<unknown>) =>
      cb(txMock)
    );

    const { DELETE } = await import("@/app/api/users/[userId]/route");

    const response = await DELETE(
      new Request("http://localhost/api/users/agronomist-1", { method: "DELETE" }),
      { params: Promise.resolve({ userId: "agronomist-1" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("User deleted successfully");

    expect(txMock.auditLog.updateMany).toHaveBeenCalledWith({
      where: { userId: "agronomist-1" },
      data: { userId: null },
    });
    expect(txMock.user.delete).toHaveBeenCalledWith({
      where: { id: "agronomist-1" },
    });
  });
});
