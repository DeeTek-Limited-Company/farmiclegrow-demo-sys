import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { AuditAction, logAudit } from "@/lib/security/audit";
import { requireOrgScope } from "@/lib/tenant/scope";

const visibilitySchema = z.object({
  visibility: z.enum(["INHERIT", "PUBLIC", "PRIVATE", "LIMITED"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ batchId: string }> }
) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) return NextResponse.json({ message: auth.message }, { status: auth.status });

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const { batchId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = visibilitySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid visibility value" }, { status: 400 });
  }

  try {
    const batch = await prisma.batch.findFirst({
      where: { 
        batchId, 
        organizationId 
      },
      select: { id: true, batchId: true }
    });

    if (!batch) {
      return NextResponse.json({ message: "Batch not found" }, { status: 404 });
    }

    const updated = await prisma.batch.update({
      where: { id: batch.id },
      data: { publicTraceVisibility: parsed.data.visibility },
    });

    await logAudit({
      action: "BATCH_UPDATED_VISIBILITY",
      userId: actor.id,
      organizationId,


      details: { 
        batchId: batch.batchId,
        visibility: updated.publicTraceVisibility 
      },
      ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });

    return NextResponse.json({ success: true, visibility: updated.publicTraceVisibility });
  } catch (error) {
    console.error("Failed to update batch visibility:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
