import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";
import { recomputeFarmerQualityScore } from "@/lib/quality-score";
import { logAudit } from "@/lib/security/audit";
import { requireOrgScope } from "@/lib/tenant/scope";
import { cursorFindManyArgs, parseCursorPageParams, toCursorPage } from "@/lib/pagination/cursor";
import { checkPlanLimit } from "@/lib/billing/limits";

const locationSchema = z.object({
  region: z.string().optional(),
  district: z.string().optional(),
  community: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  address: z.string().optional(),
});

const cropsSchema = z.object({
  primaryCrop: z.string().trim().min(1),
  secondaryCrops: z.array(z.string().trim().min(1)).optional(),
});

function hasAllowedDocumentType(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("data:")) {
    const prefix = trimmed.slice(0, 80).toLowerCase();
    return (
      prefix.startsWith("data:application/pdf") ||
      prefix.startsWith("data:image/jpeg") ||
      prefix.startsWith("data:image/jpg") ||
      prefix.startsWith("data:image/png")
    );
  }

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.toLowerCase();
    const ext = pathname.split(".").pop() || "";
    return ["pdf", "jpg", "jpeg", "png"].includes(ext);
  } catch {
    return false;
  }
}

function hasAllowedImageType(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith("data:")) {
    const prefix = trimmed.slice(0, 80).toLowerCase();
    return (
      prefix.startsWith("data:image/jpeg") ||
      prefix.startsWith("data:image/jpg") ||
      prefix.startsWith("data:image/png")
    );
  }

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.toLowerCase();
    const ext = pathname.split(".").pop() || "";
    return ["jpg", "jpeg", "png"].includes(ext);
  } catch {
    return false;
  }
}

function preprocessPhone(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\s+/g, "").replace(/-/g, "");
}

const onboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.preprocess(preprocessPhone, z.string().regex(/^(?:(?:\+233|233|0)[235]\d{8})$/, "Invalid Ghana phone number")),
  cooperativeName: z.string().trim().max(200).optional().or(z.literal("")),
  gender: z.string().trim().max(40).optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  ghanaCardNumber: z
    .string()
    .regex(/^GHA-\d{9}-\d{1}$/, "Format must be GHA-XXXXXXXXX-X")
    .optional()
    .or(z.literal("")),
  ghanaCardPhotoUrl: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => (!v ? true : hasAllowedImageType(v)), "Ghana Card photo must be JPG/PNG (URL or data: URI)"),
  bio: z.string().trim().max(1000).optional().or(z.literal("")),
  districtId: z.string().cuid("Invalid districtId"),
  communityId: z.string().cuid("Invalid communityId"),
  
  farmName: z.string().trim().min(2).max(150),
  farmType: z.string().optional(),
  farmSize: z.coerce.number().positive().optional(),
  farmSizeUnit: z.enum(["acres", "hectares"]).optional(),
  ownershipType: z.enum(["Owned", "Rented", "Family"]).optional(),
  irrigationType: z.enum(["Rain-fed", "Irrigated", "Mixed"]).optional(),
  numberOfPlots: z.coerce.number().int().nonnegative().optional(),
  farmSitePhotoUrl: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => (!v ? true : hasAllowedImageType(v)), "Farm site photo must be JPG/PNG (URL or data: URI)"),
  
  location: locationSchema.optional(),
  
  crops: cropsSchema,
  
  certifications: z.array(z.object({
    name: z.string(),
    issuingBody: z.string().optional(),
    expiryDate: z.string().optional(),
    documentUrl: z
      .string()
      .optional()
      .or(z.literal(""))
      .refine((v) => (!v ? true : hasAllowedDocumentType(v)), "Document must be PDF/JPG/PNG (URL or data: URI)"),
  })).optional(),
});

function computeOnboardingQualityScore(data: z.infer<typeof onboardingSchema>) {
  let score = 0;

  if (data.fullName) score += 5;
  if (data.phone) score += 10;
  if (data.email && data.email.trim()) score += 5;
  if (data.gender && data.gender.trim()) score += 5;
  if (data.dateOfBirth) score += 5;
  if (data.ghanaCardNumber && data.ghanaCardNumber.trim()) score += 15;
  if (data.ghanaCardPhotoUrl && data.ghanaCardPhotoUrl.trim()) score += 10;
  if (data.bio && data.bio.trim()) score += 3;

  if (data.districtId) score += 5;
  if (data.communityId) score += 5;
  if (data.location?.latitude !== undefined && data.location?.longitude !== undefined) score += 10;

  if (data.farmName) score += 10;
  if (data.farmSize !== undefined) score += 10;
  if (data.farmSizeUnit) score += 3;
  if (data.ownershipType) score += 5;
  if (data.irrigationType) score += 5;
  if (data.numberOfPlots !== undefined) score += 4;
  if (data.farmSitePhotoUrl && data.farmSitePhotoUrl.trim()) score += 5;

  if (data.crops?.primaryCrop) score += 10;
  if ((data.crops?.secondaryCrops || []).length > 0) score += 3;

  if ((data.certifications || []).length > 0) score += 2;

  if (score > 100) score = 100;
  return score;
}

