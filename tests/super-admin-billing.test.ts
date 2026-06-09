import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/guards", () => {
  return {
    requireApiRole: vi.fn(async () => ({
      ok: true,
      user: { id: "u-1", organizationId: "org-super", roles: ["super_admin"] },
    })),
  };
});

const prismaMock = vi.hoisted(() => ({
  billingPlan: { findMany: vi.fn() },
  organization: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
  role: { findUnique: vi.fn() },
  user: { findUnique: vi.fn(), count: vi.fn() },
  farmer: { count: vi.fn() },
  batch: { count: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tenant/scope", () => {
  return { requireOrgScope: vi.fn(() => "org-a") };
});

vi.mock("@/lib/billing/limits", () => {
  return { checkPlanLimit: vi.fn() };
});

vi.mock("@/lib/auth/password", () => {
  return { hashPassword: vi.fn(async () => "hash") };
});

import { GET as billingGET } from "@/app/api/super-admin/billing/route";
import { POST as usersPOST } from "@/app/api/users/route";
import { checkPlanLimit } from "@/lib/billing/limits";

describe("Super-admin billing", () => {
  beforeEach(() => {
    prismaMock.billingPlan.findMany.mockReset();
    prismaMock.organization.findMany.mockReset();
    prismaMock.organization.count.mockReset();
  });

  it("paginates organizations and returns pageInfo", async () => {
    prismaMock.billingPlan.findMany.mockResolvedValue([
      {
        key: "PROFESSIONAL",
        name: "Professional",
        priceCents: 29900,
        currency: "USD",
        interval: "month",
        usersLimit: 20,
        farmersLimit: 1000,
        batchesLimit: 500,
      },
    ]);

    prismaMock.organization.findMany.mockImplementation(async (args: any) => {
      if (args?.select?.subscriptionPlan && Object.keys(args.select).length === 1) {
        return [{ subscriptionPlan: "PROFESSIONAL" }, { subscriptionPlan: "PROFESSIONAL" }];
      }

      return [
        {
          id: "org-3",
          name: "Org 3",
          slug: "org-3",
          status: "ACTIVE",
          subscriptionPlan: "PROFESSIONAL",
          subscriptionStatus: "ACTIVE",
          createdAt: new Date("2026-01-03T00:00:00.000Z"),
          _count: { users: 1, farmers: 2, batches: 3 },
        },
        {
          id: "org-2",
          name: "Org 2",
          slug: "org-2",
          status: "ACTIVE",
          subscriptionPlan: "PROFESSIONAL",
          subscriptionStatus: "ACTIVE",
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
          _count: { users: 1, farmers: 2, batches: 3 },
        },
        {
          id: "org-1",
          name: "Org 1",
          slug: "org-1",
          status: "ACTIVE",
          subscriptionPlan: "PROFESSIONAL",
          subscriptionStatus: "TRIAL",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          _count: { users: 1, farmers: 2, batches: 3 },
        },
      ];
    });

    prismaMock.organization.count.mockResolvedValue(2);

    const res = await billingGET(new Request("http://localhost/api/super-admin/billing?limit=2"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body?.billing?.edges?.length).toBe(2);
    expect(body?.billing?.pageInfo?.hasMore).toBe(true);
    expect(body?.billing?.pageInfo?.nextCursor).toBe("org-2");
    expect(body?.metrics?.activePayingOrgs).toBe(2);
  });
});

describe("Billing limit enforcement", () => {
  beforeEach(() => {
    prismaMock.role.findUnique.mockReset();
    prismaMock.user.findUnique.mockReset();
    (checkPlanLimit as any).mockReset();
  });

  it("blocks user creation when plan limit exceeded", async () => {
    prismaMock.role.findUnique.mockResolvedValue({ id: "r-1", key: "admin" });
    prismaMock.user.findUnique.mockResolvedValue(null);
    (checkPlanLimit as any).mockResolvedValue({ ok: false, reason: "limit_exceeded", current: 5, limit: 5, planKey: "STARTER" });

    const res = await usersPOST(
      new Request("http://localhost/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "New User",
          email: "new@example.com",
          password: "Password123!",
          roleKey: "admin",
        }),
      }),
    );

    expect(res.status).toBe(403);
  });
});

