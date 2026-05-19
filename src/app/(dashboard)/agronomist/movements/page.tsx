import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { MovementsClient } from "@/components/agronomist/movements-client";

export default async function AgronomistMovementsPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const batchWhere: any = {};
  const movementWhere: any = {
    orderId: null // Only show internal movements (not linked to an order)
  };

  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    batchWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    movementWhere.batch = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  const [batches, movements] = await Promise.all([
    prisma.batch.findMany({
      where: batchWhere,
      include: {
        farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 800,
    }),
    prisma.movementLog.findMany({
      where: movementWhere,
      include: {
        batch: {
          include: {
            farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
          },
        },
      },
      orderBy: { dispatchDate: "desc" },
      take: 500,
    }),
  ]);

  return (
    <MovementsClient
      initialBatches={JSON.parse(JSON.stringify(batches))}
      initialMovements={JSON.parse(JSON.stringify(movements))}
    />
  );
}

