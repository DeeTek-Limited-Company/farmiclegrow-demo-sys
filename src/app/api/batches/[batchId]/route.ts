import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops", "farmer"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { batchId } = await context.params;

  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: {
      farmer: true,
      productionRecord: true,
    },
  });

  if (!batch) {
    return NextResponse.json({ message: "Batch not found." }, { status: 404 });
  }

  if (auth.user.roles.includes("farmer")) {
    const farmer = await prisma.farmer.findUnique({
      where: { externalRef: auth.user.id },
      select: { id: true },
    });
    if (!farmer || farmer.id !== batch.farmerId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }
  }

  if (
    auth.user.roles.includes("agronomist") &&
    !auth.user.roles.includes("admin") &&
    !auth.user.roles.includes("ops")
  ) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const farmer = await prisma.farmer.findUnique({
      where: { id: batch.farmerId },
      include: { community: true },
    });
    const districtId = farmer?.community?.districtId;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }
  }

  return NextResponse.json({ batch });
}
