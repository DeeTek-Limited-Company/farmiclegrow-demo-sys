import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { logAudit } from "@/lib/security/audit";
import { requireOrgScope } from "@/lib/tenant/scope";

const certificationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  issuingBody: z.string().trim().max(200).optional().or(z.literal("")),
  expiryDate: z.string().optional(),
  documentUrl: z.string().trim().url().optional().or(z.literal("")),
});

const updateSchema = z.object({
  externalRef: z.string().trim().max(120).optional().or(z.literal("")),
  fullName: z.string().trim().min(2).max(150),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  gender: z.string().trim().max(40).optional().or(z.literal("")),
  cooperativeName: z.string().trim().max(200).optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  ghanaCardNumber: z.string().trim().max(64).optional().or(z.literal("")),
  ghanaCardPhotoUrl: z.string().trim().url().optional().or(z.literal("")),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  communityId: z.string().cuid().optional(),
  farmName: z.string().trim().min(2).max(150),
  farmType: z.string().trim().max(120).optional().or(z.literal("")),
  primaryCrop: z.string().trim().max(120).optional().or(z.literal("")),
  secondaryCrops: z.array(z.string().trim().min(1)).optional(),
  farmSize: z.coerce.number().positive().optional(),
  farmSizeUnit: z.enum(["acres", "hectares"]).optional().or(z.literal("")),
  ownershipType: z.string().trim().max(120).optional().or(z.literal("")),
  irrigationType: z.string().trim().max(120).optional().or(z.literal("")),
  numberOfPlots: z.coerce.number().int().nonnegative().optional(),
  totalAreaHectare: z.coerce.number().positive().optional(),
  farmSitePhotoUrl: z.string().trim().url().optional().or(z.literal("")),
  location: z
    .object({
      region: z.string().trim().max(120).optional().or(z.literal("")),
      district: z.string().trim().max(120).optional().or(z.literal("")),
      community: z.string().trim().max(120).optional().or(z.literal("")),
      latitude: z.coerce.number().min(-90).max(90).optional(),
      longitude: z.coerce.number().min(-180).max(180).optional(),
      address: z.string().trim().max(255).optional().or(z.literal("")),
    })
    .optional(),
  certifications: z.array(certificationSchema).optional(),
});

function toHectares(size: number | undefined, unit: "acres" | "hectares" | "" | undefined) {
  if (size === undefined) return undefined;
  if (unit === "acres") return Number((size * 0.404686).toFixed(4));
  return size;
}

function computeOnboardingQualityScore(data: z.infer<typeof updateSchema>) {
  let score = 0;

  if (data.email?.trim()) score += 5;
  if (data.dateOfBirth?.trim()) score += 5;
  if (data.ghanaCardNumber?.trim()) score += 15;
  if (data.ghanaCardPhotoUrl?.trim()) score += 10;
  if (data.cooperativeName?.trim()) score += 3;
  if (data.location?.latitude !== undefined && data.location?.longitude !== undefined) score += 15;
  if (data.location?.address?.trim()) score += 5;
  if (data.farmName?.trim()) score += 10;
  if (data.farmSize !== undefined) score += 10;
  if (data.primaryCrop?.trim()) score += 10;
  if (data.farmSitePhotoUrl?.trim()) score += 5;
  if ((data.secondaryCrops || []).length > 0) score += 5;
  if ((data.certifications || []).length > 0) score += 2;

  return Math.min(score, 100);
}

type RouteContext = {
  params: Promise<{ farmerId: string }>;
};

type OnboardingDocumentInput = {
  farmerId: string;
  type: string;
  name: string;
  url: string;
  status: string;
  organizationId: string;
};

