import type { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/security/audit";
import { sanitizeBatchPublicTracePolicyInput } from "@/lib/trace/public-trace-policy";
import { requireOrgScope } from "@/lib/tenant/scope";

const updateBatchPublicTracePolicySchema = z.object({
  publicTracePolicyOverride: z.unknown(),
});

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const { batchId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateBatchPublicTracePolicySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  try {
    const batch = await prisma.batch.findFirst({
      where: {
        batchId,
        organizationId,
      },
      select: {
        id: true,
        batchId: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ message: "Batch not found" }, { status: 404 });
    }

    const publicTracePolicyOverride = sanitizeBatchPublicTracePolicyInput(
      parsed.data.publicTracePolicyOverride,
    );

    const updated = await prisma.batch.update({
      where: { id: batch.id },
      data: {
        publicTracePolicyOverride:
          publicTracePolicyOverride as unknown as Prisma.InputJsonValue,
      },
      select: {
        batchId: true,
        publicTracePolicyOverride: true,
      },
    });

    await logAudit({
      action: "BATCH_UPDATED_PUBLIC_TRACE_POLICY",
      userId: actor.id,
      organizationId,
      details: {
        batchId: updated.batchId,
        publicTracePolicyOverride: updated.publicTracePolicyOverride,
      },
      ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      publicTracePolicyOverride: updated.publicTracePolicyOverride,
    });
  } catch (error) {
    console.error("Failed to update batch public trace policy:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
