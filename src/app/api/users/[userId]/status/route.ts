import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";
import { requireOrgScope } from "@/lib/tenant/scope";
import { revokeSessionsForUser } from "@/lib/auth/session-db";

const statusSchema = z.object({
  isActive: z.boolean(),
});

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const organizationId = requireOrgScope(auth.user);

  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  const payload = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid status payload" }, { status: 400 });
  }

  const { userId } = await context.params;

  // Verify target user belongs to the same organization
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true }
  });

  if (!targetUser || targetUser.organizationId !== organizationId) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (userId === auth.user.id) {
    return NextResponse.json({ message: "You cannot deactivate your own account." }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: parsed.data.isActive },
    });

    if (!user.isActive) {
      await revokeSessionsForUser(user.id);
    }

    await logAudit({
      action: "USER_STATUS_TOGGLED",
      organizationId,
      userId: auth.user.id,
      details: { targetUserId: user.id, isActive: user.isActive },
      ip,
      userAgent,
      status: "SUCCESS",
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);
    await logAudit({
      action: "USER_STATUS_TOGGLED",
      organizationId,
      userId: auth.user.id,
      details: { targetUserId: userId, isActive: parsed.data.isActive, error: String(error) },
      ip,
      userAgent,
      status: "FAILURE",
    });
    return NextResponse.json({ message: "Failed to update user status." }, { status: 500 });
  }
}
