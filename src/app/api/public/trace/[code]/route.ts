import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, publicNotFound, publicOptions, publicRateLimited, withPublicCors } from "@/lib/public/http";

export async function OPTIONS(request: Request) {
  return publicOptions(request);
}

type TraceEvent =
  | { type: "BATCH_CREATED"; at: string; details: Record<string, unknown> }
  | { type: "HARVEST_RECORDED"; at: string; details: Record<string, unknown> }
  | { type: "QUALITY_TEST"; at: string; details: Record<string, unknown> }
  | { type: "WAREHOUSE_IN"; at: string; details: Record<string, unknown> }
  | { type: "WAREHOUSE_OUT"; at: string; details: Record<string, unknown> }
  | { type: "DISPATCH"; at: string; details: Record<string, unknown> }
  | { type: "ARRIVAL"; at: string; details: Record<string, unknown> }
  | { type: "SALE"; at: string; details: Record<string, unknown> }
  | { type: "MILESTONE"; at: string; details: Record<string, unknown> };

interface PublicTracePolicy {
  showFarmer?: boolean;
  anonymizeFarmer?: boolean;
  showCooperativeName?: boolean;
  showCommunityName?: boolean;
  showCertifications?: boolean;
  showQuality?: boolean;
  qualityPrecision?: "SUMMARY" | "FULL";
  showLogistics?: boolean;
  logisticsPrecision?: "COARSE" | "EXACT";
  showMedia?: boolean;
  datePrecision?: "MONTH" | "EXACT";
  showLocation?: boolean;
  locationPrecision?: "REGION" | "DISTRICT" | "COMMUNITY";
}

const DEFAULT_POLICY: PublicTracePolicy = {
  showFarmer: false,
  anonymizeFarmer: true,
  showCooperativeName: false,
  showCommunityName: false,
  showCertifications: false,
  showQuality: false,
  qualityPrecision: "SUMMARY",
  showLogistics: false,
  logisticsPrecision: "COARSE",
  showMedia: false,
  datePrecision: "MONTH",
  showLocation: true,
  locationPrecision: "REGION",
};

