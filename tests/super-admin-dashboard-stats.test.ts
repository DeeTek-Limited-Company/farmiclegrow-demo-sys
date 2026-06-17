import { describe, expect, it } from "vitest";
import { buildPlatformStats } from "@/lib/dashboard/super-admin-stats";

describe("super admin platform stats", () => {
  it("maps real aggregate values instead of placeholder zeros", () => {
    expect(
      buildPlatformStats({
        orgCount: 12,
        activeOrgCount: 9,
        suspendedOrgCount: 2,
        trialOrgCount: 1,
        totalUsers: 84,
        agronomists: 10,
        farmers: 320,
        totalRecords: 540,
        totalHarvest: 1840,
        totalBatches: 127,
        qrScans: null,
        failedLogins: null,
      }),
    ).toEqual({
      organizations: { total: 12, active: 9, suspended: 2, trial: 1 },
      users: { total: 84, agronomists: 10, farmers: 320 },
      production: { totalRecords: 540, totalHarvest: 1840 },
      traceability: { totalBatches: 127, qrScans: null },
      security: { failedLogins: null },
    });
  });
});
