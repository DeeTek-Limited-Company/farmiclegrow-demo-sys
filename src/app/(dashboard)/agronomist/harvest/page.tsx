import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { HarvestClient } from "@/components/agronomist/harvest-client";

export default async function AgronomistHarvestPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const farmerWhere: any = {};
  const plotWhere: any = {};
  const productionWhere: any = {};
  const harvestWhere: any = {};

  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    farmerWhere.community = { districtId: { in: districtIds.length ? districtIds : ["__none__"] } };
    plotWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    productionWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    harvestWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const [harvests, farmers, plots, productionRecords] = await Promise.all([
    prisma.harvestRecord.findMany({
      where: harvestWhere,
      include: {
        farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
        plot: true,
        productionRecord: true,
        qualityTests: { orderBy: { dateTested: "desc" }, take: 1 },
      },
      orderBy: { harvestDate: "desc" },
      take: 300,
    }),
    prisma.farmer.findMany({
      where: farmerWhere,
      include: { community: { include: { district: { include: { region: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 800,
    }),
    prisma.farmPlot.findMany({
      where: plotWhere,
      include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } },
      orderBy: { createdAt: "desc" },
      take: 1200,
    }),
    prisma.productionRecord.findMany({
      where: productionWhere,
      orderBy: { createdAt: "desc" },
      take: 1200,
    }),
  ]);

  return (
    <HarvestClient
      initialHarvests={JSON.parse(JSON.stringify(harvests))}
      initialFarmers={JSON.parse(JSON.stringify(farmers))}
      initialPlots={JSON.parse(JSON.stringify(plots))}
      initialProductionRecords={JSON.parse(JSON.stringify(productionRecords))}
    />
  );
}

