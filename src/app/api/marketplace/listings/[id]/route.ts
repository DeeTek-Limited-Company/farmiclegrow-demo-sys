import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";
import { requireOrgScope } from "@/lib/tenant/scope";

const updateListingSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().optional().nullable(),
  price: z.coerce.number().positive().optional(),
  currency: z.string().trim().min(3).max(3).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "SOLD_OUT", "ARCHIVED", "INACTIVE"]).optional(),
  images: z.array(z.string()).optional(),
  category: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim()).optional(),
  isFeatured: z.boolean().optional(),
  minOrderQuantity: z.coerce.number().nonnegative().optional().nullable(),
  unit: z.string().trim().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["admin", "buyer", "ops", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  const organizationId = requireOrgScope(auth.user);

  const { id } = await params;

  const listing = await prisma.marketplaceListing.findFirst({
    where: { id, organizationId },
    include: {
      batch: {
        include: {
          farmer: true,
          productionRecord: true,
        },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ message: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({ listing });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["admin", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  const organizationId = requireOrgScope(auth.user);

  const { id } = await params;
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  const payload = await request.json().catch(() => null);
  const parsed = updateListingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.marketplaceListing.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Listing not found" }, { status: 404 });
    }

    const updateResult = await prisma.marketplaceListing.updateMany({
      where: { id, organizationId },
      data: parsed.data,
    });

    if (updateResult.count !== 1) {
      return NextResponse.json({ message: "Listing not found" }, { status: 404 });
    }

    const listing = await prisma.marketplaceListing.findFirst({
      where: { id, organizationId },
    });

    if (!listing) {
      return NextResponse.json({ message: "Listing not found" }, { status: 404 });
    }

    await logAudit({
      action: "MARKETPLACE_LISTING_UPDATED",
      organizationId,
      userId: auth.user.id,
      details: { listingId: listing.id, updates: Object.keys(parsed.data) },
      ip,
      userAgent,
    });

    return NextResponse.json({ listing });
  } catch (error: any) {
    console.error("Failed to update marketplace listing", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(["admin", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }
  const organizationId = requireOrgScope(auth.user);

  const { id } = await params;
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  try {
    const existing = await prisma.marketplaceListing.findFirst({
      where: { id, organizationId },
      select: { id: true, batchId: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Listing not found" }, { status: 404 });
    }

    await prisma.marketplaceListing.deleteMany({
      where: { id, organizationId },
    });

    await logAudit({
      action: "MARKETPLACE_LISTING_DELETED",
      organizationId,
      userId: auth.user.id,
      details: { listingId: id, batchId: existing.batchId },
      ip,
      userAgent,
    });

    return NextResponse.json({ message: "Listing deleted" });
  } catch (error: any) {
    console.error("Failed to delete marketplace listing", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
