import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { PlantingClient } from "@/components/agronomist/planting-client";

export default async function AgronomistPlantingPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const farmerWhere: any = {};
  const activityWhere: any = {};
  const plotWhere: any = {};
  const productionWhere: any = {};

  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    farmerWhere.community = { districtId: { in: districtIds.length ? districtIds : ["__none__"] } };
    activityWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    plotWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    productionWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const [activities, farmers, plots, productionRecords] = await Promise.all([
    prisma.plantingActivity.findMany({
      where: activityWhere,
      include: {
        farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
        plot: true,
        productionRecord: true,
      },
      orderBy: { plantingDate: "desc" },
      take: 300,
    }),
    prisma.farmer.findMany({
      where: farmerWhere,
      include: { community: { include: { district: { include: { region: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 600,
    }),
    prisma.farmPlot.findMany({
      where: plotWhere,
      include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } },
      orderBy: { createdAt: "desc" },
      take: 600,
    }),
    prisma.productionRecord.findMany({
      where: productionWhere,
      include: { plot: true },
      orderBy: { createdAt: "desc" },
      take: 800,
    }),
  ]);

  return (
    <PlantingClient
      initialActivities={JSON.parse(JSON.stringify(activities))}
      initialFarmers={JSON.parse(JSON.stringify(farmers))}
      initialPlots={JSON.parse(JSON.stringify(plots))}
      initialProductionRecords={JSON.parse(JSON.stringify(productionRecords))}
      currentUserName={user.name}
    />
  );
}