function toHectares(size: number | undefined, unit: "acres" | "hectares" | undefined) {
  if (size === undefined) return undefined;
  if (unit === "acres") return Number((size * 0.404686).toFixed(4));
  return size;
}

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist", "ops"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const url = new URL(request.url);
  const minimal = url.searchParams.get("minimal") === "1";
  const { limit, cursor } = parseCursorPageParams(request, {
    defaultLimit: minimal ? 500 : 100,
    maxLimit: minimal ? 2000 : 500,
  });

  const whereClause: any = { organizationId };
  if (actor.roles.includes("agronomist") && !actor.roles.includes("admin") && !actor.roles.includes("ops")) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: actor.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((a) => a.districtId);

    if (!districtIds.length) {
      return NextResponse.json(
        { message: "No districts assigned to this agronomist yet." },
        { status: 403 },
      );
    }

    whereClause.community = { districtId: { in: districtIds } };
  }

  if (minimal) {
    const farmersWithExtra = await prisma.farmer.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        phone: true,
        primaryCrop: true,
        community: {
          select: {
            name: true,
            district: {
              select: {
                name: true,
                region: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...cursorFindManyArgs({ limit, cursor }),
    });

    const { page: farmers, pageInfo } = toCursorPage(farmersWithExtra, limit);
    return NextResponse.json({ farmers, pageInfo });
  }

  const farmersWithExtra = await prisma.farmer.findMany({
    where: whereClause,
    include: {
      community: { include: { district: { include: { region: true } } } },
      farmProfiles: {
        include: { locations: true },
        orderBy: { createdAt: "desc" },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...cursorFindManyArgs({ limit, cursor }),
  });

  const { page: farmers, pageInfo } = toCursorPage(farmersWithExtra, limit);
  return NextResponse.json({ farmers, pageInfo });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const actor = auth.user;
  const organizationId = requireOrgScope(actor);

  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  const payload = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid onboarding payload.", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const farmersLimit = await checkPlanLimit(organizationId, "farmers");
  if (!farmersLimit.ok) {
    await logAudit({
      action: "BILLING_LIMIT_BLOCKED",
      organizationId,
      userId: actor.id,
      details: { resource: "farmers", reason: farmersLimit.reason, current: (farmersLimit as any).current, limit: (farmersLimit as any).limit },
      ip,
      userAgent,
      status: "FAILURE",
    });
    return NextResponse.json({ message: "Farmer limit reached for this subscription plan." }, { status: 403 });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
      const community = await tx.community.findFirst({
        where: { id: data.communityId, organizationId },
        include: { district: { include: { region: true } } },
      });
      if (!community) {
        throw new Error("COMMUNITY_NOT_FOUND");
      }
      if (community.districtId !== data.districtId) {
        throw new Error("COMMUNITY_MISMATCH");
      }

      if (actor.roles.includes("agronomist") && !actor.roles.includes("admin")) {
        const allowed = await tx.agronomistDistrict.findFirst({
          where: { agronomistId: actor.id, districtId: community.districtId, organizationId },
          select: { id: true },
        });
        if (!allowed) {
          throw new Error("DISTRICT_NOT_ASSIGNED");
        }
      }

      // Create the operational farmer record only. Farmers do not receive app logins.
      const hectares = toHectares(data.farmSize, data.farmSizeUnit);
      const farmer = await tx.farmer.create({
        data: {
          organizationId,
          fullName: data.fullName,
          email: data.email?.trim().toLowerCase() || null,
          phone: data.phone || null,
          gender: data.gender || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          ghanaCardNumber: data.ghanaCardNumber || null,
          cooperativeName: data.cooperativeName || null,
          bio: data.bio || null,
          communityId: community.id,
          primaryCrop: data.crops.primaryCrop,
          secondaryCrops: data.crops.secondaryCrops ?? [],
          farmProfiles: {
            create: {
              organizationId,
              farmName: data.farmName,
              farmType: data.farmType || null,
              farmSize: data.farmSize ?? null,
              farmSizeUnit: data.farmSizeUnit ?? null,
              ownershipType: data.ownershipType ?? null,
              irrigationType: data.irrigationType ?? null,
              numberOfPlots: data.numberOfPlots ?? null,
              totalAreaHectare: hectares ?? null,
              locations: {
                create: {
                  organizationId,
                  latitude: data.location?.latitude ?? null,
                  longitude: data.location?.longitude ?? null,
                  region: community.district.region.name,
                  district: community.district.name,
                  community: community.name,
                  address: data.location?.address || `${community.name}, ${community.district.name}, ${community.district.region.name}`.trim(),
                },
              },
            },
          },
          certifications: data.certifications?.length ? {
            create: data.certifications.map(c => ({
              organizationId,
              name: c.name,
              issuer: c.issuingBody || null,
              validTo: c.expiryDate ? new Date(c.expiryDate) : null,
              documentUrl: c.documentUrl ? c.documentUrl : null,
            }))
          } : undefined,
        },
        include: {
          farmProfiles: {
            include: { locations: true },
          },
        },
      });

      // Create the review submission for admin approval.
      const onboardingQuality = computeOnboardingQualityScore(data);
      const submission = await tx.farmerSubmission.create({
        data: {
          organizationId,
          farmerId: farmer.id,
          submittedById: actor.id,
          status: "PENDING_REVIEW",
          dataQualityScore: onboardingQuality,
        },
      });

      // Notify admins about the new farmer submission.
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
            title: "New farmer submission",
            body: `${farmer.fullName} has been submitted for admin review.`,
            metadata: {
              farmerId: farmer.id,
              submissionId: submission.id,
              submittedById: actor.id,
            },
          })),
        });
      }

      const documentsToCreate: Array<{ farmerId: string; type: string; name: string; url: string; status: string }> = [];
      const ghanaPhoto = (data.ghanaCardPhotoUrl || "").trim();
      if (ghanaPhoto) {
        documentsToCreate.push({ farmerId: farmer.id, type: "GHANA_CARD", name: "Ghana Card", url: ghanaPhoto, status: "UPLOADED" });
      }
      const farmPhoto = (data.farmSitePhotoUrl || "").trim();
      if (farmPhoto) {
        documentsToCreate.push({ farmerId: farmer.id, type: "FARM_IMAGE", name: "Farm Site Photo", url: farmPhoto, status: "UPLOADED" });
      }
      const certDocs = (data.certifications || [])
        .map((c) => ({ name: c.name, url: (c.documentUrl || "").trim() }))
        .filter((c) => c.url);
      for (const c of certDocs) {
        documentsToCreate.push({ farmerId: farmer.id, type: "CERTIFICATION", name: `Certification: ${c.name}`, url: c.url, status: "UPLOADED" });
      }
      if (documentsToCreate.length > 0) {
        await tx.document.createMany({
          data: documentsToCreate.map((doc) => ({ ...doc, organizationId })),
        });
      }

      return { farmer, submission };
      },
      {
        maxWait: 30_000,
        timeout: 30_000,
      },
    );

    void recomputeFarmerQualityScore(prisma, result.farmer.id).catch((error) => {
      console.error("RECOMPUTE_QUALITY_SCORE_ERROR", error);
    });

    await logAudit({
      action: "FARMER_CREATED",
      organizationId,
      userId: actor.id,
      details: {
        farmerId: result.farmer.id,
        submissionId: result.submission.id,
        districtId: data.districtId,
        communityId: data.communityId,
        farmerEmail: data.email?.trim().toLowerCase() || null,
      },
      ip,
      userAgent,
      status: "SUCCESS",
    });

    const docUrls = [
      (data.ghanaCardPhotoUrl || "").trim(),
      (data.farmSitePhotoUrl || "").trim(),
      ...(data.certifications?.map((c) => (c.documentUrl || "").trim()) ?? []),
    ].filter(Boolean);
    if (docUrls.length > 0) {
      await logAudit({
        action: "DOCUMENT_REGISTERED",
        organizationId,
        userId: actor.id,
        details: {
          farmerId: result.farmer.id,
          submissionId: result.submission.id,
          count: docUrls.length,
          urls: docUrls.slice(0, 10),
        },
        ip,
        userAgent,
        status: "SUCCESS",
      });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error(error);
    await logAudit({
      action: "FARMER_CREATED",
      organizationId,
      userId: actor.id,
      details: {
        error: error?.message || String(error),
        districtId: data.districtId,
        communityId: data.communityId,
      },
      ip,
      userAgent,
      status: "FAILURE",
    });
    if (error?.message === "COMMUNITY_NOT_FOUND") {
      return NextResponse.json({ message: "Community not found." }, { status: 400 });
    }
    if (error?.message === "COMMUNITY_MISMATCH") {
      return NextResponse.json({ message: "Selected community does not belong to the selected district." }, { status: 400 });
    }
    if (error?.message === "DISTRICT_NOT_ASSIGNED") {
      return NextResponse.json({ message: "You are not assigned to this district." }, { status: 403 });
    }
    if (error.code === "P2002") {
      return NextResponse.json({ message: "A farmer record already exists with one of the unique values provided." }, { status: 409 });
    }
    return NextResponse.json({ message: "Failed to create farmer record." }, { status: 500 });
  }
}
