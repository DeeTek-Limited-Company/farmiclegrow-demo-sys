import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/security/rate-limit", () => {
  return {
    rateLimit: vi.fn(() => ({ success: true, remaining: 0, reset: Date.now() + 60_000 })),
  };
});

const prismaMock = vi.hoisted(() => ({
  batch: { findFirst: vi.fn() },
  harvestRecord: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/public/trace/[code]/route";
import { GET as GET_BY_ORG } from "@/app/api/public/trace/orgs/[slug]/[code]/route";

describe("Public trace hardening", () => {
  beforeEach(() => {
    prismaMock.batch.findFirst.mockReset();
    prismaMock.harvestRecord.findMany.mockReset();
  });

  it("returns 404 for invalid codes", async () => {
    const res = await GET(new Request("http://localhost/api/public/trace/bad"), {
      params: Promise.resolve({ code: "bad" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 for invalid codes (org route)", async () => {
    const res = await GET_BY_ORG(new Request("http://localhost/api/public/trace/orgs/acme/bad"), {
      params: Promise.resolve({ slug: "acme", code: "bad" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when batch does not exist", async () => {
    prismaMock.batch.findFirst.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/public/trace/FG-2026-CROP-0001"), {
      params: Promise.resolve({ code: "FG-2026-CROP-0001" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when org is inactive", async () => {
    prismaMock.batch.findFirst.mockResolvedValue({
      batchId: "FG-2026-CROP-0001",
      crop: "Maize",
      quantity: 1,
      harvestDate: new Date(),
      createdAt: new Date(),
      qrCode: "/trace/FG-2026-CROP-0001",
      productionRecordId: "pr-1",
      organizationId: "org-a",
      publicTraceVisibility: "INHERIT",
      organization: {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        status: "SUSPENDED",
        publicTraceEnabled: true,
        publicTracePolicy: null,
        traceTheme: null,
      },
      farmer: { id: "f-1", fullName: "X", cooperativeName: null, primaryCrop: null, certifications: [], community: null },
      productionRecord: { season: "2026", cropType: "Maize", cropVariety: null, farmingMethod: null },
      movementLogs: [],
      warehouseEntries: [],
      salesRecords: [],
      milestones: [],
    });
    const res = await GET(new Request("http://localhost/api/public/trace/FG-2026-CROP-0001"), {
      params: Promise.resolve({ code: "FG-2026-CROP-0001" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when org public trace is disabled", async () => {
    prismaMock.batch.findFirst.mockResolvedValue({
      batchId: "FG-2026-CROP-0001",
      crop: "Maize",
      quantity: 1,
      harvestDate: new Date(),
      createdAt: new Date(),
      qrCode: "/trace/FG-2026-CROP-0001",
      productionRecordId: "pr-1",
      organizationId: "org-a",
      publicTraceVisibility: "INHERIT",
      organization: {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        status: "ACTIVE",
        publicTraceEnabled: false,
        publicTracePolicy: null,
        traceTheme: null,
      },
      farmer: { id: "f-1", fullName: "X", cooperativeName: null, primaryCrop: null, certifications: [], community: null },
      productionRecord: { season: "2026", cropType: "Maize", cropVariety: null, farmingMethod: null },
      movementLogs: [],
      warehouseEntries: [],
      salesRecords: [],
      milestones: [],
    });
    const res = await GET(new Request("http://localhost/api/public/trace/FG-2026-CROP-0001"), {
      params: Promise.resolve({ code: "FG-2026-CROP-0001" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when batch is private", async () => {
    prismaMock.batch.findFirst.mockResolvedValue({
      batchId: "FG-2026-CROP-0001",
      crop: "Maize",
      quantity: 1,
      harvestDate: new Date(),
      createdAt: new Date(),
      qrCode: "/trace/FG-2026-CROP-0001",
      productionRecordId: "pr-1",
      organizationId: "org-a",
      publicTraceVisibility: "PRIVATE",
      organization: {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        status: "ACTIVE",
        publicTraceEnabled: true,
        publicTracePolicy: null,
        traceTheme: null,
      },
      farmer: { id: "f-1", fullName: "X", cooperativeName: null, primaryCrop: null, certifications: [], community: null },
      productionRecord: { season: "2026", cropType: "Maize", cropVariety: null, farmingMethod: null },
      movementLogs: [],
      warehouseEntries: [],
      salesRecords: [],
      milestones: [],
    });
    const res = await GET(new Request("http://localhost/api/public/trace/FG-2026-CROP-0001"), {
      params: Promise.resolve({ code: "FG-2026-CROP-0001" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 for allowed trace", async () => {
    prismaMock.batch.findFirst.mockResolvedValue({
      batchId: "FG-2026-CROP-0001",
      crop: "Maize",
      quantity: 1,
      harvestDate: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      qrCode: "/trace/FG-2026-CROP-0001",
      productionRecordId: "pr-1",
      organizationId: "org-a",
      publicTraceVisibility: "INHERIT",
      organization: {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        status: "ACTIVE",
        publicTraceEnabled: true,
        publicTracePolicy: null,
      },
      farmer: { id: "f-1", fullName: "X", cooperativeName: null, primaryCrop: null, certifications: [], community: null },
      productionRecord: { season: "2026", cropType: "Maize", cropVariety: null, farmingMethod: null },
      movementLogs: [],
      warehouseEntries: [],
      salesRecords: [],
      milestones: [],
    });
    prismaMock.harvestRecord.findMany.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost/api/public/trace/FG-2026-CROP-0001"), {
      params: Promise.resolve({ code: "FG-2026-CROP-0001" }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body?.trace?.batch?.batchId).toBe("FG-2026-CROP-0001");
    expect(body?.trace?.organization?.slug).toBe("org-a");
    expect(body?.trace?.theme).toBeNull();
  });

  it("applies batch public trace overrides to farmer and quality fields", async () => {
    prismaMock.batch.findFirst.mockResolvedValue({
      batchId: "FG-2026-COWP-0002",
      crop: "Cowpea",
      quantity: 2,
      harvestDate: new Date("2026-02-01T00:00:00.000Z"),
      createdAt: new Date("2026-02-02T00:00:00.000Z"),
      qrCode: "/org/org-a/trace/FG-2026-COWP-0002",
      productionRecordId: "pr-2",
      organizationId: "org-a",
      publicTraceVisibility: "PUBLIC",
      publicTracePolicyOverride: {
        sections: {
          farmer: {
            enabled: true,
            fields: {
              name: false,
              anonymizedName: true,
              cooperativeName: true,
              certifications: false,
            },
          },
          quality: {
            enabled: true,
            fields: {
              passFail: true,
              moisturePct: true,
            },
          },
        },
      },
      organization: {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        status: "ACTIVE",
        publicTraceEnabled: true,
        publicTracePolicy: {
          sections: {
            farmer: {
              enabled: false,
              fields: {
                name: false,
                anonymizedName: false,
                cooperativeName: false,
                certifications: false,
              },
            },
            quality: {
              enabled: false,
              fields: {
                passFail: false,
                moisturePct: false,
              },
            },
          },
        },
        traceTheme: null,
      },
      farmer: {
        id: "f-override",
        fullName: "Farmer Full Name",
        cooperativeName: "Growers United",
        primaryCrop: null,
        certifications: [],
        community: null,
      },
      productionRecord: {
        season: "2026",
        cropType: "Cowpea",
        cropVariety: null,
        farmingMethod: null,
      },
      movementLogs: [],
      warehouseEntries: [],
      salesRecords: [],
      milestones: [],
    });
    prismaMock.harvestRecord.findMany.mockResolvedValue([
      {
        harvestDate: new Date("2026-02-01T00:00:00.000Z"),
        crop: "Cowpea",
        quantityHarvested: 2,
        initialQualityGrade: "A",
        supervisorApproved: true,
        qualityTests: [
          {
            passed: true,
            moisturePct: 11.2,
            foreignMatterPct: null,
            brokenGrainPct: null,
            aflatoxinTest: null,
            colorGrade: null,
            pestDamage: null,
            dateTested: new Date("2026-02-03T00:00:00.000Z"),
          },
        ],
      },
    ]);

    const response = await GET(
      new Request("http://localhost:3001/api/public/trace/FG-2026-COWP-0002"),
      { params: Promise.resolve({ code: "FG-2026-COWP-0002" }) },
    );

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body?.trace?.farmer?.name).toMatch(/^Farmer /);
    expect(body?.trace?.farmer?.name).not.toBe("Farmer Full Name");
    expect(body?.trace?.origin?.cooperativeName).toBe("Growers United");
    expect(body?.trace?.certifications).toBeNull();
    expect(body?.trace?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "QUALITY_TEST",
          details: expect.objectContaining({
            passed: true,
            moisturePct: 11.2,
          }),
        }),
      ]),
    );
  });

  it("returns 404 for wrong org slug even with a valid code", async () => {
    prismaMock.batch.findFirst.mockResolvedValue(null);
    const res = await GET_BY_ORG(new Request("http://localhost/api/public/trace/orgs/wrong/FG-2026-CROP-0001"), {
      params: Promise.resolve({ slug: "wrong", code: "FG-2026-CROP-0001" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 for org-scoped trace", async () => {
    prismaMock.batch.findFirst.mockResolvedValue({
      batchId: "FG-2026-CROP-0001",
      crop: "Maize",
      quantity: 1,
      harvestDate: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      qrCode: "/trace/FG-2026-CROP-0001",
      productionRecordId: "pr-1",
      organizationId: "org-a",
      publicTraceVisibility: "INHERIT",
      organization: {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        status: "ACTIVE",
        publicTraceEnabled: true,
        publicTracePolicy: null,
        traceTheme: null,
      },
      farmer: { id: "f-1", fullName: "X", cooperativeName: null, primaryCrop: null, certifications: [], community: null },
      productionRecord: { season: "2026", cropType: "Maize", cropVariety: null, farmingMethod: null },
      movementLogs: [],
      warehouseEntries: [],
      salesRecords: [],
      milestones: [],
    });
    prismaMock.harvestRecord.findMany.mockResolvedValue([]);

    const res = await GET_BY_ORG(new Request("http://localhost/api/public/trace/orgs/org-a/FG-2026-CROP-0001"), {
      params: Promise.resolve({ slug: "org-a", code: "FG-2026-CROP-0001" }),
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body?.trace?.organization?.slug).toBe("org-a");
    expect(body?.trace?.batch?.batchId).toBe("FG-2026-CROP-0001");
  });

  it("accepts an org-scoped trace path as a valid public trace code", async () => {
    prismaMock.batch.findFirst.mockResolvedValue({
      batchId: "FG-2026-CROP-0001",
      crop: "Maize",
      quantity: 1,
      harvestDate: new Date("2026-01-01T00:00:00.000Z"),
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      qrCode: "/org/org-a/trace/FG-2026-CROP-0001",
      productionRecordId: "pr-1",
      organizationId: "org-a",
      publicTraceVisibility: "INHERIT",
      organization: {
        id: "org-a",
        name: "Org A",
        slug: "org-a",
        status: "ACTIVE",
        publicTraceEnabled: true,
        publicTracePolicy: null,
        traceTheme: null,
      },
      farmer: { id: "f-1", fullName: "X", cooperativeName: null, primaryCrop: null, certifications: [], community: null },
      productionRecord: { season: "2026", cropType: "Maize", cropVariety: null, farmingMethod: null },
      movementLogs: [],
      warehouseEntries: [],
      salesRecords: [],
      milestones: [],
    });
    prismaMock.harvestRecord.findMany.mockResolvedValue([]);

    const res = await GET(
      new Request("http://localhost/api/public/trace/%2Forg%2Forg-a%2Ftrace%2FFG-2026-CROP-0001"),
      {
        params: Promise.resolve({
          code: "/org/org-a/trace/FG-2026-CROP-0001",
        }),
      },
    );

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body?.trace?.organization?.slug).toBe("org-a");
    expect(body?.trace?.batch?.batchId).toBe("FG-2026-CROP-0001");
  });
});
