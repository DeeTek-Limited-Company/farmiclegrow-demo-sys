import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { AgronomistProductionView } from "@/components/agronomist/agronomist-production-view";

export default async function ProductionRecordsPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const whereClause: any = {};
  const farmerWhere: any = {};
  const plotWhere: any = {};
  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    farmerWhere.community = { districtId: { in: districtIds.length ? districtIds : ["__none__"] } };
    plotWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const [records, farmers, plots, productionRecordsForSelect] = await Promise.all([
    prisma.productionRecord.findMany({
      where: whereClause,
      include: {
        farmer: true,
        farmProfile: true,
        plot: true,
        batches: true,
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.farmer.findMany({
      where: farmerWhere,
      include: { community: { include: { district: { include: { region: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 1200,
    }),
    prisma.farmPlot.findMany({
      where: plotWhere,
      include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.productionRecord.findMany({
      where: whereClause,
      include: { plot: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
  ]);

  const serialized = JSON.parse(JSON.stringify(records));

  return (
    <AgronomistProductionView
      initialRecords={serialized}
      initialFarmers={JSON.parse(JSON.stringify(farmers))}
      initialPlots={JSON.parse(JSON.stringify(plots))}
      initialProductionRecords={JSON.parse(JSON.stringify(productionRecordsForSelect))}
      currentUserName={user.name}
    />
  );
}
