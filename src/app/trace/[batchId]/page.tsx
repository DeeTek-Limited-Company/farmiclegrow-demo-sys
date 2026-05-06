import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Leaf, MapPin, CalendarDays, Scale, ShieldCheck, Package, Truck, Warehouse, Handshake } from "lucide-react";

type PageProps = {
  params: Promise<{ batchId: string }>;
};

export default async function TraceBatchPage({ params }: PageProps) {
  const { batchId } = await params;

  const batch = await prisma.batch.findUnique({
    where: { batchId },
    include: {
      farmer: {
        include: {
          community: { include: { district: { include: { region: true } } } },
          farmProfiles: {
            include: { locations: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      productionRecord: true,
      movementLogs: { orderBy: { dispatchDate: "asc" } },
      warehouseEntries: { orderBy: { dateIn: "asc" } },
      salesRecords: { orderBy: { dateSold: "asc" } },
    },
  });

  if (!batch) {
    notFound();
  }

  const profile = batch.farmer.farmProfiles[0] || null;
  const location = profile?.locations?.[0] || null;
  const canonicalCommunity = batch.farmer.community || null;
  const canonicalDistrict = canonicalCommunity?.district || null;
  const canonicalRegion = canonicalDistrict?.region || null;

  const cycleStart = batch.productionRecord.plantingDate ? new Date(batch.productionRecord.plantingDate) : null;
  const cycleEnd = batch.productionRecord.actualHarvestDate
    ? new Date(batch.productionRecord.actualHarvestDate as any)
    : (batch.productionRecord as any).harvestDate
      ? new Date((batch.productionRecord as any).harvestDate)
      : new Date(batch.harvestDate);
  const cyclePlotId = (batch.productionRecord as any)?.plotId ? String((batch.productionRecord as any).plotId) : null;
  const cycleProductionRecordId = batch.productionRecordId ? String(batch.productionRecordId) : null;

  const [fieldActivities, inputApplications] = await Promise.all([
    prisma.fieldActivity.findMany({
      where: {
        farmerId: batch.farmerId,
        ...(cycleProductionRecordId
          ? { productionRecordId: cycleProductionRecordId }
          : cyclePlotId
            ? {
                plotId: cyclePlotId,
                ...(cycleStart ? { activityDate: { gte: cycleStart, lte: cycleEnd } } : { activityDate: { lte: cycleEnd } }),
              }
            : { activityDate: { lte: cycleEnd } }),
      },
      orderBy: [{ activityDate: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    cyclePlotId
      ? prisma.inputTraceability.findMany({
          where: {
            farmerId: batch.farmerId,
            plotId: cyclePlotId,
            ...(cycleStart
              ? { applicationDate: { gte: cycleStart, lte: cycleEnd } }
              : { applicationDate: { lte: cycleEnd } }),
          },
          orderBy: [{ applicationDate: "desc" }, { createdAt: "desc" }],
          take: 200,
        })
      : Promise.resolve([]),
  ]);

  const verifiedFieldActivities = fieldActivities.filter((a) => a.supervisorVerified).length;
  const lastFieldActivityDate = fieldActivities[0]?.activityDate ?? null;
  const lastInputApplicationDate = inputApplications[0]?.applicationDate ?? null;
  const inputCategoriesUsed = Array.from(
    inputApplications.reduce((set, i) => {
      if (i.inputCategory) set.add(i.inputCategory);
      return set;
    }, new Set<string>())
  );

  const inputsUsed = (batch.productionRecord as any)?.inputsUsed as any;
  const v1Inputs = inputsUsed && typeof inputsUsed === "object" && Array.isArray(inputsUsed.inputs) ? inputsUsed.inputs : null;
  const v1Apps =
    inputsUsed && typeof inputsUsed === "object" && Array.isArray(inputsUsed.applications) ? inputsUsed.applications : null;
  const v1ById = v1Inputs
    ? new Map<string, any>(v1Inputs.map((i: any) => [String(i?.id ?? ""), i]))
    : null;
  const appRows: Array<{
    id: string;
    date: Date | null;
    productName: string;
    category: string;
    quantityLabel: string;
    method: string;
    purpose: string;
    notes: string;
  }> =
    v1Apps && v1ById
      ? v1Apps.map((a: any) => {
          const input = v1ById.get(String(a?.inputId ?? "")) || null;
          const date = a?.dateApplied ? new Date(a.dateApplied) : null;
          const qty =
            a?.quantity !== null && a?.quantity !== undefined && a?.quantity !== ""
              ? `${Number(a.quantity).toString()} ${a?.unit || ""}`.trim()
              : "";
          return {
            id: String(a?.id ?? ""),
            date: date && !Number.isNaN(date.getTime()) ? date : null,
            productName: String(input?.productName ?? ""),
            category: String(input?.category ?? ""),
            quantityLabel: qty,
            method: String(a?.method ?? ""),
            purpose: String(a?.purpose ?? ""),
            notes: String(a?.notes ?? ""),
          };
        })
      : [];
  const appRowsSorted = [...appRows].sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
  const lastApplicationDate = appRowsSorted[0]?.date ?? null;
  const categoriesUsed: string[] = v1Inputs
    ? Array.from(
        v1Inputs.reduce((set: Set<string>, i: any) => {
          const c = String(i?.category ?? "").trim();
          if (c) set.add(c);
          return set;
        }, new Set<string>()),
      )
    : [];

  const movementEvents = batch.movementLogs.map((m) => ({
    type: "movement" as const,
    id: m.id,
    date: m.dispatchDate,
    title: "Movement",
    subtitle: `${m.fromLocation} → ${m.toLocation}`,
    detail: m.arrivalDate ? `Arrived ${format(new Date(m.arrivalDate), "MMM d, yyyy")}` : "",
  }));

  const warehouseEvents = batch.warehouseEntries.map((w) => ({
    type: "warehouse" as const,
    id: w.id,
    date: w.dateIn,
    title: "Warehousing",
    subtitle: w.warehouseLocation ? `${w.warehouseName} · ${w.warehouseLocation}` : w.warehouseName,
    detail: w.dateOut ? `Out ${format(new Date(w.dateOut), "MMM d, yyyy")}` : "Currently stored",
  }));

  const salesEvents = batch.salesRecords.map((s) => ({
    type: "sale" as const,
    id: s.id,
    date: s.dateSold,
    title: "Sale",
    subtitle: s.destination ? `${s.buyerName} · ${s.destination}` : s.buyerName,
    detail: s.paymentStatus ? `Payment: ${s.paymentStatus}` : "",
  }));

  const journeyTimeline = [...warehouseEvents, ...movementEvents, ...salesEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const lastKnownLocation = (() => {
    const lastWarehouse = batch.warehouseEntries.length ? batch.warehouseEntries[batch.warehouseEntries.length - 1] : null;
    if (lastWarehouse && !lastWarehouse.dateOut) {
      return lastWarehouse.warehouseLocation ? `${lastWarehouse.warehouseName} (${lastWarehouse.warehouseLocation})` : lastWarehouse.warehouseName;
    }
    const lastMovement = batch.movementLogs.length ? batch.movementLogs[batch.movementLogs.length - 1] : null;
    if (lastMovement) return lastMovement.toLocation;
    return null;
  })();
  const lastSale = batch.salesRecords.length ? batch.salesRecords[batch.salesRecords.length - 1] : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Package className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Trace Batch
          </h1>
        </div>
        <p className="text-slate-500 font-medium">
          This page shows the source details for a single batch ID.
        </p>
      </div>

      <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Leaf className="w-6 h-6 text-emerald-600" />
                {batch.crop}
              </CardTitle>
              <CardDescription className="font-medium">
                Batch ID: <span className="font-mono font-bold text-slate-700">{batch.batchId}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700"
              >
                <Scale className="w-3 h-3 mr-1" />
                {Number(batch.quantity).toFixed(2)} Tons
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700"
              >
                <CalendarDays className="w-3 h-3 mr-1" />
                {format(new Date(batch.harvestDate), "MMM d, yyyy")}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700"
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                Source Verified
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-[2rem] border-slate-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">
                  Farmer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <Leaf className="w-4 h-4 text-emerald-600" />
                  {batch.farmer.fullName}
                </div>
                {profile?.farmName && (
                  <div className="text-sm text-slate-600 font-medium">
                    Farm: <span className="font-bold">{profile.farmName}</span>
                  </div>
                )}
                {location && (
                  <div className="text-sm text-slate-600 font-medium flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                    <span>
                      {canonicalCommunity && canonicalDistrict && canonicalRegion
                        ? `${canonicalCommunity.name}, ${canonicalDistrict.name}, ${canonicalRegion.name}`
                        : [
                            (location?.community || "").trim() ? location?.community : null,
                            (location?.district || "").trim() ? location?.district : null,
                            (location?.region || "").trim() ? location?.region : "Ghana",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">
                  Production Cycle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700"
                  >
                    {batch.productionRecord.season}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700"
                  >
                    {batch.productionRecord.status}
                  </Badge>
                </div>

                <Separator className="bg-slate-100" />

                <div className="text-sm text-slate-700 font-medium space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">Planting</span>
                    <span className="font-bold">
                      {batch.productionRecord.plantingDate
                        ? format(new Date(batch.productionRecord.plantingDate), "MMM d, yyyy")
                        : "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">Expected Harvest</span>
                    <span className="font-bold">
                      {batch.productionRecord.expectedHarvestDate
                        ? format(new Date(batch.productionRecord.expectedHarvestDate), "MMM d, yyyy")
                        : "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-bold">Actual Harvest</span>
                    <span className="font-bold">
                      {batch.productionRecord.actualHarvestDate
                        ? format(new Date(batch.productionRecord.actualHarvestDate), "MMM d, yyyy")
                        : format(new Date(batch.harvestDate), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">
                Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {batch.productionRecord.farmingMethod && (
                <Badge
                  variant="outline"
                  className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700"
                >
                  {batch.productionRecord.farmingMethod}
                </Badge>
              )}
              {batch.productionRecord.irrigationType && (
                <Badge
                  variant="outline"
                  className="rounded-full font-black text-[10px] bg-blue-50 border-blue-100 text-blue-700"
                >
                  {batch.productionRecord.irrigationType}
                </Badge>
              )}
              {!batch.productionRecord.farmingMethod && !batch.productionRecord.irrigationType && (
                <span className="text-sm text-slate-500 font-medium">Not provided</span>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">
                Post-Harvest Journey
              </CardTitle>
              <CardDescription className="font-medium">
                Logistics, warehousing, and delivery milestones recorded for this batch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                  Movements: {batch.movementLogs.length}
                </Badge>
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                  Warehousing entries: {batch.warehouseEntries.length}
                </Badge>
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                  Sales records: {batch.salesRecords.length}
                </Badge>
                {lastKnownLocation ? (
                  <Badge variant="outline" className="rounded-full font-black text-[10px] bg-blue-50 border-blue-100 text-blue-700">
                    Current/Last location: {lastKnownLocation}
                  </Badge>
                ) : null}
                {lastSale?.destination ? (
                  <Badge variant="outline" className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700">
                    Buyer destination: {lastSale.destination}
                  </Badge>
                ) : null}
              </div>

              <Separator className="bg-slate-100" />

              {journeyTimeline.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">Timeline</div>
                  {journeyTimeline.map((e) => (
                    <div key={`${e.type}-${e.id}`} className="rounded-2xl border border-slate-100 bg-white p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-black text-slate-800">
                            {e.type === "movement" ? <Truck className="w-4 h-4 text-primary" /> : null}
                            {e.type === "warehouse" ? <Warehouse className="w-4 h-4 text-primary" /> : null}
                            {e.type === "sale" ? <Handshake className="w-4 h-4 text-primary" /> : null}
                            {e.title}
                          </div>
                          <div className="text-xs text-slate-500 font-medium mt-1">
                            {format(new Date(e.date), "MMM d, yyyy")} · {e.subtitle}
                          </div>
                          {e.detail ? (
                            <div className="text-xs text-slate-400 font-bold mt-1">{e.detail}</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 font-medium">
                  No logistics, warehousing, or sales milestones have been recorded for this batch yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-100 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">
                Field Activity Summary
              </CardTitle>
              <CardDescription className="font-medium">
                A practical view of what was applied during the cycle — useful for trust, audits, and continuous improvement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {fieldActivities.length > 0 || inputApplications.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700"
                    >
                      Field activities: {fieldActivities.length}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700"
                    >
                      Supervisor verified: {verifiedFieldActivities}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700"
                    >
                      Input applications: {inputApplications.length}
                    </Badge>
                    {lastFieldActivityDate ? (
                      <Badge
                        variant="outline"
                        className="rounded-full font-black text-[10px] bg-blue-50 border-blue-100 text-blue-700"
                      >
                        Last activity: {format(new Date(lastFieldActivityDate), "MMM d, yyyy")}
                      </Badge>
                    ) : null}
                    {lastInputApplicationDate ? (
                      <Badge
                        variant="outline"
                        className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700"
                      >
                        Last input: {format(new Date(lastInputApplicationDate), "MMM d, yyyy")}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {inputCategoriesUsed.map((c) => (
                      <Badge
                        key={c}
                        variant="outline"
                        className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700"
                      >
                        {c}
                      </Badge>
                    ))}
                    {inputCategoriesUsed.length === 0 ? (
                      <span className="text-sm text-slate-500 font-medium">No categories recorded</span>
                    ) : null}
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-3">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Latest field activities</div>
                    {fieldActivities.slice(0, 6).map((a) => (
                      <div key={a.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800">
                              {a.activityType}
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                              {format(new Date(a.activityDate), "MMM d, yyyy")}
                              {a.inputUsed ? ` · ${a.inputUsed}` : ""}
                              {a.quantityApplied != null
                                ? ` · ${Number(a.quantityApplied).toString()}${a.quantityUnit ? ` ${a.quantityUnit}` : ""}`
                                : ""}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {a.supervisorVerified ? (
                              <Badge
                                variant="outline"
                                className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700"
                              >
                                Verified
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="rounded-full font-black text-[10px] bg-amber-50 border-amber-100 text-amber-700"
                              >
                                Unverified
                              </Badge>
                            )}
                            {a.weatherCondition ? (
                              <Badge
                                variant="outline"
                                className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700"
                              >
                                {a.weatherCondition}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        {a.notes ? (
                          <div className="mt-2 text-sm text-slate-600 font-medium">
                            {a.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {fieldActivities.length === 0 ? (
                      <div className="text-sm text-slate-500 font-medium">No field activities were recorded for this cycle.</div>
                    ) : null}
                    {fieldActivities.length > 6 ? (
                      <div className="text-xs text-slate-400 font-medium">
                        Showing the latest 6 activities.
                      </div>
                    ) : null}
                  </div>
                </>
              ) : v1Inputs && v1Apps ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700"
                    >
                      Inputs recorded: {v1Inputs.length}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700"
                    >
                      Applications logged: {v1Apps.length}
                    </Badge>
                    {lastApplicationDate ? (
                      <Badge
                        variant="outline"
                        className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700"
                      >
                        Last application: {format(lastApplicationDate, "MMM d, yyyy")}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {categoriesUsed.map((c) => (
                      <Badge
                        key={c}
                        variant="outline"
                        className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700"
                      >
                        {c}
                      </Badge>
                    ))}
                    {categoriesUsed.length === 0 ? (
                      <span className="text-sm text-slate-500 font-medium">No categories recorded</span>
                    ) : null}
                  </div>

                  <Separator className="bg-slate-100" />

                  <div className="space-y-3">
                    <div className="text-xs font-black uppercase tracking-widest text-slate-400">Latest applications</div>
                    {appRowsSorted.slice(0, 6).map((a) => (
                      <div key={a.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800">
                              {a.productName || "Input"}{" "}
                              {a.category ? <span className="text-slate-400 font-bold">· {a.category}</span> : null}
                            </div>
                            <div className="text-xs text-slate-500 font-medium">
                              {a.date ? format(a.date, "MMM d, yyyy") : "Date not set"}
                              {a.quantityLabel ? ` · ${a.quantityLabel}` : ""}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {a.purpose ? (
                              <Badge
                                variant="outline"
                                className="rounded-full font-black text-[10px] bg-amber-50 border-amber-100 text-amber-700"
                              >
                                {a.purpose}
                              </Badge>
                            ) : null}
                            {a.method ? (
                              <Badge
                                variant="outline"
                                className="rounded-full font-black text-[10px] bg-blue-50 border-blue-100 text-blue-700"
                              >
                                {a.method}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                        {a.notes ? (
                          <div className="mt-2 text-sm text-slate-600 font-medium">
                            {a.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {appRowsSorted.length === 0 ? (
                      <div className="text-sm text-slate-500 font-medium">No applications logged for this cycle.</div>
                    ) : null}
                    {appRowsSorted.length > 6 ? (
                      <div className="text-xs text-slate-400 font-medium">
                        Showing the latest 6. Full log is available inside the platform.
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500 font-medium">
                  No field inputs/applications log was recorded for this production cycle.
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-slate-400 font-medium">
        Powered by FarmicleGrow Traceability
      </div>
    </div>
  );
}
