import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireApiRole: vi.fn(async () => ({
    ok: true,
    user: { id: "ag-1", organizationId: "org-1", roles: ["agronomist"] },
  })),
}));

const txMock = vi.hoisted(() => ({
  community: { findFirst: vi.fn() },
  agronomistDistrict: { findFirst: vi.fn() },
  farmer: { create: vi.fn() },
  farmerSubmission: { create: vi.fn() },
  userRole: { findMany: vi.fn() },
  notification: { createMany: vi.fn() },
  document: { createMany: vi.fn() },
  role: { findUnique: vi.fn() },
  user: { create: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
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

vi.mock("@/lib/billing/limits", () => ({
  checkPlanLimit: vi.fn(),
}));

import { POST as farmersPOST } from "@/app/api/farmers/route";
import { checkPlanLimit } from "@/lib/billing/limits";

const validPayload = {
  fullName: "Kwame Mensah",
  email: "",
  phone: "+233241234567",
  cooperativeName: "Asunafo Co-op",
  gender: "Male",
  dateOfBirth: "1989-08-14",
  ghanaCardNumber: "GHA-123456789-1",
  ghanaCardPhotoUrl: "https://example.com/ghana-card.jpg",
  bio: "Cocoa farmer",
  districtId: "cm0000000000000000000001",
  communityId: "cm0000000000000000000002",
  farmName: "Sunrise Farm",
  farmType: "Mixed",
  farmSize: 12,
  farmSizeUnit: "acres",
  ownershipType: "Owned",
  irrigationType: "Rain-fed",
  numberOfPlots: 2,
  farmSitePhotoUrl: "https://example.com/farm-site.jpg",
  location: {
    region: "Ahafo",
    district: "Asunafo North",
    community: "Goaso",
    latitude: 7.1,
    longitude: -2.3,
    address: "Goaso, Ahafo",
  },
  crops: {
    primaryCrop: "Cocoa",
    secondaryCrops: ["Plantain"],
  },
  certifications: [
    {
      name: "Organic",
      issuingBody: "Control Union",
      expiryDate: "2027-12-31",
      documentUrl: "https://example.com/organic.pdf",
    },
  ],
};

describe("farmer onboarding API", () => {
  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    txMock.community.findFirst.mockReset();
    txMock.agronomistDistrict.findFirst.mockReset();
    txMock.farmer.create.mockReset();
    txMock.farmerSubmission.create.mockReset();
    txMock.userRole.findMany.mockReset();
    txMock.notification.createMany.mockReset();
    txMock.document.createMany.mockReset();
    txMock.role.findUnique.mockReset();
    txMock.user.create.mockReset();
    (checkPlanLimit as any).mockReset();

    (checkPlanLimit as any).mockImplementation(async (_organizationId: string, resource: string) => {
      if (resource === "farmers") {
        return { ok: true };
      }

      return { ok: true };
    });

    txMock.community.findFirst.mockResolvedValue({
      id: "cm0000000000000000000002",
      name: "Goaso",
      districtId: "cm0000000000000000000001",
      district: {
        id: "cm0000000000000000000001",
        name: "Asunafo North",
        region: { name: "Ahafo" },
      },
    });
    txMock.agronomistDistrict.findFirst.mockResolvedValue({ id: "assign-1" });
    txMock.role.findUnique.mockResolvedValue({ id: "role-farmer", key: "farmer" });
    txMock.user.create.mockResolvedValue({ id: "user-1", email: "farmer+233241234567@farmiclegrow.local" });
    txMock.farmer.create.mockResolvedValue({
      id: "farmer-1",
      fullName: "Kwame Mensah",
      farmProfiles: [],
    });
    txMock.farmerSubmission.create.mockResolvedValue({ id: "submission-1" });
    txMock.userRole.findMany.mockResolvedValue([]);
    txMock.notification.createMany.mockResolvedValue({ count: 0 });
    txMock.document.createMany.mockResolvedValue({ count: 3 });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock));
  });

  it("creates a farmer record without creating a farmer login or returning credentials", async () => {
    const response = await farmersPOST(
      new Request("http://localhost/api/farmers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      }),
    );

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(txMock.user.create).not.toHaveBeenCalled();
    expect(checkPlanLimit).toHaveBeenCalledWith("org-1", "farmers");
    expect(checkPlanLimit).not.toHaveBeenCalledWith("org-1", "users");
    expect(body.email).toBeUndefined();
    expect(body.tempPassword).toBeUndefined();
    expect(body.farmer?.id).toBe("farmer-1");
    expect(body.submission?.id).toBe("submission-1");
  });
});
