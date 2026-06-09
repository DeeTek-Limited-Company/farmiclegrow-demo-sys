import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase and hyphen-separated (e.g. acme-farms)");

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: slugSchema.optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL", "EXPIRED"]).optional(),
  publicTraceEnabled: z.boolean().optional(),
  subscriptionPlan: z.string().trim().min(2).max(40).optional(),
  subscriptionStatus: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { orgId } = await params;

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.slug) {
    const existing = await prisma.organization.findFirst({
      where: { slug: parsed.data.slug, NOT: { id: orgId } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ message: "Organization slug already exists." }, { status: 409 });
    }
  }

  if (parsed.data.subscriptionPlan) {
    const plan = await prisma.billingPlan.findUnique({
      where: { key: parsed.data.subscriptionPlan },
      select: { id: true, isActive: true },
    });
    if (!plan) {
      return NextResponse.json({ message: "Unknown billing plan." }, { status: 400 });
    }
    if (!plan.isActive) {
      return NextResponse.json({ message: "Cannot assign an archived billing plan." }, { status: 400 });
    }
  }

  const updateResult = await prisma.organization.updateMany({
    where: { id: orgId },
    data: parsed.data,
  });

  if (updateResult.count !== 1) {
    return NextResponse.json({ message: "Organization not found." }, { status: 404 });
  }

  // If status changed to something other than ACTIVE or TRIAL, revoke all sessions
  if (parsed.data.status && !["ACTIVE", "TRIAL"].includes(parsed.data.status)) {
    await prisma.session.updateMany({
      where: { organizationId: orgId, revoked: false },
      data: { revoked: true },
    });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      publicTraceEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await logAudit({
    action:
      parsed.data.subscriptionPlan || parsed.data.subscriptionStatus ? "ORG_SUBSCRIPTION_UPDATED" : "ORGANIZATION_UPDATED",
    organizationId: orgId, // Acting on this org
    userId: auth.user.id,
    details: { updates: Object.keys(parsed.data) },
    status: "SUCCESS",
  });

  return NextResponse.json({ organization });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { orgId } = await params;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, slug: true },
    });

    if (!organization) {
      return NextResponse.json({ message: "Organization not found." }, { status: 404 });
    }

    // Check if organization has data (to prevent accidental deletion of large tenants)
    const stats = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        _count: {
          select: {
            users: true,
            farmers: true,
            batches: true,
          },
        },
      },
    });

    if (stats && (stats._count.farmers > 0 || stats._count.batches > 0)) {
      return NextResponse.json(
        { message: "Cannot delete organization with active data. Suspend it instead." },
        { status: 400 }
      );
    }

    await prisma.organization.delete({
      where: { id: orgId },
    });

    await logAudit({
      action: "ORGANIZATION_UPDATED",
      organizationId: orgId,
      userId: auth.user.id,
      details: { name: organization.name, slug: organization.slug },
      status: "SUCCESS",
    });

    return NextResponse.json({ message: "Organization deleted successfully." });
  } catch (error) {
    console.error("Failed to delete organization:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
