import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const requireApiRoleMock = vi.hoisted(() => vi.fn());

const prismaMock = vi.hoisted(() => ({
  farmer: { findFirst: vi.fn() },
  productionRecord: { findMany: vi.fn() },
  batch: { findFirst: vi.fn() },
}));

vi.mock("@/lib/auth/guards", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/tenant/scope", () => ({
  requireOrgScope: vi.fn(() => "org-1"),
}));

describe("farmer record route safety", () => {
  beforeEach(() => {
    vi.resetModules();
    requireApiRoleMock.mockReset();
    prismaMock.farmer.findFirst.mockReset();
    prismaMock.productionRecord.findMany.mockReset();
    prismaMock.batch.findFirst.mockReset();
  });

  it("removes Farmer.externalRef (user-link) usage from staff-owned production/batch/trace surfaces", () => {
    const root = resolve(process.cwd());

    const productionList = readFileSync(resolve(root, "src/app/api/production/route.ts"), "utf8");
    const productionDetail = readFileSync(resolve(root, "src/app/api/production/[id]/route.ts"), "utf8");
    const batchDetail = readFileSync(resolve(root, "src/app/api/batches/[batchId]/route.ts"), "utf8");
    const milestones = readFileSync(resolve(root, "src/app/api/batches/[batchId]/milestones/route.ts"), "utf8");
    const internalTrace = readFileSync(
      resolve(root, "src/app/org/[orgSlug]/(dashboard)/trace/[code]/page.tsx"),
      "utf8",
    );

    expect(productionList).not.toContain("externalRef");
    expect(productionDetail).not.toContain("externalRef");
    expect(batchDetail).not.toContain("externalRef");
    expect(milestones).not.toContain("externalRef");
    expect(internalTrace).not.toContain("externalRef");
  });

  it("production list rejects farmer-role access without user-linkage lookups", async () => {
    requireApiRoleMock.mockResolvedValueOnce({
      ok: true,
      user: { id: "user-1", organizationId: "org-1", roles: ["farmer"] },
    });

    const { GET } = await import("@/app/api/production/route");

    const response = await GET(new Request("http://localhost/api/production"));

    expect(response.status).toBe(403);
    expect(prismaMock.farmer.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.productionRecord.findMany).not.toHaveBeenCalled();
  });

  it("batch detail rejects farmer-role access without user-linkage lookups", async () => {
    requireApiRoleMock.mockResolvedValueOnce({
      ok: true,
      user: { id: "user-1", organizationId: "org-1", roles: ["farmer"] },
    });

    const { GET } = await import("@/app/api/batches/[batchId]/route");

    const response = await GET(new Request("http://localhost/api/batches/FG-2026-CROP-0001"), {
      params: Promise.resolve({ batchId: "FG-2026-CROP-0001" }),
    });

    expect(response.status).toBe(403);
    expect(prismaMock.farmer.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.batch.findFirst).not.toHaveBeenCalled();
  });

  it("batch milestones reject farmer-role access without user-linkage lookups", async () => {
    requireApiRoleMock.mockResolvedValueOnce({
      ok: true,
      user: { id: "user-1", organizationId: "org-1", roles: ["farmer"] },
    });

    const { GET } = await import("@/app/api/batches/[batchId]/milestones/route");

    const response = await GET(new Request("http://localhost/api/batches/FG-2026-CROP-0001/milestones"), {
      params: Promise.resolve({ batchId: "FG-2026-CROP-0001" }),
    });

    expect(response.status).toBe(403);
    expect(prismaMock.farmer.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.batch.findFirst).not.toHaveBeenCalled();
  });

  it("internal trace rejects farmer-role access before loading the batch", () => {
    const pagePath = resolve(
      process.cwd(),
      "src/app/org/[orgSlug]/(dashboard)/trace/[code]/page.tsx",
    );
    const page = readFileSync(pagePath, "utf8");
    const guardIndex = page.indexOf('if (user.roles.includes("farmer"))');
    const queryIndex = page.indexOf("prisma.batch.findFirst(");

    expect(guardIndex).toBeGreaterThan(-1);
    expect(queryIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(queryIndex);
  });
});

