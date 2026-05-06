import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { passwordSchema } from "@/lib/validations/auth";
import { logAudit } from "@/lib/security/audit";

const userSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  roleKey: z.string().min(1, "Role is required"),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const result = userSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { message: "Invalid input", errors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { fullName, email, password, roleKey } = result.data;

  const role = await prisma.role.findUnique({
    where: { key: roleKey },
  });
  if (!role) {
    return NextResponse.json({ message: "Invalid role specified" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    return NextResponse.json({ message: "User with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
      },
    });

    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

    return user;
  });

  await logAudit({
    action: "USER_CREATED",
    userId: auth.user.id,
    details: { createdUserId: newUser.id, email: newUser.email, role: roleKey },
    ip,
    userAgent,
  });

  return NextResponse.json({ message: "User created successfully", userId: newUser.id }, { status: 201 });
}
