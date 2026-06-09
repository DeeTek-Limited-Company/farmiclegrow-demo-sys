import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";
import { requireOrgScope } from "@/lib/tenant/scope";

const assignmentSchema = z.object({
  districtIds: z.array(z.string()),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const organizationId = requireOrgScope(auth.user);

  const { userId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = assignmentSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  try {
    // 1. Verify user belongs to same organization
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, organizationId }
    });
    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // 2. Perform replacement in transaction
    await prisma.$transaction([
      // Delete old assignments
      prisma.agronomistDistrict.deleteMany({
        where: { agronomistId: userId, organizationId }
      }),
      // Create new assignments
      prisma.agronomistDistrict.createMany({
        data: parsed.data.districtIds.map(districtId => ({
          agronomistId: userId,
          districtId,
          organizationId
        }))
      })
    ]);

    await logAudit({
      action: "AGRONOMIST_ASSIGNMENTS_UPDATED",
      userId: auth.user.id,
      organizationId,
      details: { 
        targetUserId: userId,
        districtCount: parsed.data.districtIds.length
      },
      ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update district assignments:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
