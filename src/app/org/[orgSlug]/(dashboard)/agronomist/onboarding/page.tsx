import { requireRole } from "@/lib/auth/server";
import { OnboardingManager } from "@/components/agronomist/onboarding-manager";
import { prisma } from "@/lib/prisma";
import { requireOrgScope } from "@/lib/tenant/scope";

export default async function OnboardingPage() {
  const user = await requireRole(["admin", "agronomist"]);
  const organizationId = requireOrgScope(user);
  
  // Ownership Filtering: Agronomists only see their own submissions
  const whereClause = user.roles.includes("admin")
    ? { organizationId }
    : { organizationId, submissions: { some: { submittedById: user.id, organizationId } } };

  const farmers = await prisma.farmer.findMany({
    where: whereClause,
    include: {
      community: {
        include: { district: { include: { region: true } } }
      },
      certifications: true,
      farmProfiles: {
        include: { locations: true },
        orderBy: { createdAt: "desc" },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  
  const serializedFarmers = JSON.parse(JSON.stringify(farmers));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Register Farmer</h1>
        <p className="text-slate-500 mt-2 font-medium">
          Register new farmers and manage existing farmer records.
        </p>
      </div>

      <OnboardingManager initialRecords={serializedFarmers} view="all" />
    </div>
  );
}
