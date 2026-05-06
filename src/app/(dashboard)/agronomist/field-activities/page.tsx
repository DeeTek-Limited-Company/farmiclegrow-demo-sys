import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { FieldActivitiesClient } from "@/components/agronomist/field-activities-client";

export default async function AgronomistFieldActivitiesPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const farmerWhere: any = {};
  const plotWhere: any = {};
  const productionWhere: any = {};
  const activityWhere: any = {};

  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    farmerWhere.community = { districtId: { in: districtIds.length ? districtIds : ["__none__"] } };
    plotWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    productionWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    activityWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const [activities, farmers, plots, productionRecords] = await Promise.all([
    prisma.fieldActivity.findMany({
      where: activityWhere,
      include: {
        farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
        plot: true,
        productionRecord: true,
      },
      orderBy: { activityDate: "desc" },
      take: 400,
    }),
    prisma.farmer.findMany({
      where: farmerWhere,
      include: { community: { include: { district: { include: { region: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 700,
    }),
    prisma.farmPlot.findMany({
      where: plotWhere,
      include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } },
      orderBy: { createdAt: "desc" },
      take: 900,
    }),
    prisma.productionRecord.findMany({
      where: productionWhere,
      orderBy: { createdAt: "desc" },
      take: 900,
    }),
  ]);

  return (
    <FieldActivitiesClient
      initialActivities={JSON.parse(JSON.stringify(activities))}
      initialFarmers={JSON.parse(JSON.stringify(farmers))}
      initialPlots={JSON.parse(JSON.stringify(plots))}
      initialProductionRecords={JSON.parse(JSON.stringify(productionRecords))}
    />
  );
}

