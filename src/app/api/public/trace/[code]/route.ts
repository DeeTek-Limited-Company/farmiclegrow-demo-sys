import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
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

function toIso(value: Date) {
  return value.toISOString();
}

function normalizeCode(raw: string) {
  const trimmed = raw.trim();
  const withoutPrefix = trimmed.replace(/^\/?trace\/?/i, "");
  return withoutPrefix;
}

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const decoded = decodeURIComponent(rawCode);
  const code = normalizeCode(decoded);

  if (!code) {
    return withCors(NextResponse.json({ message: "Missing code." }, { status: 400 }));
  }

  const qrPath = `/trace/${code}`;

  const batch = await prisma.batch.findFirst({
    where: {
      OR: [{ batchId: code }, { qrCode: code }, { qrCode: qrPath }],
    },
    include: {
      farmer: {
        select: {
          cooperativeName: true,
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
    return withCors(NextResponse.json({ message: "Trace record not found." }, { status: 404 }));
  }

  const harvestRecords = await prisma.harvestRecord.findMany({
    where: { productionRecordId: batch.productionRecordId },
    include: { qualityTests: { orderBy: { dateTested: "asc" } } },
    orderBy: { harvestDate: "asc" },
  });

  const events: TraceEvent[] = [];

  events.push({
    type: "BATCH_CREATED",
    at: toIso(batch.createdAt),
    details: {
      batchId: batch.batchId,
      crop: batch.crop,
      quantity: Number(batch.quantity),
    },
  });

  for (const harvest of harvestRecords) {
    events.push({
      type: "HARVEST_RECORDED",
      at: toIso(harvest.harvestDate),
      details: {
        crop: harvest.crop,
        quantityHarvested: harvest.quantityHarvested ? Number(harvest.quantityHarvested) : null,
        initialQualityGrade: harvest.initialQualityGrade ?? null,
        supervisorApproved: harvest.supervisorApproved,
      },
    });

    for (const test of harvest.qualityTests) {
      events.push({
        type: "QUALITY_TEST",
        at: toIso(test.dateTested),
        details: {
          passed: test.passed,
          moisturePct: test.moisturePct ? Number(test.moisturePct) : null,
          foreignMatterPct: test.foreignMatterPct ? Number(test.foreignMatterPct) : null,
          brokenGrainPct: test.brokenGrainPct ? Number(test.brokenGrainPct) : null,
          aflatoxinTest: test.aflatoxinTest ?? null,
          colorGrade: test.colorGrade ?? null,
          pestDamage: test.pestDamage ?? null,
        },
      });
    }
  }

  for (const entry of batch.warehouseEntries) {
    events.push({
      type: "WAREHOUSE_IN",
      at: toIso(entry.dateIn),
      details: {
        warehouseName: entry.warehouseName,
        warehouseLocation: entry.warehouseLocation ?? null,
        quantityStored: entry.quantityStored ? Number(entry.quantityStored) : null,
        temperature: entry.temperature ? Number(entry.temperature) : null,
        humidity: entry.humidity ? Number(entry.humidity) : null,
        stackNumber: entry.stackNumber ?? null,
      },
    });

    if (entry.dateOut) {
      events.push({
        type: "WAREHOUSE_OUT",
        at: toIso(entry.dateOut),
        details: {
          warehouseName: entry.warehouseName,
          warehouseLocation: entry.warehouseLocation ?? null,
        },
      });
    }
  }

  for (const move of batch.movementLogs) {
    events.push({
      type: "DISPATCH",
      at: toIso(move.dispatchDate),
      details: {
        fromLocation: move.fromLocation,
        toLocation: move.toLocation,
        quantitySent: move.quantitySent ? Number(move.quantitySent) : null,
        driverName: move.driverName ?? null,
        vehicleNumber: move.vehicleNumber ?? null,
      },
    });

    if (move.arrivalDate) {
      events.push({
        type: "ARRIVAL",
        at: toIso(move.arrivalDate),
        details: {
          toLocation: move.toLocation,
          quantityReceived: move.quantityReceived ? Number(move.quantityReceived) : null,
          conditionOnArrival: move.conditionOnArrival ?? null,
        },
      });
    }
  }

  for (const sale of batch.salesRecords) {
    events.push({
      type: "SALE",
      at: toIso(sale.dateSold),
      details: {
        buyerName: sale.buyerName,
        buyerType: sale.buyerType ?? null,
        destination: sale.destination ?? null,
        quantitySold: sale.quantitySold ? Number(sale.quantitySold) : null,
        paymentStatus: sale.paymentStatus ?? null,
      },
    });
  }
  
  for (const milestone of batch.milestones) {
    events.push({
      type: "MILESTONE",
      at: toIso(milestone.timestamp),
      details: {
        milestoneType: milestone.type,
        status: milestone.status,
        location: milestone.location ?? null,
        notes: milestone.notes ?? null,
        performedBy: milestone.performedBy ?? null,
      },
    });
  }

  events.sort((a, b) => a.at.localeCompare(b.at));

  return withCors(
    NextResponse.json({
      trace: {
        code,
        batch: {
          batchId: batch.batchId,
          crop: batch.crop,
          harvestDate: toIso(batch.harvestDate),
          quantity: Number(batch.quantity),
          qrCode: batch.qrCode,
        },
        origin: {
          cooperativeName: batch.farmer.cooperativeName ?? null,
          community: batch.farmer.community?.name ?? null,
          district: batch.farmer.community?.district.name ?? null,
          region: batch.farmer.community?.district.region.name ?? null,
        },
        production: batch.productionRecord,
        events,
      },
    })
  );
}

