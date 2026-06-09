import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops", "farmer"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const { batchId } = await context.params;

  const batch = await prisma.batch.findFirst({
    where: { batchId, organizationId },
    include: {
      farmer: true,
      productionRecord: true,
    },
  });

  if (!batch) {
    return NextResponse.json({ message: "Batch not found." }, { status: 404 });
  }

  if (auth.user.roles.includes("farmer")) {
    const farmer = await prisma.farmer.findFirst({
      where: { externalRef: actor.id, organizationId },
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
      where: { agronomistId: actor.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const farmer = await prisma.farmer.findFirst({
      where: { id: batch.farmerId, organizationId },
      select: { communityId: true },
    });
    const communityId = farmer?.communityId ?? null;
    const districtId = !communityId
      ? null
      : (await prisma.community.findFirst({
          where: { id: communityId, organizationId },
          select: { districtId: true },
        }))?.districtId ?? null;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
    }
  }

  return NextResponse.json({ batch });
}
