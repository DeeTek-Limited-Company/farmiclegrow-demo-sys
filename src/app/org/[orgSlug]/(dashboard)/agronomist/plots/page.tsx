import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { FarmPlotsClient } from "@/components/agronomist/farm-plots-client";

export default async function AgronomistPlotsPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const whereClause: any = {};
  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const [plots, farmers] = await Promise.all([
    prisma.farmPlot.findMany({
      where: whereClause,
      include: {
        farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.farmer.findMany({
      where: user.roles.includes("admin") || user.roles.includes("ops") ? {} : whereClause.farmer,
      include: { community: { include: { district: { include: { region: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  return (
    <FarmPlotsClient
      initialPlots={JSON.parse(JSON.stringify(plots))}
      initialFarmers={JSON.parse(JSON.stringify(farmers))}
    />
  );
}
