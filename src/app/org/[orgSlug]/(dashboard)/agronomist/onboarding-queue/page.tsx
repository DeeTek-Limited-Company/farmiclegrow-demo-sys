import { requireRole } from "@/lib/auth/server";
import { OnboardingManager } from "@/components/agronomist/onboarding-manager";
import { prisma } from "@/lib/prisma";

export default async function OnboardingQueuePage() {
  const user = await requireRole(["admin", "agronomist"]);

  const whereClause = user.roles.includes("admin")
    ? {}
    : { submissions: { some: { submittedById: user.id } } };

  const farmers = await prisma.farmer.findMany({
    where: whereClause,
    include: {
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
        <h1 className="text-4xl font-black tracking-tight text-slate-900">Onboarding Queue</h1>
        <p className="text-slate-500 mt-2 font-medium">
          Review all farmer profiles currently in the onboarding and approval pipeline.
        </p>
      </div>

      <OnboardingManager initialRecords={serializedFarmers} view="queue" />
    </div>
  );
}
