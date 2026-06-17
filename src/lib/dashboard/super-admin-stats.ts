import type { PlatformStats } from "@/components/super-admin/organization-manager";

export function buildPlatformStats(input: {
  orgCount: number;
  activeOrgCount: number;
  suspendedOrgCount: number;
  trialOrgCount: number;
  totalUsers: number;
  agronomists: number;
  farmers: number;
  totalRecords: number;
  totalHarvest: number;
  totalBatches: number;
  qrScans: number | null;
  failedLogins: number | null;
}): PlatformStats {
  return {
    organizations: {
      total: input.orgCount,
      active: input.activeOrgCount,
      suspended: input.suspendedOrgCount,
      trial: input.trialOrgCount,
    },
    users: {
      total: input.totalUsers,
      agronomists: input.agronomists,
      farmers: input.farmers,
    },
    production: {
      totalRecords: input.totalRecords,
      totalHarvest: input.totalHarvest,
    },
    traceability: {
      totalBatches: input.totalBatches,
      qrScans: input.qrScans,
    },
    security: {
      failedLogins: input.failedLogins,
    },
  };
}
