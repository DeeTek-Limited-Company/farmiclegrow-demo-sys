type DateLike = Date | string | null | undefined;

type DecimalLike =
  | number
  | string
  | bigint
  | { toString(): string }
  | null
  | undefined;

type TraceBatchInput = {
  batchId: string;
  crop: string;
  quantity: DecimalLike;
  harvestDate: DateLike;
  createdAt: DateLike;
  updatedAt: DateLike;
  qrCode?: string | null;
  publicTraceVisibility?: string | null;
  organization: {
    name: string;
    slug: string;
  };
  farmer: {
    fullName: string;
    cooperativeName?: string | null;
    certificationStatus?: string | null;
    qualityScore?: number | null;
    community?: {
      name?: string | null;
      district?: {
        name?: string | null;
        region?: {
          name?: string | null;
        } | null;
      } | null;
    } | null;
    certifications?: Array<{
      id: string;
      name: string;
      issuer?: string | null;
      validFrom?: DateLike;
      validTo?: DateLike;
    }>;
    inputTraceabilities?: Array<Record<string, unknown>>;
  };
  productionRecord: {
    season: string;
    cropVariety?: string | null;
    farmingMethod?: string | null;
    status?: string | null;
    plantingDate?: DateLike;
    actualHarvestDate?: DateLike;
    expectedYieldTon?: DecimalLike;
    actualYieldTon?: DecimalLike;
    plotId?: string | null;
    plot?: {
      plotName?: string | null;
    } | null;
    plantingActivities?: Array<Record<string, unknown>>;
    fieldActivities?: Array<Record<string, unknown>>;
    harvestRecords?: Array<Record<string, unknown>>;
  };
  plantingActivities?: Array<Record<string, unknown>>;
  fieldActivities?: Array<Record<string, unknown>>;
  inputTraceabilities?: Array<Record<string, unknown>>;
  harvestRecords?: Array<Record<string, unknown>>;
  milestones?: Array<Record<string, unknown>>;
  warehouseEntries?: Array<Record<string, unknown>>;
  movementLogs?: Array<Record<string, unknown>>;
  salesRecords?: Array<Record<string, unknown>>;
};

type BuildInternalTraceViewModelInput = {
  batch: TraceBatchInput;
};

export type InternalTraceTimelineKind =
  | "planting"
  | "input"
  | "field_activity"
  | "harvest"
  | "quality"
  | "warehouse"
  | "milestone"
  | "movement"
  | "sale";

export type InternalTraceTimelineItem = {
  kind: InternalTraceTimelineKind;
  at: Date | null;
  title: string;
  detail: string;
};

