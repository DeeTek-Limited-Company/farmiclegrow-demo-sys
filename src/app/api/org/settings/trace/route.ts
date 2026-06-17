import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";
import type { Prisma } from "@/generated/prisma/client";
import { requireOrgScope } from "@/lib/tenant/scope";

const updateSchema = z.object({
  publicTraceEnabled: z.boolean(),
  publicTracePolicy: z.record(z.string(), z.any()),
});

export async function PATCH(request: Request) {
  const auth = await requireApiRole(["admin"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  const organizationId = requireOrgScope(auth.user);

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        publicTraceEnabled: parsed.data.publicTraceEnabled,
        publicTracePolicy: parsed.data.publicTracePolicy as unknown as Prisma.InputJsonValue,
      },
    });

    await logAudit({
      action: "ORG_SETTINGS_UPDATED",
      userId: auth.user.id,
      organizationId,
      details: { 
        field: "publicTracePolicy",
        publicTraceEnabled: updated.publicTraceEnabled 
      },
      ip: request.headers.get("x-forwarded-for") || "127.0.0.1",
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({ 
      success: true, 
      publicTraceEnabled: updated.publicTraceEnabled,
      publicTracePolicy: updated.publicTracePolicy 
    });
  } catch (error) {
    console.error("Failed to update org settings:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
