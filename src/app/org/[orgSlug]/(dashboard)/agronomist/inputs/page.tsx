import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { InputsClient } from "@/components/agronomist/inputs-client";

export default async function AgronomistInputsPage() {
  const user = await requireRole(["admin", "agronomist", "ops"]);

  const farmerWhere: any = {};
  const plotWhere: any = {};
  const inputWhere: any = {};

  if (!user.roles.includes("admin") && !user.roles.includes("ops") && user.roles.includes("agronomist")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    farmerWhere.community = { districtId: { in: districtIds.length ? districtIds : ["__none__"] } };
    plotWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
    inputWhere.farmer = { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } };
  }

  const [inputs, farmers, plots] = await Promise.all([
    prisma.inputTraceability.findMany({
      where: inputWhere,
      include: {
        farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
        plot: true,
      },
      orderBy: [{ applicationDate: "desc" }, { createdAt: "desc" }],
      take: 400,
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
  ]);

  return (
    <InputsClient
      initialInputs={JSON.parse(JSON.stringify(inputs))}
      initialFarmers={JSON.parse(JSON.stringify(farmers))}
      initialPlots={JSON.parse(JSON.stringify(plots))}
    />
  );
}

