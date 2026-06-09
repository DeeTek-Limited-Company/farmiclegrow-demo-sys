import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ locationId: string }>;
};

const schema = z.object({
  isValidated: z.boolean(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { locationId } = await context.params;

  const location = await prisma.farmLocation.findUnique({
    where: { id: locationId },
    include: {
      farmProfile: {
        include: {
          farmer: {
            include: { community: true },
          },
        },
      },
    },
  });

  if (!location) {
    return NextResponse.json({ message: "Location not found" }, { status: 404 });
  }

  if (location.organizationId !== organizationId) {
    return NextResponse.json({ message: "Location not found" }, { status: 404 });
  }

  if (
    auth.user.roles.includes("agronomist") &&
    !auth.user.roles.includes("admin") &&
    !auth.user.roles.includes("ops")
  ) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { 
        agronomistId: auth.user.id,
        organizationId
      },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    const districtId = location.farmProfile.farmer.community?.districtId;
    if (!districtId || !districtIds.includes(districtId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedLocation = await tx.farmLocation.update({
      where: { id: locationId },
      data: { isValidated: parsed.data.isValidated },
    });

    await recomputeFarmerQualityScore(tx, location.farmProfile.farmerId);

    const farmerExternalRef = location.farmProfile.farmer.externalRef;
    if (farmerExternalRef) {
      await tx.notification.create({
        data: {
          organizationId,
          userId: farmerExternalRef,
          type: "SYSTEM",
          title: parsed.data.isValidated ? "Farm location verified" : "Farm location unverified",
          body: parsed.data.isValidated
            ? "Your farm GPS location has been validated."
            : "Your farm GPS location has been marked as unverified.",
          metadata: {
            farmerId: location.farmProfile.farmerId,
            locationId,
          },
        },
      });
    }

    return updatedLocation;
  });

  return NextResponse.json({ location: updated });
}
