import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { WarehousingClient } from "@/components/agronomist/warehousing-client";

export default async function AgronomistWarehousingPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const batchWhere: any = {};
  const entryWhere: any = {};
  const harvestWhere: any = {};

  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    batchWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    entryWhere.batch = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
    harvestWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const [batches, entries, harvests] = await Promise.all([
    prisma.batch.findMany({
      where: batchWhere,
      include: {
        farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 900,
    }),
    prisma.warehouseEntry.findMany({
      where: entryWhere,
      include: {
        batch: { include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } } },
        harvest: true,
      },
      orderBy: { dateIn: "desc" },
      take: 500,
    }),
    prisma.harvestRecord.findMany({
      where: harvestWhere,
      include: { farmer: true, plot: true },
      orderBy: { harvestDate: "desc" },
      take: 800,
    }),
  ]);

  return (
    <WarehousingClient
      initialBatches={JSON.parse(JSON.stringify(batches))}
      initialEntries={JSON.parse(JSON.stringify(entries))}
      initialHarvests={JSON.parse(JSON.stringify(harvests))}
    />
  );
}

