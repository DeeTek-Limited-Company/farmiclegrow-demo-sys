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
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
  },
  farmLocation: {
    create: vi.fn(),
    updateMany: vi.fn(),
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
  community: { findFirst: vi.fn() },
  farmer: { findFirst: vi.fn() },
  agronomistDistrict: { findMany: vi.fn() },
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

import { PUT as farmersPUT } from "@/app/api/farmers/[farmerId]/route";

const payload = {
  fullName: "Ama Boateng",
  email: "ama@example.com",
  phone: "+233241112223",
  gender: "Female",
  bio: "Experienced cocoa farmer",
  communityId: "cm0000000000000000000002",
  cooperativeName: "Goaso Growers",
  dateOfBirth: "1990-05-10",
  ghanaCardNumber: "GHA-998877665-1",
  ghanaCardPhotoUrl: "https://example.com/ghana-card.png",
  farmName: "Golden Pod Farm",
  farmType: "Mixed",
  farmSize: 18,
  farmSizeUnit: "acres",
  ownershipType: "Leased",
  irrigationType: "Drip",
  numberOfPlots: 4,
  farmSitePhotoUrl: "https://example.com/farm-site.png",
  primaryCrop: "Cocoa",
  secondaryCrops: ["Cassava", "Plantain"],
  location: {
    latitude: 7.25,
    longitude: -2.42,
    address: "Goaso main road",
    region: "Ahafo",
    district: "Asunafo North",
    community: "Goaso",
  },
  certifications: [
    {
      name: "Organic",
      issuingBody: "Control Union",
      expiryDate: "2028-12-31",
      documentUrl: "https://example.com/organic.pdf",
    },
  ],
};

function makeExistingFarmer(latestSubmissionStatus: "APPROVED" | "REJECTED") {
  return {
    id: "farmer-1",
    organizationId: "org-1",
    fullName: "Ama Boateng",
    communityId: "cm0000000000000000000002",
    farmProfiles: [
      {
        id: "profile-1",
        farmName: "Old Farm",
        locations: [{ id: "loc-1" }],
      },
    ],
    submissions: [
      {
        id: "submission-1",
        status: latestSubmissionStatus,
        rejectionReason: latestSubmissionStatus === "REJECTED" ? "Missing ID photo" : null,
      },
    ],
  };
}

describe("farmer update route", () => {
  beforeEach(() => {
    prismaMock.community.findFirst.mockReset();
    prismaMock.farmer.findFirst.mockReset();
    prismaMock.agronomistDistrict.findMany.mockReset();
    prismaMock.$transaction.mockReset();

    txMock.farmer.updateMany.mockReset();
    txMock.farmer.findFirst.mockReset();
    txMock.farmProfile.create.mockReset();
    txMock.farmProfile.updateMany.mockReset();
    txMock.farmProfile.findFirst.mockReset();
    txMock.farmLocation.create.mockReset();
    txMock.farmLocation.updateMany.mockReset();
    txMock.certification.deleteMany.mockReset();
    txMock.certification.createMany.mockReset();
    txMock.document.deleteMany.mockReset();
    txMock.document.createMany.mockReset();
    txMock.farmerSubmission.create.mockReset();
    txMock.userRole.findMany.mockReset();
    txMock.notification.createMany.mockReset();

    prismaMock.community.findFirst.mockResolvedValue({
      id: "cm0000000000000000000002",
      name: "Goaso",
      district: {
        id: "cm0000000000000000000001",
        name: "Asunafo North",
        region: { name: "Ahafo" },
      },
    });

    txMock.farmer.updateMany.mockResolvedValue({ count: 1 });
    txMock.farmer.findFirst.mockResolvedValue({
      id: "farmer-1",
      organizationId: "org-1",
      fullName: "Ama Boateng",
    });
    txMock.farmProfile.findFirst.mockResolvedValue({
      id: "profile-1",
      organizationId: "org-1",
    });
    txMock.certification.deleteMany.mockResolvedValue({ count: 1 });
    txMock.certification.createMany.mockResolvedValue({ count: 1 });
    txMock.document.deleteMany.mockResolvedValue({ count: 3 });
    txMock.document.createMany.mockResolvedValue({ count: 3 });
    txMock.farmerSubmission.create.mockResolvedValue({
      id: "submission-2",
      farmerId: "farmer-1",
      status: "PENDING_REVIEW",
    });
    txMock.userRole.findMany.mockResolvedValue([{ userId: "admin-1" }, { userId: "admin-2" }]);
    txMock.notification.createMany.mockResolvedValue({ count: 2 });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock));
  });

  it("updates onboarding-critical fields and refreshes onboarding documents and certifications", async () => {
    prismaMock.farmer.findFirst.mockResolvedValue(makeExistingFarmer("APPROVED"));

    const response = await farmersPUT(
      new Request("http://localhost/api/farmers/farmer-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      { params: Promise.resolve({ farmerId: "farmer-1" }) },
    );

    expect(response.status).toBe(200);
    expect(txMock.farmer.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.farmProfile.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.farmLocation.updateMany).toHaveBeenCalledTimes(1);
    expect(txMock.certification.deleteMany).toHaveBeenCalledTimes(1);
    expect(txMock.certification.createMany).toHaveBeenCalledTimes(1);
    expect(txMock.document.deleteMany).toHaveBeenCalledTimes(1);
    expect(txMock.document.createMany).toHaveBeenCalledTimes(1);

    const farmerUpdateArgs = txMock.farmer.updateMany.mock.calls[0][0];
    expect(farmerUpdateArgs.data.cooperativeName).toBe("Goaso Growers");
    expect(farmerUpdateArgs.data.ghanaCardNumber).toBe("GHA-998877665-1");
    expect(farmerUpdateArgs.data.dateOfBirth).toBeInstanceOf(Date);

    const farmProfileArgs = txMock.farmProfile.updateMany.mock.calls[0][0];
    expect(farmProfileArgs.data.farmType).toBe("Mixed");

    const locationArgs = txMock.farmLocation.updateMany.mock.calls[0][0];
    expect(locationArgs.data.region).toBe("Ahafo");
    expect(locationArgs.data.district).toBe("Asunafo North");
    expect(locationArgs.data.community).toBe("Goaso");
  });

  it("creates a fresh pending submission when a rejected farmer record is corrected", async () => {
    prismaMock.farmer.findFirst.mockResolvedValue(makeExistingFarmer("REJECTED"));

    const response = await farmersPUT(
      new Request("http://localhost/api/farmers/farmer-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      { params: Promise.resolve({ farmerId: "farmer-1" }) },
    );

    expect(response.status).toBe(200);
    expect(txMock.farmerSubmission.create).toHaveBeenCalledTimes(1);
    expect(txMock.notification.createMany).toHaveBeenCalledTimes(1);

    const submissionArgs = txMock.farmerSubmission.create.mock.calls[0][0];
    expect(submissionArgs.data.status).toBe("PENDING_REVIEW");
    expect(submissionArgs.data.farmerId).toBe("farmer-1");

    const body = await response.json();
    expect(body.resubmittedSubmission?.id).toBe("submission-2");
  });
});