function formatDate(date: Date, precision: "MONTH" | "EXACT" = "MONTH") {
  if (precision === "EXACT") {
    return date.toISOString();
  }
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function normalizeCode(raw: string) {
  const trimmed = raw.trim();
  const withoutPrefix = trimmed.replace(/^\/?trace\/?/i, "");
  return withoutPrefix;
}

async function getPublicTraceResponse(request: Request, rawCode: string, slug?: string) {
  const ip = getClientIp(request);
  const global = rateLimit(`pub-trace-ip-${ip}`, 30, 60000);
  if (!global.success) {
    return publicRateLimited(request, { limit: 30, remaining: global.remaining, reset: global.reset });
  }

  let decoded = rawCode;
  try {
    decoded = decodeURIComponent(rawCode);
  } catch {}
  const code = normalizeCode(decoded);

  if (!code) return publicNotFound(request);
  if (!/^FG-\d{4}-[A-Z0-9]{4}-\d{4}$/i.test(code)) return publicNotFound(request);

  const perCode = rateLimit(`pub-trace-ipcode-${ip}-${code}`, 8, 60000);
  if (!perCode.success) {
    return publicRateLimited(request, { limit: 8, remaining: perCode.remaining, reset: perCode.reset });
  }

  const qrPath = `/trace/${code}`;

  const batch = await prisma.batch.findFirst({
    where: {
      OR: [{ batchId: code }, { qrCode: code }, { qrCode: qrPath }],
    },
    include: {
      organization: true,
      farmer: {
        select: {
          id: true,
          fullName: true,
          cooperativeName: true,
          primaryCrop: true,
          certifications: {
            select: {
              name: true,
              issuer: true,
              validFrom: true,
              validTo: true,
            },
          },
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
      },
      productionRecord: {
        select: {
          season: true,
          cropType: true,
          cropVariety: true,
          farmingMethod: true,
        },
      },
      movementLogs: { orderBy: { dispatchDate: "asc" } },
      warehouseEntries: { orderBy: { dateIn: "asc" } },
      salesRecords: { orderBy: { dateSold: "asc" } },
      milestones: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!batch) {
    return publicNotFound(request);
  }

  if (slug && batch.organization.slug !== slug) return publicNotFound(request);
  if (batch.organization.status !== "ACTIVE") return publicNotFound(request);
  if (batch.organization.publicTraceEnabled === false) return publicNotFound(request);
  if (batch.publicTraceVisibility === "PRIVATE") return publicNotFound(request);

  // Determine if Limited Mode is forced
  const isLimited = batch.publicTraceVisibility === "LIMITED";

  // Resolve Policy: Organization Config or fallback to Default, overridden if Limited Mode is active
  const policy: PublicTracePolicy = isLimited
    ? {
        showFarmer: false,
        showLocation: true,
        locationPrecision: "REGION",
        showCertifications: false,
        showQuality: false,
        showLogistics: false,
        showMedia: false,
        datePrecision: "MONTH",
      }
    : {
        ...DEFAULT_POLICY,
        ...((batch.organization.publicTracePolicy as Record<string, unknown>) || {}),
      };

  const datePrecision = policy.datePrecision ?? "MONTH";

  const harvestRecords = await prisma.harvestRecord.findMany({
    where: { productionRecordId: batch.productionRecordId, organizationId: batch.organizationId },
    include: { qualityTests: { orderBy: { dateTested: "asc" } } },
    orderBy: { harvestDate: "asc" },
  });

  const events: TraceEvent[] = [];

  events.push({
    type: "BATCH_CREATED",
    at: formatDate(batch.createdAt, datePrecision),
    details: {
      batchId: batch.batchId,
      crop: batch.crop,
      quantity: Number(batch.quantity),
    },
  });

  for (const harvest of harvestRecords) {
    events.push({
      type: "HARVEST_RECORDED",
      at: formatDate(harvest.harvestDate, datePrecision),
      details: {
        crop: harvest.crop,
        quantityHarvested: harvest.quantityHarvested ? Number(harvest.quantityHarvested) : null,
        initialQualityGrade: harvest.initialQualityGrade ?? null,
        supervisorApproved: harvest.supervisorApproved,
      },
    });

    // Conditionally include Quality Test details
    if (policy.showQuality) {
      for (const test of harvest.qualityTests) {
        const details: Record<string, unknown> = {
          passed: test.passed,
        };

        if (policy.qualityPrecision === "FULL") {
          details.moisturePct = test.moisturePct ? Number(test.moisturePct) : null;
          details.foreignMatterPct = test.foreignMatterPct ? Number(test.foreignMatterPct) : null;
          details.brokenGrainPct = test.brokenGrainPct ? Number(test.brokenGrainPct) : null;
          details.aflatoxinTest = test.aflatoxinTest ?? null;
          details.colorGrade = test.colorGrade ?? null;
          details.pestDamage = test.pestDamage ?? null;
        }

        events.push({
          type: "QUALITY_TEST",
          at: formatDate(test.dateTested, datePrecision),
          details,
        });
      }
    }
  }

  // Conditionally include Logistics events (Warehousing + Movements + Milestones + Sanitized Sales)
  if (policy.showLogistics) {
    for (const entry of batch.warehouseEntries) {
      events.push({
        type: "WAREHOUSE_IN",
        at: formatDate(entry.dateIn, datePrecision),
        details: {
          warehouseName: policy.logisticsPrecision === "EXACT" ? entry.warehouseName : "Authorized Warehouse",
          warehouseLocation: policy.logisticsPrecision === "EXACT" ? (entry.warehouseLocation ?? null) : null,
          quantityStored: entry.quantityStored ? Number(entry.quantityStored) : null,
          temperature: policy.logisticsPrecision === "EXACT" && entry.temperature ? Number(entry.temperature) : null,
          humidity: policy.logisticsPrecision === "EXACT" && entry.humidity ? Number(entry.humidity) : null,
          stackNumber: policy.logisticsPrecision === "EXACT" ? (entry.stackNumber ?? null) : null,
        },
      });

      if (entry.dateOut) {
        events.push({
          type: "WAREHOUSE_OUT",
          at: formatDate(entry.dateOut, datePrecision),
          details: {
            warehouseName: policy.logisticsPrecision === "EXACT" ? entry.warehouseName : "Authorized Warehouse",
            warehouseLocation: policy.logisticsPrecision === "EXACT" ? (entry.warehouseLocation ?? null) : null,
          },
        });
      }
    }

    for (const move of batch.movementLogs) {
      events.push({
        type: "DISPATCH",
        at: formatDate(move.dispatchDate, datePrecision),
        details: {
          fromLocation: policy.logisticsPrecision === "EXACT" ? move.fromLocation : "Origin Facility",
          toLocation: policy.logisticsPrecision === "EXACT" ? move.toLocation : "Destination Facility",
          quantitySent: move.quantitySent ? Number(move.quantitySent) : null,
          // Omit driverName and vehicleNumber to conform with "Always Private" list
          driverName: null,
          vehicleNumber: null,
        },
      });

      if (move.arrivalDate) {
        events.push({
          type: "ARRIVAL",
          at: formatDate(move.arrivalDate, datePrecision),
          details: {
            toLocation: policy.logisticsPrecision === "EXACT" ? move.toLocation : "Destination Facility",
            quantityReceived: move.quantityReceived ? Number(move.quantityReceived) : null,
            conditionOnArrival: move.conditionOnArrival ?? null,
          },
        });
      }
    }

    // Anonymized & Sanitized Sale events
    for (const sale of batch.salesRecords) {
      events.push({
        type: "SALE",
        at: formatDate(sale.dateSold, datePrecision),
        details: {
          // Strictly static destination to prevent buyer details exposure
          destination: policy.logisticsPrecision === "EXACT" ? (sale.destination ?? null) : "Export Market",
          quantitySold: sale.quantitySold ? Number(sale.quantitySold) : null,
          // Omit pricing, invoices, paymentStatus, buyerName (Always Private list)
          buyerName: null,
          buyerType: null,
          paymentStatus: null,
        },
      });
    }

    for (const milestone of batch.milestones) {
      events.push({
        type: "MILESTONE",
        at: formatDate(milestone.timestamp, datePrecision),
        details: {
          milestoneType: milestone.type,
          status: milestone.status,
          location: policy.logisticsPrecision === "EXACT" ? (milestone.location ?? null) : null,
          // Omit performedBy and notes (Always Private list)
          performedBy: null,
          notes: null,
        },
      });
    }
  }

  // Sort events chronologically. High-level strings compare correctly for ISO/Date formats
  events.sort((a, b) => a.at.localeCompare(b.at));

  // Build the Origin block according to location and precision rules
  const origin: Record<string, unknown> = {
    region: null,
    district: null,
    community: null,
    cooperativeName: null,
  };

  if (policy.showLocation !== false) {
    const precision = policy.locationPrecision ?? "REGION";
    const comm = batch.farmer.community;
    if (comm) {
      origin.region = comm.district?.region?.name ?? null;
      if ((precision === "DISTRICT" || precision === "COMMUNITY") && comm.district) {
        origin.district = comm.district.name;
      }
      if (precision === "COMMUNITY" && policy.showCommunityName) {
        origin.community = comm.name;
      }
    }
  }

  if (policy.showFarmer && policy.showCooperativeName !== false) {
    origin.cooperativeName = batch.farmer.cooperativeName ?? null;
  }

  // Build Farmer Details block
  let farmerDetails = null;
  if (policy.showFarmer) {
    let name = "Anonymized Farmer";
    if (policy.anonymizeFarmer !== false) {
      name = `Farmer ${batch.farmer.id.substring(0, 6).toUpperCase()}`;
    } else {
      name = batch.farmer.fullName;
    }
    farmerDetails = {
      name,
    };
  }

  // Build Certifications block
  let certifications = null;
  if (policy.showCertifications && batch.farmer.certifications) {
    certifications = batch.farmer.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer ?? null,
      validFrom: c.validFrom ? formatDate(c.validFrom, datePrecision) : null,
      validTo: c.validTo ? formatDate(c.validTo, datePrecision) : null,
    }));
  }

  // Build high-level clean production record
  const production = batch.productionRecord ? {
    season: batch.productionRecord.season,
    cropType: batch.productionRecord.cropType,
    cropVariety: batch.productionRecord.cropVariety ?? null,
    farmingMethod: batch.productionRecord.farmingMethod ?? null,
  } : null;

  return withPublicCors(
    request,
    NextResponse.json({
      trace: {
        code,
        organization: {
          id: batch.organization.id,
          slug: batch.organization.slug,
          name: batch.organization.name,
        },
        theme: null,
        batch: {
          batchId: batch.batchId,
          crop: batch.crop,
          harvestDate: formatDate(batch.harvestDate, datePrecision),
          quantity: Number(batch.quantity),
          qrCode: batch.qrCode,
        },
        origin,
        farmer: farmerDetails,
        certifications,
        production,
        events,
      },
    }),
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return getPublicTraceResponse(request, code);
}
