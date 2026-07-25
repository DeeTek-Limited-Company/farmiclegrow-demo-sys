import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";
import { requireOrgScope } from "@/lib/tenant/scope";

const updateUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  roleKey: z.string().min(1, "Role is required"),
});

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    // 1. Authorize: Only admins can edit users
    const auth = await requireApiRole(["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const organizationId = requireOrgScope(auth.user);

    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || undefined;

    // 2. Parse and validate input
    const body = await request.json().catch(() => null);
    const result = updateUserSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { fullName, email, roleKey } = result.data;
    const { userId } = await context.params;

    // Check if target user exists and belongs to the same organization
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    if (!targetUser || targetUser.organizationId !== organizationId) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Prevent admin from removing their own admin privileges to avoid lockout
    if (auth.user.id === userId && roleKey !== "admin") {
      return NextResponse.json(
        { message: "You cannot remove your own admin privileges." },
        { status: 400 }
      );
    }

    // 3. Verify role exists
    const role = await prisma.role.findUnique({
      where: { key: roleKey },
    });

    if (!role) {
      return NextResponse.json({ message: "Invalid role specified" }, { status: 400 });
    }

    // 4. Verify email uniqueness if it's changing
    const existingUserWithEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // 5. Update user and role in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          fullName,
          email,
        },
      });

      // Clear existing roles and assign the new one
      await tx.userRole.deleteMany({
        where: { userId },
      });

      await tx.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });

      return user;
    });

    await logAudit({
      action: "USER_UPDATED",
      organizationId,
      userId: auth.user.id,
      details: { targetUserId: userId, fullName, email, role: roleKey },
      ip,
      userAgent,
      status: "SUCCESS",
    });

    return NextResponse.json(
      { message: "User updated successfully", user: updatedUser },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    // 1. Authorize: Only admins can delete users
    const auth = await requireApiRole(["admin"]);
    if (!auth.ok) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const organizationId = requireOrgScope(auth.user);
    const { userId } = await context.params;

    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || undefined;

    // 2. Prevent self-deletion
    if (auth.user.id === userId) {
      return NextResponse.json(
        { message: "You cannot delete your own account." },
        { status: 400 }
      );
    }

    // 3. Find target user and verify organization match
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!targetUser || targetUser.organizationId !== organizationId) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // 4. Prevent deleting super_admin users
    const isSuperAdmin = targetUser.userRoles.some((ur) => ur.role.key === "super_admin");
    if (isSuperAdmin) {
      return NextResponse.json(
        { message: "Super admin accounts cannot be deleted." },
        { status: 403 }
      );
    }

    // 5. Clean up dependent records in a transaction and delete user
    await prisma.$transaction(async (tx) => {
      // Disassociate audit logs by nullifying userId to keep audit trail intact
      await tx.auditLog.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // Delete approval actions performed by this user
      await tx.approvalAction.deleteMany({
        where: { actorUserId: userId },
      });

      // Delete farmer submissions made by this user
      await tx.farmerSubmission.deleteMany({
        where: { submittedById: userId },
      });

      // Delete order messages sent by this user
      await tx.orderMessage.deleteMany({
        where: { senderId: userId },
      });

      // If farmer record exists with externalRef == userId, delete matching farmer
      await tx.farmer.deleteMany({
        where: { externalRef: userId, organizationId },
      });

      // Delete user (cascade deletes UserRole, Session, AgronomistDistrict, BuyerProfile, Notification)
      await tx.user.delete({
        where: { id: userId },
      });
    });

    await logAudit({
      action: "USER_DELETED",
      organizationId,
      userId: auth.user.id,
      details: { deletedUserId: userId, email: targetUser.email, fullName: targetUser.fullName },
      ip,
      userAgent,
      status: "SUCCESS",
    });

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

