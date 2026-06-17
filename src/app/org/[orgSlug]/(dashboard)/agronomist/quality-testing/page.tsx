import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { QualityTestingClient } from "@/components/agronomist/quality-testing-client";

export default async function AgronomistQualityTestingPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const harvestWhere: any = {};
  const testsWhere: any = {};

  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    harvestWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    testsWhere.harvest = { farmer: { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } };
  }

  const [harvests, tests] = await Promise.all([
    prisma.harvestRecord.findMany({
      where: harvestWhere,
      include: {
        farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
        plot: true,
      },
      orderBy: { harvestDate: "desc" },
      take: 600,
    }),
    prisma.qualityTest.findMany({
      where: testsWhere,
      include: {
        harvest: {
          include: {
            farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
            plot: true,
          },
        },
      },
      orderBy: { dateTested: "desc" },
      take: 400,
    }),
  ]);

  return (
    <QualityTestingClient
      initialHarvests={JSON.parse(JSON.stringify(harvests))}
      initialTests={JSON.parse(JSON.stringify(tests))}
    />
  );
}

