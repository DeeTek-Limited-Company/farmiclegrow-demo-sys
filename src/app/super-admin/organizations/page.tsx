import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { OrganizationManager, type SuperAdminOrganizationRow } from "@/components/super-admin/organization-manager";

export default async function OrganizationsRegistryPage() {
  await requireRole(["super_admin"]);

  const [organizations, orgCount, activeOrgCount, suspendedOrgCount, trialOrgCount] = await Promise.all([
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
  ]);

  const initialOrganizations: SuperAdminOrganizationRow[] = organizations.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }));

  const platformStats = {
    organizations: {
      total: orgCount,
      active: activeOrgCount,
      suspended: suspendedOrgCount,
      trial: trialOrgCount,
    },
    users: { total: 0, agronomists: 0, farmers: 0 }, // Not needed for this view
    production: { totalRecords: 0, totalHarvest: 0 },
    traceability: { totalBatches: 0, qrScans: 0 },
    security: { failedLogins: 0 }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Organization Registry</h1>
        <p className="text-slate-500 mt-1 font-medium">Global directory of all tenant organizations and their operational health.</p>
      </div>

      <OrganizationManager 
        initialOrganizations={initialOrganizations} 
        platformStats={platformStats}
      />
    </div>
  );
}
