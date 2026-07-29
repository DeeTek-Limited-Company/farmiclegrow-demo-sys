import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireApiRole: vi.fn(async () => ({
    ok: true,
    user: { id: "admin-1", organizationId: "org-1", roles: ["admin"] },
  })),
}));

const txMock = vi.hoisted(() => ({
  farmer: {
    updateMany: vi.fn(),
    findFirst: vi.fn(),
  },
  farmProfile: {
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  farmLocation: {
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  certification: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  document: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  farmerSubmission: {
    create: vi.fn(),
  },
  userRole: {
    findMany: vi.fn(),
  },
  notification: {
    createMany: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  farmer: {
    findFirst: vi.fn(),
  },
  community: {
    findFirst: vi.fn(),
  },
  agronomistDistrict: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/quality-score", () => ({
  recomputeFarmerQualityScore: vi.fn(async () => undefined),
}));

vi.mock("@/lib/security/audit", () => ({
  logAudit: vi.fn(async () => undefined),
}));

vi.mock("@/lib/tenant/scope", () => ({
  requireOrgScope: vi.fn(() => "org-1"),
}));

import { PUT as farmerPUT } from "@/app/api/farmers/[farmerId]/route";

describe("farmer admin edit route", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    );

    txMock.farmer.updateMany.mockResolvedValue({ count: 1 });
    txMock.farmer.findFirst.mockResolvedValue({
      id: "farmer-1",
      organizationId: "org-1",
      fullName: "Kwame Nkrumah",
    });
    txMock.farmProfile.updateMany.mockResolvedValue({ count: 1 });
    txMock.farmProfile.findFirst.mockResolvedValue({
      id: "profile-1",
      organizationId: "org-1",
    });
    txMock.farmLocation.updateMany.mockResolvedValue({ count: 1 });
  });

  it("updates farmer location and sets isValidated status", async () => {
    prismaMock.farmer.findFirst.mockResolvedValue({
      id: "farmer-1",
      organizationId: "org-1",
      farmProfiles: [
        {
          id: "profile-1",
          locations: [
            {
              id: "loc-1",
              latitude: 5.6037,
              longitude: -0.187,
              isValidated: false,
            },
          ],
        },
      ],
      submissions: [],
    });

    const response = await farmerPUT(
      new Request("http://localhost/api/farmers/farmer-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: {
            latitude: 5.6037,
            longitude: -0.187,
            isValidated: true,
          },
        }),
      }),
      { params: Promise.resolve({ farmerId: "farmer-1" }) },
    );

    expect(response.status).toBe(200);
    expect(txMock.farmLocation.updateMany).toHaveBeenCalledWith({
      where: { id: "loc-1", organizationId: "org-1" },
      data: expect.objectContaining({
        latitude: 5.6037,
        longitude: -0.187,
        isValidated: true,
      }),
    });
  });
});
