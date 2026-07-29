import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireApiRole: vi.fn(async () => ({
    ok: true,
    user: { id: "admin-1", organizationId: "org-1", roles: ["admin"] },
  })),
}));

const txMock = vi.hoisted(() => ({
  farmerSubmission: {
    updateMany: vi.fn(),
  },
  approvalAction: {
    create: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
}));

const prismaMock = vi.hoisted(() => ({
  farmerSubmission: {
    findFirst: vi.fn(),
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

import { POST as submissionDecisionPOST } from "@/app/api/submissions/[submissionId]/decision/route";

describe("submission decision route", () => {
  beforeEach(() => {
    prismaMock.farmerSubmission.findFirst.mockReset();
    prismaMock.$transaction.mockReset();
    txMock.farmerSubmission.updateMany.mockReset();
    txMock.approvalAction.create.mockReset();
    txMock.notification.create.mockReset();

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => Promise<unknown>) => callback(txMock),
    );
    txMock.farmerSubmission.updateMany.mockResolvedValue({ count: 1 });
    txMock.approvalAction.create.mockResolvedValue({ id: "approval-1" });
    txMock.notification.create.mockResolvedValue({ id: "notification-1" });
  });

  it("blocks approval when onboarding blockers remain unresolved", async () => {
    prismaMock.farmerSubmission.findFirst.mockResolvedValue({
      id: "submission-1",
      organizationId: "org-1",
      farmerId: "farmer-1",
      submittedById: "agronomist-1",
      status: "PENDING_REVIEW",
      farmer: {
        id: "farmer-1",
        fullName: "Ama Boateng",
        phone: "+233241112223",
        ghanaCardNumber: null,
        primaryCrop: null,
        farmProfiles: [
          {
            id: "profile-1",
            farmName: "",
            locations: [],
          },
        ],
      },
      submittedBy: {
        id: "agronomist-1",
      },
    });

    const response = await submissionDecisionPOST(
      new Request("http://localhost/api/submissions/submission-1/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVED" }),
      }),
      { params: Promise.resolve({ submissionId: "submission-1" }) },
    );

    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.message).toBe("Resolve onboarding blockers before approval.");
    expect(body.blockers).toEqual([
      "Ghana Card",
      "Farm Name",
      "Primary Crop",
      "GPS Location",
    ]);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("approves submission successfully when all onboarding blockers are resolved", async () => {
    prismaMock.farmerSubmission.findFirst.mockResolvedValue({
      id: "submission-1",
      organizationId: "org-1",
      farmerId: "farmer-1",
      submittedById: "agronomist-1",
      status: "PENDING_REVIEW",
      farmer: {
        id: "farmer-1",
        fullName: "Ama Boateng",
        phone: "+233241112223",
        ghanaCardNumber: "GHA-123456789-0",
        primaryCrop: "Maize",
        farmProfiles: [
          {
            id: "profile-1",
            farmName: "Sunrise Farm",
            locations: [
              {
                id: "loc-1",
                latitude: 5.6037,
                longitude: -0.187,
                isValidated: true,
              },
            ],
          },
        ],
      },
      submittedBy: {
        id: "agronomist-1",
      },
    });

    const response = await submissionDecisionPOST(
      new Request("http://localhost/api/submissions/submission-1/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVED" }),
      }),
      { params: Promise.resolve({ submissionId: "submission-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Decision recorded.");
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.farmerSubmission.updateMany).toHaveBeenCalledWith({
      where: { id: "submission-1", organizationId: "org-1" },
      data: expect.objectContaining({ status: "APPROVED", rejectionReason: null }),
    });
  });

  it("rejects submission successfully when rejection reason is provided", async () => {
    prismaMock.farmerSubmission.findFirst.mockResolvedValue({
      id: "submission-1",
      organizationId: "org-1",
      farmerId: "farmer-1",
      submittedById: "agronomist-1",
      status: "PENDING_REVIEW",
      farmer: {
        id: "farmer-1",
        fullName: "Kofi Mensah",
        phone: "+233241112223",
        ghanaCardNumber: null,
        primaryCrop: null,
        farmProfiles: [],
      },
      submittedBy: {
        id: "agronomist-1",
      },
    });

    const response = await submissionDecisionPOST(
      new Request("http://localhost/api/submissions/submission-1/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECTED", reason: "Ghana Card photo is blurry." }),
      }),
      { params: Promise.resolve({ submissionId: "submission-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Decision recorded.");
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.farmerSubmission.updateMany).toHaveBeenCalledWith({
      where: { id: "submission-1", organizationId: "org-1" },
      data: expect.objectContaining({ status: "REJECTED", rejectionReason: "Ghana Card photo is blurry." }),
    });
  });

  it("fails to reject submission when rejection reason is missing", async () => {
    prismaMock.farmerSubmission.findFirst.mockResolvedValue({
      id: "submission-1",
      organizationId: "org-1",
      farmerId: "farmer-1",
      submittedById: "agronomist-1",
      status: "PENDING_REVIEW",
      farmer: {
        id: "farmer-1",
        fullName: "Kofi Mensah",
        phone: "+233241112223",
        ghanaCardNumber: null,
        primaryCrop: null,
        farmProfiles: [],
      },
      submittedBy: {
        id: "agronomist-1",
      },
    });

    const response = await submissionDecisionPOST(
      new Request("http://localhost/api/submissions/submission-1/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECTED" }),
      }),
      { params: Promise.resolve({ submissionId: "submission-1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Rejection reason is required.");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
