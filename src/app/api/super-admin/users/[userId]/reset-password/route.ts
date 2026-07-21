import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { revokeSessionsForUser } from "@/lib/auth/session-db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { userId } = await params;

  try {
    const body = await request.json();
    const { newPassword, mustChangePassword = true } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, organizationId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: Boolean(mustChangePassword),
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });

    // Revoke all existing sessions for the target user
    await revokeSessionsForUser(userId);

    // Create Audit Log record
    await prisma.auditLog.create({
      data: {
        action: "SUPER_ADMIN_PASSWORD_RESET",
        userId: auth.user.id,
        organizationId: targetUser.organizationId,
        status: "SUCCESS",
        details: {
          targetUserId: targetUser.id,
          targetUserEmail: targetUser.email,
          targetUserName: targetUser.fullName,
          mustChangePassword: Boolean(mustChangePassword),
        },
      },
    });

    return NextResponse.json({
      message: "Password successfully reset.",
      user: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
      },
    });
  } catch (error) {
    console.error("Super Admin Password Reset Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
