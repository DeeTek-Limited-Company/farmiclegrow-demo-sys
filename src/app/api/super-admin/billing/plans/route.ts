import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";

const planKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Z][A-Z0-9_]*$/, "Plan key must be uppercase and underscore-separated (e.g. PROFESSIONAL)");

const createSchema = z.object({
  key: planKeySchema,
  name: z.string().trim().min(2).max(80),
  priceCents: z.number().int().min(0),
  currency: z.string().trim().min(3).max(3).default("USD"),
  interval: z.enum(["month", "year"]).default("month"),
  usersLimit: z.number().int().min(0),
  farmersLimit: z.number().int().min(0),
  batchesLimit: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const plans = await prisma.billingPlan.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["super_admin"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const payload = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.billingPlan.create({
      data: {
        key: parsed.data.key,
        name: parsed.data.name,
        priceCents: parsed.data.priceCents,
        currency: parsed.data.currency,
        interval: parsed.data.interval,
        usersLimit: parsed.data.usersLimit,
        farmersLimit: parsed.data.farmersLimit,
        batchesLimit: parsed.data.batchesLimit,
        isActive: parsed.data.isActive ?? true,
      },
    });

    await logAudit({
      action: "BILLING_PLAN_CREATED",
      organizationId: auth.user.organizationId ?? undefined,
      userId: auth.user.id,
      details: { planId: created.id, key: created.key },
      status: "SUCCESS",
    });

    return NextResponse.json({ plan: created }, { status: 201 });
  } catch (error: any) {
    if (typeof error?.code === "string" && error.code === "P2002") {
      return NextResponse.json({ message: "Plan key already exists." }, { status: 409 });
    }
    console.error("Failed to create plan:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