type ResubmittedSubmissionSummary = {
  id: string;
  farmerId: string;
  status: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const url = new URL(_request.url);
  const includeTimeline = url.searchParams.get("includeTimeline") === "1";

  const { farmerId } = await context.params;

  const whereClause: any = { id: farmerId, organizationId };
  if (actor.roles.includes("agronomist") && !actor.roles.includes("admin") && !actor.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: actor.id, organizationId },
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

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

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

  const whereClause: any = { id: farmerId, organizationId };
  if (actor.roles.includes("agronomist") && !actor.roles.includes("admin")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: actor.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);
    whereClause.community = { districtId: { in: districtIds.length ? districtIds : ["__none__"] } };
  }

  const selectedCommunity = data.communityId
    ? await prisma.community.findFirst({
      where: { id: data.communityId, organizationId },
      select: {
        id: true,
        name: true,
        district: {
          select: {
            id: true,
            name: true,
            region: { select: { name: true } },
          },
        },
      },
    })
    : null;

  if (data.communityId && !selectedCommunity) {
      return NextResponse.json({ message: "Invalid communityId." }, { status: 400 });
  }

  const existing = await prisma.farmer.findFirst({
    where: whereClause,
    include: {
      farmProfiles: {
        include: { locations: true },
        orderBy: { createdAt: "asc" },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Farmer not found or unauthorized." }, { status: 404 });
  }

  const primaryProfile = existing.farmProfiles[0];
  const primaryLocation = primaryProfile?.locations[0];

  const updated = await prisma.$transaction(async (tx) => {
    const totalAreaHectare =
      data.totalAreaHectare !== undefined ? data.totalAreaHectare : toHectares(data.farmSize, data.farmSizeUnit);

    const farmerUpdate = await tx.farmer.updateMany({
      where: { id: farmerId, organizationId },
      data: {
        externalRef: data.externalRef || null,
        fullName: data.fullName,
        email: data.email?.trim().toLowerCase() || null,
        phone: data.phone || null,
        gender: data.gender || null,
        cooperativeName: data.cooperativeName || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        ghanaCardNumber: data.ghanaCardNumber || null,
        bio: data.bio || null,
        communityId: data.communityId || undefined,
        ...(data.primaryCrop !== undefined ? { primaryCrop: data.primaryCrop || null } : {}),
        ...(data.secondaryCrops !== undefined ? { secondaryCrops: data.secondaryCrops } : {}),
      },
    });

    if (farmerUpdate.count !== 1) {
      throw new Error("Farmer not found or unauthorized.");
    }

    const farmer = await tx.farmer.findFirst({
      where: { id: farmerId, organizationId },
    });

    if (!farmer) {
      throw new Error("Farmer not found or unauthorized.");
    }

    const profile =
      primaryProfile == null
        ? await tx.farmProfile.create({
            data: {
              organizationId: farmer.organizationId,
              farmerId,
              farmName: data.farmName,
              farmType: data.farmType || null,
              farmSize: data.farmSize,
              farmSizeUnit: data.farmSizeUnit || null,
              ownershipType: data.ownershipType || null,
              irrigationType: data.irrigationType || null,
              numberOfPlots: data.numberOfPlots,
              totalAreaHectare,
            },
          })
        : await (async () => {
            await tx.farmProfile.updateMany({
              where: { id: primaryProfile.id, organizationId },
              data: {
                farmName: data.farmName,
                farmType: data.farmType || null,
                farmSize: data.farmSize,
                farmSizeUnit: data.farmSizeUnit || null,
                ownershipType: data.ownershipType || null,
                irrigationType: data.irrigationType || null,
                numberOfPlots: data.numberOfPlots,
                totalAreaHectare,
              },
            });
            return tx.farmProfile.findFirst({ where: { id: primaryProfile.id, organizationId } });
          })();

    if (!profile) {
      throw new Error("Farm profile not found or unauthorized.");
    }

    if (data.location) {
      if (primaryLocation == null) {
        await tx.farmLocation.create({
          data: {
            organizationId: farmer.organizationId,
            farmProfileId: profile.id,
            latitude: data.location.latitude ?? null,
            longitude: data.location.longitude ?? null,
            region: selectedCommunity?.district.region.name || data.location.region || null,
            district: selectedCommunity?.district.name || data.location.district || null,
            community: selectedCommunity?.name || data.location.community || null,
            address:
              data.location.address ||
              [selectedCommunity?.name, selectedCommunity?.district.name, selectedCommunity?.district.region.name].filter(Boolean).join(", ") ||
              null,
          },
        });
      } else {
        await tx.farmLocation.updateMany({
          where: { id: primaryLocation.id, organizationId },
          data: {
            latitude: data.location.latitude ?? null,
            longitude: data.location.longitude ?? null,
            region: selectedCommunity?.district.region.name || data.location.region || null,
            district: selectedCommunity?.district.name || data.location.district || null,
            community: selectedCommunity?.name || data.location.community || null,
            address:
              data.location.address ||
              [selectedCommunity?.name, selectedCommunity?.district.name, selectedCommunity?.district.region.name].filter(Boolean).join(", ") ||
              null,
          },
        });
      }
    }

    if (data.certifications !== undefined) {
      await tx.certification.deleteMany({
        where: { farmerId, organizationId },
      });

      if (data.certifications.length > 0) {
        await tx.certification.createMany({
          data: data.certifications.map((certification) => ({
            organizationId,
            farmerId,
            name: certification.name,
            issuer: certification.issuingBody || null,
            validTo: certification.expiryDate ? new Date(certification.expiryDate) : null,
            documentUrl: certification.documentUrl || null,
          })),
        });
      }
    }

    const shouldSyncDocuments =
      data.ghanaCardPhotoUrl !== undefined || data.farmSitePhotoUrl !== undefined || data.certifications !== undefined;
    if (shouldSyncDocuments) {
      await tx.document.deleteMany({
        where: {
          farmerId,
          organizationId,
          type: { in: ["GHANA_CARD", "FARM_IMAGE", "CERTIFICATION"] },
        },
      });

      const documentsToCreate: OnboardingDocumentInput[] = [];
      const ghanaCardPhotoUrl = (data.ghanaCardPhotoUrl || "").trim();
      if (ghanaCardPhotoUrl) {
        documentsToCreate.push({
          organizationId,
          farmerId,
          type: "GHANA_CARD",
          name: "Ghana Card",
          url: ghanaCardPhotoUrl,
          status: "UPLOADED",
        });
      }

      const farmSitePhotoUrl = (data.farmSitePhotoUrl || "").trim();
      if (farmSitePhotoUrl) {
        documentsToCreate.push({
          organizationId,
          farmerId,
          type: "FARM_IMAGE",
          name: "Farm Site Photo",
          url: farmSitePhotoUrl,
          status: "UPLOADED",
        });
      }

      for (const certification of data.certifications || []) {
        const documentUrl = (certification.documentUrl || "").trim();
        if (!documentUrl) continue;
        documentsToCreate.push({
          organizationId,
          farmerId,
          type: "CERTIFICATION",
          name: `Certification: ${certification.name}`,
          url: documentUrl,
          status: "UPLOADED",
        });
      }

      if (documentsToCreate.length > 0) {
        await tx.document.createMany({ data: documentsToCreate });
      }
    }

    let resubmittedSubmission: ResubmittedSubmissionSummary | null = null;
    const latestSubmission = existing.submissions[0];
    if (latestSubmission?.status === "REJECTED") {
      resubmittedSubmission = await tx.farmerSubmission.create({
        data: {
          organizationId,
          farmerId,
          submittedById: actor.id,
          status: "PENDING_REVIEW",
          dataQualityScore: computeOnboardingQualityScore(data),
        },
        select: { id: true, farmerId: true, status: true },
      });

      const admins = await tx.userRole.findMany({
        where: { role: { key: "admin" }, user: { organizationId } },
        select: { userId: true },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            organizationId,
            userId: admin.userId,
            type: "SUBMISSION_CREATED",
            title: "Farmer submission resubmitted",
            body: `${data.fullName} was corrected and sent back for review.`,
            metadata: {
              farmerId,
              submissionId: resubmittedSubmission?.id,
              previousSubmissionId: latestSubmission.id,
              resubmittedById: actor.id,
            },
          })),
        });
      }
    }

    await recomputeFarmerQualityScore(tx, farmerId);
    return { farmer, resubmittedSubmission };
  });

  await logAudit({
    action: "FARMER_UPDATED",
    organizationId,
    userId: actor.id,
    details: {
      farmerId,
      updates: data,
      resubmittedSubmissionId: updated.resubmittedSubmission?.id ?? null,
    },
    status: "SUCCESS",
  });

  return NextResponse.json({ farmer: updated.farmer, resubmittedSubmission: updated.resubmittedSubmission });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiRole(["admin", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const { farmerId } = await context.params;

  const whereClause: any = { id: farmerId, organizationId };
  if (actor.roles.includes("agronomist") && !actor.roles.includes("admin")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: actor.id, organizationId },
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
        where: { farmerId: farmerId, organizationId },
        select: { id: true }
      });
      
      const batchIds = batches.map((b) => b.id);
      if (batchIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { batchId: { in: batchIds }, organizationId }
        });
      }

      // 2. Delete the Farmer record — Prisma cascades to:
      //   FarmProfile → FarmLocation
      //   ProductionRecord
      //   Certification
      //   FarmerSubmission → ApprovalAction
      await tx.farmer.deleteMany({ where: { id: farmerId, organizationId } });

      if (existing.externalRef) {
        const linkedUser = await tx.user.findFirst({
          where: { id: existing.externalRef, organizationId },
          include: { userRoles: { include: { role: true } } },
        });
        const isLegacyFarmerUser = linkedUser?.userRoles?.some((userRole) => userRole.role.key === "farmer");
        if (linkedUser && isLegacyFarmerUser) {
          await tx.user.deleteMany({ where: { id: existing.externalRef, organizationId } });
        }
      }
    });

    await logAudit({
      action: "FARMER_DELETED",
      organizationId,
      userId: actor.id,
      details: {
        farmerId,
        externalRef: existing.externalRef,
      },
      status: "SUCCESS",
    });

    return NextResponse.json({ message: "Farmer and all associated records deleted successfully." });
  } catch (error: any) {
    console.error("Failed to delete farmer:", error);

    await logAudit({
      action: "FARMER_DELETED",
      organizationId,
      userId: actor.id,
      details: {
        farmerId,
        error: error?.message || String(error),
      },
      status: "FAILURE",
    });

    return NextResponse.json({ message: error.message || "Failed to delete farmer due to database constraints." }, { status: 500 });
  }
}
