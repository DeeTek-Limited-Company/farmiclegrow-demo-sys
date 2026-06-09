import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { requireRole } from "@/lib/auth/server";
import { requireOrgScope } from "@/lib/tenant/scope";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  Factory,
  FileStack,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
  UserRound,
  Warehouse,
} from "lucide-react";
import { InternalTraceActions } from "@/components/trace/internal-trace-actions";
import { buildInternalTraceViewModel } from "@/lib/trace/internal-trace";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy");
}

function formatDecimal(value: unknown, suffix = "") {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toLocaleString()}${suffix}`;
}

type PageProps = {
  params: Promise<{ orgSlug: string; code: string }>;
};

export default async function InternalTracePage({ params }: PageProps) {
  const user = await requireRole(["admin", "agronomist", "ops", "farmer"]);
  const organizationId = requireOrgScope(user);
  const { orgSlug, code } = await params;

  if (user.organizationSlug !== orgSlug) {
    notFound();
  }

  const batch = await prisma.batch.findFirst({
    where: {
      batchId: decodeURIComponent(code),
      organizationId,
      organization: { slug: orgSlug },
    },
    include: {
      organization: true,
      marketplaceListing: true,
      farmer: {
        include: {
          certifications: true,
          community: {
            include: {
              district: {
                include: {
                  region: true,
                },
              },
            },
          },
        },
      },
      productionRecord: {
        include: {
          plot: {
            select: {
              plotName: true,
            },
          },
        },
      },
      milestones: {
        orderBy: { timestamp: "asc" },
      },
      warehouseEntries: {
        orderBy: { dateIn: "asc" },
      },
      movementLogs: {
        orderBy: { dispatchDate: "asc" },
      },
      salesRecords: {
        orderBy: { dateSold: "asc" },
      },
    },
  });

  if (!batch) {
    notFound();
  }

  if (user.roles.includes("farmer")) {
    const farmer = await prisma.farmer.findFirst({
      where: { externalRef: user.id, organizationId },
      select: { id: true },
    });
    if (!farmer || farmer.id !== batch.farmerId) {
      notFound();
    }
  }

  if (
    user.roles.includes("agronomist") &&
    !user.roles.includes("admin") &&
    !user.roles.includes("ops")
  ) {
    const assignments = await prisma.agronomistDistrict.findMany({
      where: { agronomistId: user.id, organizationId },
      select: { districtId: true },
    });
    const districtIds = assignments.map((item) => item.districtId);
    const districtId = batch.farmer.community?.districtId ?? null;

    if (!districtId || !districtIds.includes(districtId)) {
      notFound();
    }
  }

  const productionPlotId = batch.productionRecord.plotId ?? null;
  const productionWindowStart = batch.productionRecord.plantingDate ?? batch.createdAt;
  const productionWindowEnd = batch.productionRecord.actualHarvestDate ?? batch.harvestDate;

  const [plantingActivities, fieldActivities, inputTraceabilities, harvestRecords] = await Promise.all([
    prisma.plantingActivity.findMany({
      where: {
        organizationId,
        farmerId: batch.farmerId,
        OR: productionPlotId
          ? [{ productionRecordId: batch.productionRecordId }, { plotId: productionPlotId }]
          : [{ productionRecordId: batch.productionRecordId }],
      },
      include: {
        plot: {
          select: {
            plotName: true,
          },
        },
      },
      orderBy: { plantingDate: "asc" },
    }),
    prisma.fieldActivity.findMany({
      where: {
        organizationId,
        farmerId: batch.farmerId,
        OR: productionPlotId
          ? [{ productionRecordId: batch.productionRecordId }, { plotId: productionPlotId }]
          : [{ productionRecordId: batch.productionRecordId }],
      },
      include: {
        plot: {
          select: {
            plotName: true,
          },
        },
      },
      orderBy: { activityDate: "asc" },
    }),
    prisma.inputTraceability.findMany({
      where: {
        organizationId,
        farmerId: batch.farmerId,
        ...(productionPlotId ? { plotId: productionPlotId } : {}),
        OR: [
          {
            applicationDate: {
              gte: productionWindowStart,
              lte: productionWindowEnd,
            },
          },
          {
            applicationDate: null,
            createdAt: {
              gte: productionWindowStart,
              lte: batch.updatedAt,
            },
          },
        ],
      },
      include: {
        plot: {
          select: {
            plotName: true,
          },
        },
      },
      orderBy: [{ applicationDate: "asc" }, { createdAt: "asc" }],
    }),
    prisma.harvestRecord.findMany({
      where: {
        organizationId,
        farmerId: batch.farmerId,
        OR: productionPlotId
          ? [{ productionRecordId: batch.productionRecordId }, { plotId: productionPlotId }]
          : [{ productionRecordId: batch.productionRecordId }],
      },
      include: {
        plot: {
          select: {
            plotName: true,
          },
        },
        qualityTests: {
          orderBy: { dateTested: "asc" },
        },
      },
      orderBy: { harvestDate: "asc" },
    }),
  ]);

  const farmerLocation = [
    batch.farmer.community?.name,
    batch.farmer.community?.district?.name,
    batch.farmer.community?.district?.region?.name,
  ]
    .filter(Boolean)
    .join(", ");

  const traceView = buildInternalTraceViewModel({
    batch: {
      ...batch,
      plantingActivities,
      fieldActivities,
      inputTraceabilities,
      harvestRecords,
    },
  });

  const qualityTestCount = traceView.harvestTrust.harvestRecords.reduce(
    (sum, record) => sum + record.qualityTests.length,
    0,
  );

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <Button asChild variant="ghost" className="rounded-2xl font-bold text-slate-500 px-0">
            <Link href={`/org/${orgSlug}/agronomist/batches`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Batches
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Badge className="rounded-full bg-primary/10 text-primary border-0 font-black uppercase tracking-widest text-[10px]">
                Internal Trace
              </Badge>
              <Badge variant="outline" className="rounded-full font-black text-[10px] uppercase tracking-widest">
                {batch.publicTraceVisibility}
              </Badge>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{batch.batchId}</h1>
            <p className="text-slate-500 mt-2 max-w-3xl font-medium">
              Detailed app trace for {batch.crop}. This internal source-of-trust follows the crop from
              planting and field evidence through harvest, quality, warehousing, logistics, and sale.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="rounded-[2.5rem] border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-black">
                <PackageCheck className="w-5 h-5 text-primary" />
                Batch Overview
              </CardTitle>
              <CardDescription>Core batch identity and publication status.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Crop</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{batch.crop}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quantity</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{formatDecimal(batch.quantity, " Tons")}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Harvest Date</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{formatDate(batch.harvestDate)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Created</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{formatDate(batch.createdAt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Public QR Path</p>
                <p className="text-sm font-bold text-slate-900 mt-1 break-all">{batch.qrCode || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Marketplace</p>
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {batch.marketplaceListing ? batch.marketplaceListing.status : "Not listed"}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-[2.5rem] border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <UserRound className="w-5 h-5 text-primary" />
                  Farmer Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Name</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{batch.farmer.fullName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cooperative</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{batch.farmer.cooperativeName || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Location</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{farmerLocation || "—"}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Certification</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{batch.farmer.certificationStatus || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quality Score</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{batch.farmer.qualityScore}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <FileStack className="w-5 h-5 text-primary" />
                  Production Record
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Season</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {traceView.productionTrust.summary.season}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Variety</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {traceView.productionTrust.summary.cropVariety || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Farming Method</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {traceView.productionTrust.summary.farmingMethod || "—"}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {traceView.productionTrust.summary.status || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Planted</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {formatDate(traceView.productionTrust.summary.plantingDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Expected Yield</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {formatDecimal(traceView.productionTrust.summary.expectedYieldTon, " Tons")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actual Yield</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {formatDecimal(traceView.productionTrust.summary.actualYieldTon, " Tons")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="rounded-[2.5rem] border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  Planting Evidence
                </CardTitle>
                <CardDescription>Seed source, planting date, spacing, and germination records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {traceView.productionTrust.plantingActivities.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500">No planting activities recorded.</p>
                ) : (
                  traceView.productionTrust.plantingActivities.map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-900">
                        {activity.cropType}
                        {activity.plotName ? ` · ${activity.plotName}` : ""}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        Planted {formatDate(activity.plantingDate)}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-2">
                        {[activity.seedSource, activity.seedBatchNumber, activity.spacingUsed]
                          .filter(Boolean)
                          .join(" · ") || "Seed evidence pending"}
                      </p>
                      {activity.germinationRate !== null ? (
                        <p className="text-xs font-bold text-emerald-700 mt-2">
                          Germination {activity.germinationRate.toFixed(0)}%
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <FileStack className="w-5 h-5 text-primary" />
                  Field Activities
                </CardTitle>
                <CardDescription>Operational field work with verification and notes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {traceView.productionTrust.fieldActivities.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500">No field activities recorded.</p>
                ) : (
                  traceView.productionTrust.fieldActivities.map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-900">
                        {activity.activityType}
                        {activity.supervisorVerified ? " · Verified" : ""}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {activity.plotName ? `${activity.plotName} · ` : ""}
                        {formatDate(activity.activityDate)}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-2">
                        {[activity.inputUsed, activity.performedBy].filter(Boolean).join(" · ") || "No extra detail"}
                      </p>
                      {activity.notes ? (
                        <p className="text-xs font-medium text-slate-500 mt-2">{activity.notes}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <Boxes className="w-5 h-5 text-primary" />
                  Input Traceability
                </CardTitle>
                <CardDescription>Products, suppliers, batch numbers, and application evidence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {traceView.productionTrust.inputTraceabilities.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500">No input traceability records found.</p>
                ) : (
                  traceView.productionTrust.inputTraceabilities.map((input) => (
                    <div key={input.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-900">
                        {input.productName}
                        <span className="text-slate-400"> · {input.inputCategory}</span>
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {input.plotName ? `${input.plotName} · ` : ""}
                        {input.applicationDate ? `Applied ${formatDate(input.applicationDate)}` : "Application date pending"}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-2">
                        {[input.supplier, input.batchNumber].filter(Boolean).join(" · ") || "Supplier detail pending"}
                      </p>
                      {input.quantityUsed !== null ? (
                        <p className="text-xs font-bold text-slate-700 mt-2">
                          {input.quantityUsed.toLocaleString()}
                          {input.quantityUnit ? ` ${input.quantityUnit}` : ""}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[2.5rem] border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Harvest and Quality Trust
              </CardTitle>
              <CardDescription>Harvest evidence, approvals, moisture readings, and quality tests.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {traceView.harvestTrust.harvestRecords.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">No harvest records attached to this trace.</p>
              ) : (
                traceView.harvestTrust.harvestRecords.map((record) => (
                  <div key={record.id} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {record.crop}
                          {record.plotName ? ` · ${record.plotName}` : ""}
                          {record.supervisorApproved ? " · Approved" : ""}
                        </p>
                        <p className="text-xs font-medium text-slate-500 mt-1">
                          Harvested {formatDate(record.harvestDate)}
                        </p>
                        <p className="text-xs font-medium text-slate-600 mt-2">
                          {[record.initialQualityGrade, record.harvestMethod, record.harvestTeam]
                            .filter(Boolean)
                            .join(" · ") || "Harvest evidence recorded"}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-sm font-black text-slate-900">
                          {formatDecimal(record.quantityHarvested, record.unit ? ` ${record.unit}` : "")}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          Moisture {record.moistureReading !== null ? record.moistureReading.toFixed(1) : "—"}
                        </p>
                      </div>
                    </div>

                    {record.qualityTests.length > 0 ? (
                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {record.qualityTests.map((test) => (
                          <div key={test.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Quality Test</p>
                            <p className="text-sm font-black text-slate-900 mt-2">
                              {test.passed ? "Passed" : "Failed"}
                              {test.aflatoxinTest ? ` · ${test.aflatoxinTest}` : ""}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-1">
                              Tested {formatDate(test.dateTested)}
                            </p>
                            <p className="text-xs font-medium text-slate-600 mt-2">
                              Moisture {test.moisturePct ?? "—"} · Foreign Matter {test.foreignMatterPct ?? "—"} · Broken Grain{" "}
                              {test.brokenGrainPct ?? "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Milestones
              </CardTitle>
              <CardDescription>Internal operational milestones for this batch.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {traceView.postHarvest.milestones.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">No milestones recorded yet.</p>
              ) : (
                traceView.postHarvest.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900">{milestone.type}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {milestone.location || "No location"} · {formatDate(milestone.timestamp)}
                      </p>
                      {milestone.notes ? (
                        <p className="text-xs font-medium text-slate-600 mt-2">{milestone.notes}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="rounded-full font-black uppercase tracking-widest text-[10px]">
                      {milestone.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <CalendarDays className="w-5 h-5 text-primary" />
                Trust Timeline
              </CardTitle>
              <CardDescription>Chronological source-of-trust from planting to sale.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {traceView.timeline.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">No timeline events recorded yet.</p>
              ) : (
                traceView.timeline.map((item, index) => (
                  <div key={`${item.kind}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {item.title}
                          <span className="ml-2 text-slate-400 uppercase text-[10px] tracking-[0.2em]">
                            {item.kind.replaceAll("_", " ")}
                          </span>
                        </p>
                        <p className="text-xs font-medium text-slate-600 mt-1">{item.detail || "Operational evidence recorded"}</p>
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                        {formatDate(item.at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-[2.5rem] border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <Warehouse className="w-5 h-5 text-primary" />
                  Warehousing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {traceView.postHarvest.warehouseEntries.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500">No warehouse entries recorded.</p>
                ) : (
                  traceView.postHarvest.warehouseEntries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-900">{entry.warehouseName}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {entry.warehouseLocation || "No location"} · In {formatDate(entry.dateIn)}
                        {entry.dateOut ? ` · Out ${formatDate(entry.dateOut)}` : ""}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-2">
                        Stored {formatDecimal(entry.quantityStored, " Tons")}
                        {entry.stackNumber ? ` · Stack ${entry.stackNumber}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <Truck className="w-5 h-5 text-primary" />
                  Movements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {traceView.postHarvest.movementLogs.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500">No movement logs recorded.</p>
                ) : (
                  traceView.postHarvest.movementLogs.map((movement) => (
                    <div key={movement.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-900">
                        {movement.fromLocation} to {movement.toLocation}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        Dispatch {formatDate(movement.dispatchDate)}
                        {movement.arrivalDate ? ` · Arrival ${formatDate(movement.arrivalDate)}` : ""}
                      </p>
                      <p className="text-xs font-medium text-slate-600 mt-2">
                        Driver {movement.driverName || "—"} · Vehicle {movement.vehicleNumber || "—"}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[2.5rem] border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <Factory className="w-5 h-5 text-primary" />
                Sales Records
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {traceView.commercial.salesRecords.length === 0 ? (
                <p className="text-sm font-medium text-slate-500">No sales records attached to this batch.</p>
              ) : (
                traceView.commercial.salesRecords.map((sale) => (
                  <div
                    key={sale.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900">{sale.buyerName}</p>
                      <p className="text-xs font-medium text-slate-500 mt-1">
                        {sale.destination || "No destination"} · {formatDate(sale.dateSold)}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm font-black text-slate-900">{formatDecimal(sale.quantitySold, " Tons")}</p>
                      <p className="text-xs font-medium text-slate-500">
                        {formatDecimal(sale.totalValue)} total · {sale.paymentStatus || "Unknown payment status"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <InternalTraceActions orgSlug={orgSlug} batchId={batch.batchId} cropName={batch.crop} />

          <Card className="rounded-[2.25rem] border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <MapPin className="w-5 h-5 text-primary" />
                Location and Certifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Organization</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{batch.organization.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Farmer Community</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{farmerLocation || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Certifications</p>
                {batch.farmer.certifications.length === 0 ? (
                  <p className="text-sm font-medium text-slate-500 mt-1">No certifications uploaded.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {batch.farmer.certifications.map((cert) => (
                      <Badge
                        key={cert.id}
                        variant="outline"
                        className="rounded-full font-black text-[10px] uppercase tracking-widest"
                      >
                        {cert.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.25rem] border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <Boxes className="w-5 h-5 text-primary" />
                Audit Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Planting Records</span>
                <span className="text-sm font-black text-slate-900">
                  {traceView.productionTrust.plantingActivities.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Field Activities</span>
                <span className="text-sm font-black text-slate-900">
                  {traceView.productionTrust.fieldActivities.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Inputs</span>
                <span className="text-sm font-black text-slate-900">
                  {traceView.productionTrust.inputTraceabilities.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Harvest / Tests</span>
                <span className="text-sm font-black text-slate-900">
                  {traceView.harvestTrust.harvestRecords.length} / {qualityTestCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Milestones</span>
                <span className="text-sm font-black text-slate-900">{traceView.postHarvest.milestones.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Warehouse / Movements</span>
                <span className="text-sm font-black text-slate-900">
                  {traceView.postHarvest.warehouseEntries.length} / {traceView.postHarvest.movementLogs.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Sales Records</span>
                <span className="text-sm font-black text-slate-900">{traceView.commercial.salesRecords.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Timeline Events</span>
                <span className="text-sm font-black text-slate-900">{traceView.timeline.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Updated</span>
                <span className="text-sm font-black text-slate-900">{formatDate(batch.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
