import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { logAudit } from "@/lib/security/audit";

const createListingSchema = z.object({
  batchId: z.string().cuid(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().optional().nullable(),
  price: z.coerce.number().positive(),
  currency: z.string().trim().min(3).max(3).default("USD"),
  status: z.enum(["DRAFT", "ACTIVE", "SOLD_OUT", "ARCHIVED"]).default("DRAFT"),
  images: z.array(z.string()).default([]),
  category: z.string().trim().optional().nullable(),
  tags: z.array(z.string().trim()).default([]),
  isFeatured: z.boolean().default(false),
  minOrderQuantity: z.coerce.number().nonnegative().optional().nullable(),
  unit: z.string().trim().optional().nullable(),
});

export async function GET(request: Request) {
  // Allow buyers to see active listings, others to see all
  const auth = await requireApiRole(["admin", "buyer", "ops", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as any;
  const category = url.searchParams.get("category");
  const featured = url.searchParams.get("featured") === "true";

  const whereClause: any = {};
  
  // If not admin/ops, only show ACTIVE listings
  if (!auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    whereClause.status = "ACTIVE";
  } else if (status) {
    whereClause.status = status;
  }

  if (category) whereClause.category = category;
  if (featured) whereClause.isFeatured = true;

  const listings = await prisma.marketplaceListing.findMany({
    where: whereClause,
    include: {
      batch: {
        include: {
          farmer: true,
          productionRecord: true,
        },
      },
    },
    orderBy: [
      { isFeatured: "desc" },
      { createdAt: "desc" },
    ],
    take: 100,
  });

  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  const payload = await request.json().catch(() => null);
  const parsed = createListingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { batchId, ...data } = parsed.data;

  // Verify batch exists and isn't already listed
  const existing = await prisma.marketplaceListing.findUnique({
    where: { batchId },
  });
  if (existing) {
    return NextResponse.json({ message: "This batch is already listed on the marketplace." }, { status: 409 });
  }

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
  });
  if (!batch) {
    return NextResponse.json({ message: "Batch not found." }, { status: 404 });
  }

  try {
    const listing = await prisma.marketplaceListing.create({
      data: {
        batchId,
        ...data,
      },
      include: {
        batch: true,
      },
    });

    await logAudit({
      action: "MARKETPLACE_LISTING_CREATED",
      userId: auth.user.id,
      details: { listingId: listing.id, batchId: listing.batchId },
      ip,
      userAgent,
    });

    return NextResponse.json({ listing }, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create marketplace listing", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
