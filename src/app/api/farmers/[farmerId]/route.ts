import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";

const updateSchema = z.object({
  externalRef: z.string().trim().max(120).optional().or(z.literal("")),
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  gender: z.string().trim().max(40).optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  communityId: z.string().cuid().optional(),
  farmName: z.string().trim().min(2).max(150),
  primaryCrop: z.string().trim().max(120).optional().or(z.literal("")),
  secondaryCrops: z.array(z.string().trim().min(1)).optional(),
  farmSize: z.coerce.number().positive().optional(),
  farmSizeUnit: z.enum(["acres", "hectares"]).optional().or(z.literal("")),
  ownershipType: z.string().trim().max(120).optional().or(z.literal("")),
  irrigationType: z.string().trim().max(120).optional().or(z.literal("")),
  numberOfPlots: z.coerce.number().int().nonnegative().optional(),
  totalAreaHectare: z.coerce.number().positive().optional(),
  location: z
    .object({
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      address: z.string().trim().max(255).optional().or(z.literal("")),
    })
    .optional(),
});

type RouteContext = {
  params: Promise<{ farmerId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const url = new URL(_request.url);
  const includeTimeline = url.searchParams.get("includeTimeline") === "1";

  const { farmerId } = await context.params;

  const whereClause: any = { id: farmerId };
  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.community = { districtId: { in: districtIds.length ? districtIds : ["__none__"] } };
  }

  const farmer = await prisma.farmer.findFirst({
    where: whereClause,
    include: {
      community: { include: { district: { include: { region: true } } } },
      farmProfiles: {
        include: { locations: true },
        orderBy: { createdAt: "asc" },
      },
      submissions: {
        include: {
          approvalActions: {
            include: { actor: true },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { submittedAt: "desc" },
      },
      ...(includeTimeline
        ? {
            productionRecords: { orderBy: { createdAt: "desc" }, take: 20 },
            plantingActivities: {
              include: { plot: true, productionRecord: true },
              orderBy: { plantingDate: "desc" },
              take: 20,
            },
            fieldActivities: {
              include: { plot: true, productionRecord: true },
              orderBy: { activityDate: "desc" },
              take: 40,
            },
            inputTraceabilities: {
              include: { plot: true },
              orderBy: [{ applicationDate: "desc" }, { createdAt: "desc" }],
              take: 40,
            },
            harvestRecords: {
              include: { plot: true, productionRecord: true, qualityTests: { orderBy: { dateTested: "desc" }, take: 1 } },
              orderBy: { harvestDate: "desc" },
              take: 20,
            },
          }
        : {}),
    },
  });

  if (!farmer) {
    return NextResponse.json({ message: "Farmer not found or unauthorized." }, { status: 404 });
  }

  return NextResponse.json({ farmer });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { farmerId } = await context.params;
  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid farmer update payload.", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const whereClause: any = { id: farmerId };
  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.community = { districtId: { in: districtIds.length ? districtIds : ["__none__"] } };
  }

  const existing = await prisma.farmer.findFirst({
    where: whereClause,
    include: {
      farmProfiles: {
        include: { locations: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Farmer not found or unauthorized." }, { status: 404 });
  }

  const primaryProfile = existing.farmProfiles[0];
  const primaryLocation = primaryProfile?.locations[0];

  const updated = await prisma.$transaction(async (tx) => {
    const farmer = await tx.farmer.update({
      where: { id: farmerId },
      data: {
        externalRef: data.externalRef || null,
        fullName: data.fullName,
        phone: data.phone || null,
        gender: data.gender || null,
        bio: data.bio || null,
        communityId: data.communityId || undefined,
        ...(data.primaryCrop !== undefined ? { primaryCrop: data.primaryCrop || null } : {}),
        ...(data.secondaryCrops !== undefined ? { secondaryCrops: data.secondaryCrops } : {}),
      },
    });

    const profile =
      primaryProfile == null
        ? await tx.farmProfile.create({
            data: {
              farmerId: farmerId,
              farmName: data.farmName,
              farmSize: data.farmSize,
              farmSizeUnit: data.farmSizeUnit || null,
              ownershipType: data.ownershipType || null,
              irrigationType: data.irrigationType || null,
              numberOfPlots: data.numberOfPlots,
              totalAreaHectare: data.totalAreaHectare,
            },
          })
        : await tx.farmProfile.update({
            where: { id: primaryProfile.id },
            data: {
              farmName: data.farmName,
              farmSize: data.farmSize,
              farmSizeUnit: data.farmSizeUnit || null,
              ownershipType: data.ownershipType || null,
              irrigationType: data.irrigationType || null,
              numberOfPlots: data.numberOfPlots,
              totalAreaHectare: data.totalAreaHectare,
            },
          });

    if (data.location) {
      if (primaryLocation == null) {
        await tx.farmLocation.create({
          data: {
            farmProfileId: profile.id,
            latitude: data.location.latitude ?? null,
            longitude: data.location.longitude ?? null,
            address: data.location.address || null,
          },
        });
      } else {
        await tx.farmLocation.update({
          where: { id: primaryLocation.id },
          data: {
            latitude: data.location.latitude ?? null,
            longitude: data.location.longitude ?? null,
            address: data.location.address || null,
          },
        });
      }
    }

    await recomputeFarmerQualityScore(tx, farmerId);
    return farmer;
  });

  return NextResponse.json({ farmer: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const { farmerId } = await context.params;

  const whereClause: any = { id: farmerId };
  if (auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: auth.user.id },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.community = { districtId: { in: districtIds.length ? districtIds : ["__none__"] } };
  }

  const existing = await prisma.farmer.findFirst({
    where: whereClause,
    select: { id: true, externalRef: true },
  });

  if (!existing) {
    return NextResponse.json({ message: "Farmer not found or unauthorized." }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Manually cascade delete OrderItems related to the farmer's Batches
      // (This bypasses the need for a Prisma schema 'db push' which is failing on Supabase)
      const batches = await tx.batch.findMany({
        where: { farmerId: farmerId },
        select: { id: true }
      });
      
      const batchIds = batches.map((b) => b.id);
      if (batchIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { batchId: { in: batchIds } }
        });
      }

      // 2. Delete the Farmer record — Prisma cascades to:
      //   FarmProfile → FarmLocation
      //   ProductionRecord
      //   Certification
      //   FarmerSubmission → ApprovalAction
      await tx.farmer.delete({ where: { id: farmerId } });

      // Also delete the linked User account (login credentials)
      if (existing.externalRef) {
        const linkedUser = await tx.user.findUnique({
          where: { id: existing.externalRef },
        });
        if (linkedUser) {
          await tx.user.delete({ where: { id: existing.externalRef } });
        }
      }
    });

    return NextResponse.json({ message: "Farmer and all associated records deleted successfully." });
  } catch (error: any) {
    console.error("Failed to delete farmer:", error);
    return NextResponse.json({ message: error.message || "Failed to delete farmer due to database constraints." }, { status: 500 });
  }
}
