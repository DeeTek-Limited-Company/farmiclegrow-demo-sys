import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import {
  OrganizationManager,
  type SuperAdminOrganizationRow,
} from "@/components/super-admin/organization-manager";
import { buildPlatformStats } from "@/lib/dashboard/super-admin-stats";

export default async function SuperAdminDashboard() {
  await requireRole(["super_admin"]);

  const [
    organizations,
    orgCount,
    activeOrgCount,
    suspendedOrgCount,
    trialOrgCount,
    totalUsers,
    agronomists,
    farmers,
    productionAgg,
    totalBatches,
  ] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        publicTraceEnabled: true,
        subscriptionPlan: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            farmers: true,
            batches: true,
          },
        },
      },
    }),
    prisma.organization.count(),
    prisma.organization.count({ where: { status: "ACTIVE" } }),
    prisma.organization.count({ where: { status: "SUSPENDED" } }),
    prisma.organization.count({ where: { status: "TRIAL" } }),
    prisma.user.count(),
    prisma.user.count({
      where: {
        userRoles: {
          some: {
            role: {
              key: "agronomist",
            },
          },
        },
      },
    }),
    prisma.farmer.count(),
    prisma.productionRecord.aggregate({
      _count: { _all: true },
      _sum: { quantityTon: true },
    }),
    prisma.batch.count(),
  ]);

  const initialOrganizations: SuperAdminOrganizationRow[] = organizations.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }));

  const platformStats = buildPlatformStats({
    orgCount,
    activeOrgCount,
    suspendedOrgCount,
    trialOrgCount,
    totalUsers,
    agronomists,
    farmers,
    totalRecords: productionAgg._count._all,
    totalHarvest: Number(productionAgg._sum.quantityTon ?? 0),
    totalBatches,
    qrScans: null,
    failedLogins: null,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Platform overview</p>
        <h1 className="text-4xl font-black leading-none tracking-tight text-slate-900">Super Admin Console</h1>
        <p className="max-w-3xl text-sm font-medium text-slate-500 sm:text-base">
          Global management and monitoring for the FarmicleGrow ecosystem.
        </p>
      </div>

      <OrganizationManager
        initialOrganizations={initialOrganizations}
        platformStats={platformStats}
      />
    </div>
  );
}
