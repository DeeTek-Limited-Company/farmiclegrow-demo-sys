import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";

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
