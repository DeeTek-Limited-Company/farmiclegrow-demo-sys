import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { requireOrgScope } from "@/lib/tenant/scope";

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

const schema = z.object({
  status: z.enum(["UPLOADED", "MISSING", "NEEDS_REVIEW", "VERIFIED"]),
});

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { documentId } = await context.params;
  const doc = await prisma.document.findUnique({ 
    where: { id: documentId, organizationId } 
  });
  if (!doc) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedDoc = await tx.document.update({
      where: { id: documentId, organizationId },
      data: { status: parsed.data.status },
    });

    if (updatedDoc.farmerId) {
      await recomputeFarmerQualityScore(tx, updatedDoc.farmerId);
    }

    return updatedDoc;
  });

  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;
  await logAudit({
    action: "DOCUMENT_STATUS_UPDATED",
    userId: actor.id,
    details: { documentId: updated.id, farmerId: updated.farmerId, status: updated.status },
    ip,
    userAgent,
    status: "SUCCESS",
  });

  return NextResponse.json({ document: updated });
}