function toDate(value: DateLike) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value: DecimalLike) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortByDate<T>(items: T[], getDate: (item: T) => DateLike) {
  return [...items].sort((left, right) => {
    const leftTime = toDate(getDate(left))?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = toDate(getDate(right))?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

function asArray<T>(value: T[] | undefined | null) {
  return Array.isArray(value) ? value : [];
}

function getPlantingActivities(batch: TraceBatchInput) {
  return batch.plantingActivities ?? batch.productionRecord.plantingActivities ?? [];
}

function getFieldActivities(batch: TraceBatchInput) {
  return batch.fieldActivities ?? batch.productionRecord.fieldActivities ?? [];
}

function getInputTraceabilities(batch: TraceBatchInput) {
  return batch.inputTraceabilities ?? batch.farmer.inputTraceabilities ?? [];
}

function getHarvestRecords(batch: TraceBatchInput) {
  return batch.harvestRecords ?? batch.productionRecord.harvestRecords ?? [];
}

export function buildInternalTraceViewModel({ batch }: BuildInternalTraceViewModelInput) {
  const plantingActivities = sortByDate(asArray(getPlantingActivities(batch)), (item) => item.plantingDate as DateLike).map(
    (item) => ({
      id: String(item.id),
      plantingDate: toDate(item.plantingDate as DateLike),
      cropType: String(item.cropType ?? batch.crop),
      varietyName: (item.varietyName as string | null | undefined) ?? null,
      seedSource: (item.seedSource as string | null | undefined) ?? null,
      seedBatchNumber: (item.seedBatchNumber as string | null | undefined) ?? null,
      seedQuantityUsed: toNumber(item.seedQuantityUsed as DecimalLike),
      spacingUsed: (item.spacingUsed as string | null | undefined) ?? null,
      germinationRate: toNumber(item.germinationRate as DecimalLike),
      fieldOfficerName: (item.fieldOfficerName as string | null | undefined) ?? null,
      plotName:
        ((item.plot as { plotName?: string | null } | undefined)?.plotName ?? null) ||
        batch.productionRecord.plot?.plotName ||
        null,
    }),
  );

  const fieldActivities = sortByDate(asArray(getFieldActivities(batch)), (item) => item.activityDate as DateLike).map((item) => ({
    id: String(item.id),
    activityType: String(item.activityType ?? "Field Activity"),
    activityDate: toDate(item.activityDate as DateLike),
    inputUsed: (item.inputUsed as string | null | undefined) ?? null,
    quantityApplied: toNumber(item.quantityApplied as DecimalLike),
    quantityUnit: (item.quantityUnit as string | null | undefined) ?? null,
    weatherCondition: (item.weatherCondition as string | null | undefined) ?? null,
    labourUsed: (item.labourUsed as string | null | undefined) ?? null,
    performedBy: (item.performedBy as string | null | undefined) ?? null,
    supervisorVerified: Boolean(item.supervisorVerified),
    notes: (item.notes as string | null | undefined) ?? null,
    plotName:
      ((item.plot as { plotName?: string | null } | undefined)?.plotName ?? null) ||
      batch.productionRecord.plot?.plotName ||
      null,
  }));

  const inputTraceabilities = sortByDate(
    asArray(getInputTraceabilities(batch)),
    (item) => (item.applicationDate as DateLike) ?? (item.createdAt as DateLike),
  ).map((item) => ({
    id: String(item.id),
    inputCategory: String(item.inputCategory ?? "Input"),
    productName: String(item.productName ?? "Unknown Input"),
    manufacturer: (item.manufacturer as string | null | undefined) ?? null,
    supplier: (item.supplier as string | null | undefined) ?? null,
    batchNumber: (item.batchNumber as string | null | undefined) ?? null,
    purchaseDate: toDate(item.purchaseDate as DateLike),
    expiryDate: toDate(item.expiryDate as DateLike),
    quantityUsed: toNumber(item.quantityUsed as DecimalLike),
    quantityUnit: (item.quantityUnit as string | null | undefined) ?? null,
    applicationDate: toDate(item.applicationDate as DateLike),
    plotName:
      ((item.plot as { plotName?: string | null } | undefined)?.plotName ?? null) ||
      batch.productionRecord.plot?.plotName ||
      null,
  }));

  const harvestRecords = sortByDate(asArray(getHarvestRecords(batch)), (item) => item.harvestDate as DateLike).map((item) => ({
    id: String(item.id),
    harvestDate: toDate(item.harvestDate as DateLike),
    crop: String(item.crop ?? batch.crop),
    variety: (item.variety as string | null | undefined) ?? null,
    quantityHarvested: toNumber(item.quantityHarvested as DecimalLike),
    unit: (item.unit as string | null | undefined) ?? null,
    harvestMethod: (item.harvestMethod as string | null | undefined) ?? null,
    harvestTeam: (item.harvestTeam as string | null | undefined) ?? null,
    initialQualityGrade: (item.initialQualityGrade as string | null | undefined) ?? null,
    moistureReading: toNumber(item.moistureReading as DecimalLike),
    supervisorApproved: Boolean(item.supervisorApproved),
    supervisorName: (item.supervisorName as string | null | undefined) ?? null,
    notes: (item.notes as string | null | undefined) ?? null,
    plotName:
      ((item.plot as { plotName?: string | null } | undefined)?.plotName ?? null) ||
      batch.productionRecord.plot?.plotName ||
      null,
    qualityTests: sortByDate(
      asArray(item.qualityTests as Array<Record<string, unknown>> | undefined),
      (test) => test.dateTested as DateLike,
    ).map((test) => ({
      id: String(test.id),
      dateTested: toDate(test.dateTested as DateLike),
      moisturePct: toNumber(test.moisturePct as DecimalLike),
      foreignMatterPct: toNumber(test.foreignMatterPct as DecimalLike),
      brokenGrainPct: toNumber(test.brokenGrainPct as DecimalLike),
      aflatoxinTest: (test.aflatoxinTest as string | null | undefined) ?? null,
      colorGrade: (test.colorGrade as string | null | undefined) ?? null,
      pestDamage: (test.pestDamage as string | null | undefined) ?? null,
      passed: Boolean(test.passed),
      testedBy: (test.testedBy as string | null | undefined) ?? null,
      notes: (test.notes as string | null | undefined) ?? null,
    })),
  }));

  const warehouseEntries = sortByDate(asArray(batch.warehouseEntries), (item) => item.dateIn as DateLike).map((item) => ({
    id: String(item.id),
    warehouseName: String(item.warehouseName ?? "Warehouse"),
    warehouseLocation: (item.warehouseLocation as string | null | undefined) ?? null,
    dateIn: toDate(item.dateIn as DateLike),
    dateOut: toDate(item.dateOut as DateLike),
    quantityStored: toNumber(item.quantityStored as DecimalLike),
    stackNumber: (item.stackNumber as string | null | undefined) ?? null,
    temperature: toNumber(item.temperature as DecimalLike),
    humidity: toNumber(item.humidity as DecimalLike),
  }));

  const movementLogs = sortByDate(asArray(batch.movementLogs), (item) => item.dispatchDate as DateLike).map((item) => ({
    id: String(item.id),
    fromLocation: String(item.fromLocation ?? "Origin"),
    toLocation: String(item.toLocation ?? "Destination"),
    dispatchDate: toDate(item.dispatchDate as DateLike),
    arrivalDate: toDate(item.arrivalDate as DateLike),
    quantitySent: toNumber(item.quantitySent as DecimalLike),
    quantityReceived: toNumber(item.quantityReceived as DecimalLike),
    driverName: (item.driverName as string | null | undefined) ?? null,
    vehicleNumber: (item.vehicleNumber as string | null | undefined) ?? null,
    conditionOnArrival: (item.conditionOnArrival as string | null | undefined) ?? null,
  }));

  const milestones = sortByDate(asArray(batch.milestones), (item) => item.timestamp as DateLike).map((item) => ({
    id: String(item.id),
    type: String(item.type ?? "Milestone"),
    status: String(item.status ?? "COMPLETED"),
    location: (item.location as string | null | undefined) ?? null,
    performedBy: (item.performedBy as string | null | undefined) ?? null,
    timestamp: toDate(item.timestamp as DateLike),
    notes: (item.notes as string | null | undefined) ?? null,
  }));

  const salesRecords = sortByDate(asArray(batch.salesRecords), (item) => item.dateSold as DateLike).map((item) => ({
    id: String(item.id),
    buyerName: String(item.buyerName ?? "Buyer"),
    buyerType: (item.buyerType as string | null | undefined) ?? null,
    quantitySold: toNumber(item.quantitySold as DecimalLike),
    pricePerUnit: toNumber(item.pricePerUnit as DecimalLike),
    totalValue: toNumber(item.totalValue as DecimalLike),
    destination: (item.destination as string | null | undefined) ?? null,
    paymentStatus: (item.paymentStatus as string | null | undefined) ?? null,
    dateSold: toDate(item.dateSold as DateLike),
  }));

  const timeline: InternalTraceTimelineItem[] = [
    ...plantingActivities.map((item) => ({
      kind: "planting" as const,
      at: item.plantingDate,
      title: `Planting${item.plotName ? ` · ${item.plotName}` : ""}`,
      detail: [item.seedSource, item.seedBatchNumber, item.spacingUsed].filter(Boolean).join(" · ") || item.cropType,
    })),
    ...inputTraceabilities.map((item) => ({
      kind: "input" as const,
      at: item.applicationDate ?? item.purchaseDate,
      title: item.productName,
      detail: [item.inputCategory, item.supplier, item.batchNumber].filter(Boolean).join(" · "),
    })),
    ...fieldActivities.map((item) => ({
      kind: "field_activity" as const,
      at: item.activityDate,
      title: item.activityType,
      detail:
        [item.inputUsed, item.performedBy, item.supervisorVerified ? "Supervisor verified" : null]
          .filter(Boolean)
          .join(" · ") || "Field activity recorded",
    })),
    ...harvestRecords.flatMap((item) => [
      {
        kind: "harvest" as const,
        at: item.harvestDate,
        title: `Harvest${item.plotName ? ` · ${item.plotName}` : ""}`,
        detail: [item.initialQualityGrade, item.supervisorApproved ? "Approved" : null].filter(Boolean).join(" · "),
      },
      ...item.qualityTests.map((test) => ({
        kind: "quality" as const,
        at: test.dateTested,
        title: "Quality Test",
        detail: [test.passed ? "Passed" : "Failed", test.aflatoxinTest].filter(Boolean).join(" · "),
      })),
    ]),
    ...warehouseEntries.map((item) => ({
      kind: "warehouse" as const,
      at: item.dateIn,
      title: item.warehouseName,
      detail: [item.warehouseLocation, item.stackNumber ? `Stack ${item.stackNumber}` : null].filter(Boolean).join(" · "),
    })),
    ...milestones.map((item) => ({
      kind: "milestone" as const,
      at: item.timestamp,
      title: item.type,
      detail: [item.status, item.location, item.notes].filter(Boolean).join(" · "),
    })),
    ...movementLogs.map((item) => ({
      kind: "movement" as const,
      at: item.dispatchDate,
      title: `${item.fromLocation} to ${item.toLocation}`,
      detail: [item.vehicleNumber, item.driverName, item.conditionOnArrival].filter(Boolean).join(" · "),
    })),
    ...salesRecords.map((item) => ({
      kind: "sale" as const,
      at: item.dateSold,
      title: item.buyerName,
      detail: [item.destination, item.paymentStatus].filter(Boolean).join(" · "),
    })),
  ].sort((left, right) => {
    const leftTime = left.at?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime = right.at?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });

  return {
    batchOverview: {
      batchId: batch.batchId,
      crop: batch.crop,
      quantity: toNumber(batch.quantity),
      harvestDate: toDate(batch.harvestDate),
      createdAt: toDate(batch.createdAt),
      updatedAt: toDate(batch.updatedAt),
      qrCode: batch.qrCode ?? null,
      publicTraceVisibility: batch.publicTraceVisibility ?? null,
      organization: batch.organization,
    },
    farmerProfile: {
      fullName: batch.farmer.fullName,
      cooperativeName: batch.farmer.cooperativeName ?? null,
      certificationStatus: batch.farmer.certificationStatus ?? null,
      qualityScore: batch.farmer.qualityScore ?? null,
      communityName: batch.farmer.community?.name ?? null,
      districtName: batch.farmer.community?.district?.name ?? null,
      regionName: batch.farmer.community?.district?.region?.name ?? null,
      certifications: asArray(batch.farmer.certifications),
    },
    productionTrust: {
      summary: {
        season: batch.productionRecord.season,
        cropVariety: batch.productionRecord.cropVariety ?? null,
        farmingMethod: batch.productionRecord.farmingMethod ?? null,
        status: batch.productionRecord.status ?? null,
        plantingDate: toDate(batch.productionRecord.plantingDate),
        actualHarvestDate: toDate(batch.productionRecord.actualHarvestDate),
        expectedYieldTon: toNumber(batch.productionRecord.expectedYieldTon),
        actualYieldTon: toNumber(batch.productionRecord.actualYieldTon),
      },
      plantingActivities,
      fieldActivities,
      inputTraceabilities,
    },
    harvestTrust: {
      harvestRecords,
    },
    postHarvest: {
      milestones,
      warehouseEntries,
      movementLogs,
    },
    commercial: {
      salesRecords,
    },
    timeline,
  };
}
