import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  priceCents: z.number().int().min(0).optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  interval: z.enum(["month", "year"]).optional(),
  usersLimit: z.number().int().min(0).optional(),
  farmersLimit: z.number().int().min(0).optional(),
  batchesLimit: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { planId } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updated = await prisma.billingPlan.update({
    where: { id: planId },
    data: parsed.data,
  });

  await logAudit({
    action: "BILLING_PLAN_UPDATED",
    organizationId: auth.user.organizationId ?? undefined,
    userId: auth.user.id,
    details: { planId: updated.id, updates: Object.keys(parsed.data) },
    status: "SUCCESS",
  });

  return NextResponse.json({ plan: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const { planId } = await params;

  const updated = await prisma.billingPlan.update({
    where: { id: planId },
    data: { isActive: false },
  });

  await logAudit({
    action: "BILLING_PLAN_ARCHIVED",
    organizationId: auth.user.organizationId ?? undefined,
    userId: auth.user.id,
    details: { planId: updated.id, key: updated.key },
    status: "SUCCESS",
  });

  return NextResponse.json({ plan: updated });
}

