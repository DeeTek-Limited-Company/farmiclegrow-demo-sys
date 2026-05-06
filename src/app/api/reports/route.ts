import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/guards";

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function GET(request: Request) {
  const auth = await requireApiRole(["admin", "ops", "agronomist"]);
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") || "";
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  const today = new Date().toISOString().slice(0, 10);

  const districtIds =
    auth.user.roles.includes("agronomist") && !auth.user.roles.includes("admin") && !auth.user.roles.includes("ops")
      ? (await prisma.agronomistDistrict.findMany({
          where: { agronomistId: auth.user.id },
          select: { districtId: true },
        })).map((a) => a.districtId)
      : null;

  function withDistrictFilter(where: any, entityPath: (ids: string[]) => any) {
    if (!districtIds) return where;
    const ids = districtIds.length ? districtIds : ["__none__"];
    return { ...where, ...entityPath(ids) };
  }

  async function respond(rows: Array<Record<string, unknown>>, fileBaseName: string) {
    if (format === "xlsx" || format === "excel") {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Export");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
      const body = new Uint8Array(buffer);

      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileBaseName}-${today}.xlsx"`,
        },
      });
    }

    const csv = toCsv(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileBaseName}-${today}.csv"`,
      },
    });
  }

  if (kind === "farmers") {
    const farmers = await prisma.farmer.findMany({
      where: withDistrictFilter({}, (ids) => ({ community: { districtId: { in: ids } } })),
      include: {
        community: { include: { district: { include: { region: true } } } },
        farmProfiles: { include: { locations: true }, orderBy: { createdAt: "desc" }, take: 1 },
        submissions: { orderBy: { submittedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const rows = farmers.map((f) => {
      const profile = f.farmProfiles[0] || null;
      const loc = profile?.locations?.[0] || null;
      const canonicalCommunity = f.community || null;
      const canonicalDistrict = canonicalCommunity?.district || null;
      const canonicalRegion = canonicalDistrict?.region || null;
      const secondary =
        Array.isArray(f.secondaryCrops) ? f.secondaryCrops.filter(Boolean).join("; ") : null;
      return {
        farmerId: f.id,
        fullName: f.fullName,
        phone: f.phone,
        ghanaCardNumber: f.ghanaCardNumber,
        qualityScore: f.qualityScore,
        status: f.submissions[0]?.status,
        farmName: profile?.farmName,
        primaryCrop: f.primaryCrop,
        secondaryCrops: secondary,
        farmSize: profile?.farmSize?.toString(),
        farmSizeUnit: profile?.farmSizeUnit,
        ownershipType: profile?.ownershipType,
        irrigationType: profile?.irrigationType,
        numberOfPlots: profile?.numberOfPlots,
        totalAreaHectare: profile?.totalAreaHectare?.toString(),
        regionId: canonicalRegion?.id,
        region: canonicalRegion?.name || loc?.region,
        districtId: canonicalDistrict?.id,
        district: canonicalDistrict?.name || loc?.district,
        communityId: canonicalCommunity?.id,
        community: canonicalCommunity?.name || loc?.community,
        address: loc?.address,
        latitude: loc?.latitude?.toString(),
        longitude: loc?.longitude?.toString(),
        locationValidated: loc?.isValidated,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      };
    });

    return respond(rows, "farmers");
  }

  if (kind === "production") {
    const records = await prisma.productionRecord.findMany({
      where: withDistrictFilter({}, (ids) => ({ farmer: { community: { districtId: { in: ids } } } })),
      include: { farmer: true },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const rows = records.map((r) => ({
      productionRecordId: r.id,
      farmerId: r.farmerId,
      farmerName: r.farmer.fullName,
      season: r.season,
      cropType: r.cropType,
      status: r.status,
      plantingDate: r.plantingDate ? r.plantingDate.toISOString() : null,
      expectedHarvestDate: r.expectedHarvestDate ? r.expectedHarvestDate.toISOString() : null,
      actualHarvestDate: (r as any).actualHarvestDate
        ? new Date((r as any).actualHarvestDate).toISOString()
        : (r as any).harvestDate
          ? new Date((r as any).harvestDate).toISOString()
          : null,
      expectedYieldTon: r.expectedYieldTon?.toString(),
      quantityTon: r.quantityTon?.toString(),
      actualYieldTon: r.actualYieldTon?.toString(),
      farmSizeHectares: r.farmSizeHectares?.toString(),
      farmingMethod: r.farmingMethod,
      irrigationType: r.irrigationType,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return respond(rows, "production");
  }

  if (kind === "batches") {
    const batches = await prisma.batch.findMany({
      where: withDistrictFilter({}, (ids) => ({ farmer: { community: { districtId: { in: ids } } } })),
      include: { farmer: true },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const rows = batches.map((b) => ({
      batchId: b.batchId,
      crop: b.crop,
      quantityTon: b.quantity.toString(),
      harvestDate: b.harvestDate.toISOString(),
      farmerId: b.farmerId,
      farmerName: b.farmer.fullName,
      productionRecordId: b.productionRecordId,
      traceUrl: b.qrCode,
      createdAt: b.createdAt.toISOString(),
    }));

    return respond(rows, "batches");
  }

  if (kind === "inputs") {
    const inputs = await prisma.inputTraceability.findMany({
      where: withDistrictFilter({}, (ids) => ({ farmer: { community: { districtId: { in: ids } } } })),
      include: { farmer: true, plot: true },
      orderBy: [{ applicationDate: "desc" }, { createdAt: "desc" }],
      take: 20000,
    });

    const rows = inputs.map((i) => ({
      inputId: i.id,
      farmerId: i.farmerId,
      farmerName: i.farmer.fullName,
      plotId: i.plotId,
      plotName: i.plot.plotName,
      inputCategory: i.inputCategory,
      productName: i.productName,
      manufacturer: i.manufacturer,
      batchNumber: i.batchNumber,
      supplier: i.supplier,
      purchaseDate: i.purchaseDate ? i.purchaseDate.toISOString() : null,
      expiryDate: i.expiryDate ? i.expiryDate.toISOString() : null,
      quantityUsed: i.quantityUsed?.toString(),
      quantityUnit: i.quantityUnit,
      applicationDate: i.applicationDate ? i.applicationDate.toISOString() : null,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));

    return respond(rows, "inputs");
  }

  if (kind === "field-activities") {
    const activities = await prisma.fieldActivity.findMany({
      where: withDistrictFilter({}, (ids) => ({ farmer: { community: { districtId: { in: ids } } } })),
      include: { farmer: true, plot: true, productionRecord: true },
      orderBy: [{ activityDate: "desc" }, { createdAt: "desc" }],
      take: 20000,
    });

    const rows = activities.map((a) => ({
      fieldActivityId: a.id,
      farmerId: a.farmerId,
      farmerName: a.farmer.fullName,
      plotId: a.plotId,
      plotName: a.plot.plotName,
      productionRecordId: a.productionRecordId,
      productionSeason: a.productionRecord?.season ?? null,
      productionCrop: a.productionRecord?.cropType ?? null,
      activityType: a.activityType,
      activityDate: a.activityDate.toISOString(),
      labourUsed: a.labourUsed,
      inputUsed: a.inputUsed,
      quantityApplied: a.quantityApplied?.toString(),
      quantityUnit: a.quantityUnit,
      weatherCondition: a.weatherCondition,
      performedBy: a.performedBy,
      supervisorVerified: a.supervisorVerified,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    return respond(rows, "field-activities");
  }

  if (kind === "harvest-quality") {
    const harvests = await prisma.harvestRecord.findMany({
      where: withDistrictFilter({}, (ids) => ({ farmer: { community: { districtId: { in: ids } } } })),
      include: {
        farmer: true,
        plot: true,
        productionRecord: true,
        qualityTests: { orderBy: { dateTested: "desc" }, take: 1 },
      },
      orderBy: [{ harvestDate: "desc" }, { createdAt: "desc" }],
      take: 20000,
    });

    const rows = harvests.map((h) => {
      const qt = h.qualityTests[0] ?? null;
      return {
        harvestId: h.id,
        farmerId: h.farmerId,
        farmerName: h.farmer.fullName,
        plotId: h.plotId,
        plotName: h.plot.plotName,
        productionRecordId: h.productionRecordId,
        productionSeason: h.productionRecord?.season ?? null,
        productionCrop: h.productionRecord?.cropType ?? null,
        harvestDate: h.harvestDate.toISOString(),
        crop: h.crop,
        variety: h.variety,
        quantityHarvested: h.quantityHarvested?.toString(),
        unit: h.unit,
        harvestMethod: h.harvestMethod,
        initialQualityGrade: h.initialQualityGrade,
        moistureReading: h.moistureReading?.toString(),
        supervisorApproved: h.supervisorApproved,
        supervisorName: h.supervisorName,
        latestTestDate: qt?.dateTested ? qt.dateTested.toISOString() : null,
        latestTestPassed: qt?.passed ?? null,
        moisturePct: qt?.moisturePct?.toString() ?? null,
        foreignMatterPct: qt?.foreignMatterPct?.toString() ?? null,
        brokenGrainPct: qt?.brokenGrainPct?.toString() ?? null,
        colorGrade: qt?.colorGrade ?? null,
        pestDamage: qt?.pestDamage ?? null,
        aflatoxinTest: qt?.aflatoxinTest ?? null,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      };
    });

    return respond(rows, "harvest-quality");
  }

  if (kind === "location-validation") {
    const locations = await prisma.farmLocation.findMany({
      where: withDistrictFilter({}, (ids) => ({ farmProfile: { farmer: { community: { districtId: { in: ids } } } } })),
      include: {
        farmProfile: {
          include: {
            farmer: { include: { community: { include: { district: { include: { region: true } } } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20000,
    });

    const rows = locations.map((l) => {
      const farmer = l.farmProfile.farmer;
      const community = farmer.community;
      const district = community?.district;
      const region = district?.region;
      return {
        locationId: l.id,
        farmerId: farmer.id,
        farmerName: farmer.fullName,
        farmProfileId: l.farmProfileId,
        farmName: l.farmProfile.farmName,
        regionId: region?.id ?? null,
        region: region?.name ?? l.region ?? null,
        districtId: district?.id ?? null,
        district: district?.name ?? l.district ?? null,
        communityId: community?.id ?? null,
        community: community?.name ?? l.community ?? null,
        latitude: l.latitude?.toString(),
        longitude: l.longitude?.toString(),
        address: l.address,
        isValidated: l.isValidated,
        createdAt: l.createdAt.toISOString(),
      };
    });

    return respond(rows, "location-validation");
  }

  return NextResponse.json(
    { message: "Invalid kind. Use kind=farmers|production|batches|inputs|field-activities|harvest-quality|location-validation" },
    { status: 400 }
  );
}
