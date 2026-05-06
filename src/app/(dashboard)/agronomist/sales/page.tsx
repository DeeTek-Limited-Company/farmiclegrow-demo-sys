import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { SalesClient } from "@/components/agronomist/sales-client";

export default async function AgronomistSalesPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const batchWhere: any = {};
  const salesWhere: any = {};

  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    batchWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    salesWhere.batch = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  const [batches, sales] = await Promise.all([
    prisma.batch.findMany({
      where: batchWhere,
      include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } },
      orderBy: { createdAt: "desc" },
      take: 900,
    }),
    prisma.salesRecord.findMany({
      where: salesWhere,
      include: { batch: { include: { farmer: { include: { community: { include: { district: { include: { region: true } } } } } } } } },
      orderBy: { dateSold: "desc" },
      take: 500,
    }),
  ]);

  return (
    <SalesClient initialBatches={JSON.parse(JSON.stringify(batches))} initialSales={JSON.parse(JSON.stringify(sales))} />
  );
}

