import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { passwordSchema } from "@/lib/validations/auth";
import { logAudit } from "@/lib/security/audit";

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().email(),
  password: passwordSchema,
});

export async function GET(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { orgId } = await params;

  try {
    const admins = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        userRoles: {
          some: {
            role: {
              key: "admin"
            }
          }
        }
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Failed to fetch tenant admins:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { orgId } = await params;

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    console.error("Validation failed for tenant admin creation:", parsed.error.format());
    return NextResponse.json(
      { 
        message: "Validation failed. Please ensure the password has at least 8 characters, one uppercase, one lowercase, one number, and one special character.", 
        errors: parsed.error.flatten().fieldErrors 
      },
      { status: 400 },
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true },
  });
  if (!organization) {
    return NextResponse.json({ message: "Organization not found." }, { status: 404 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return NextResponse.json({ message: "User with this email already exists." }, { status: 409 });
  }

  const adminRole = await prisma.role.findUnique({ where: { key: "admin" }, select: { id: true } });
  if (!adminRole) {
    return NextResponse.json({ message: "Admin role missing. Run prisma seed." }, { status: 500 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        organizationId: organization.id,
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
      },
      select: { id: true, email: true, fullName: true },
    });

    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });

    return user;
  });

  await logAudit({
    action: "USER_CREATED",
    organizationId: orgId,
    userId: auth.user.id,
    details: { 
      createdUserId: created.id, 
      email: created.email, 
      role: "admin",
      context: "TENANT_PROVISIONING" 
    },
    status: "SUCCESS",
  });

  return NextResponse.json({ user: created }, { status: 201 });
}

