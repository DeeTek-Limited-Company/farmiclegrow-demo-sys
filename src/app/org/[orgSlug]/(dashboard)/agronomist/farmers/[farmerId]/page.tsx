import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { 
  User, 
  MapPin, 
  Sprout, 
  ClipboardList,
  Package,
  Wheat,
  ShieldCheck,
  FileText, 
  TrendingUp, 
  History, 
  ShieldAlert,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Lock,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { FarmerLiveActivity } from "@/components/shared/farmer-live-activity";
import { EditFarmerButton } from "@/components/agronomist/edit-farmer-button";

interface PageProps {
  params: Promise<{ farmerId: string }>;
}

export default async function FarmerProfilePage({ params }: PageProps) {
  const { farmerId } = await params;
  const currentUser = await requireRole(["admin", "agronomist", "ops"]);

  const districtIds =
    currentUser.roles.includes("agronomist") && !currentUser.roles.includes("admin") && !currentUser.roles.includes("ops")
      ? (await prisma.agronomistDistrict.findMany({
          where: { agronomistId: currentUser.id },
          select: { districtId: true },
        })).map((a) => a.districtId)
      : null;

  // 1. Fetch Farmer with all relations
  const farmer = await prisma.farmer.findFirst({
    where: {
      id: farmerId,
      ...(districtIds ? { community: { districtId: { in: districtIds.length ? districtIds : ["__none__"] } } } : {})
    },
    include: {
      community: { include: { district: { include: { region: true } } } },
      farmProfiles: {
        include: { locations: true },
        orderBy: { createdAt: "desc" },
      },
      plots: {
        orderBy: { createdAt: "desc" },
      },
      plantingActivities: {
        include: { plot: true },
        orderBy: { plantingDate: "desc" },
      },
      fieldActivities: {
        include: { plot: true, productionRecord: true },
        orderBy: { activityDate: "desc" },
      },
      inputTraceabilities: {
        include: { plot: true },
        orderBy: [{ applicationDate: "desc" }, { createdAt: "desc" }],
      },
      harvestRecords: {
        include: { plot: true, productionRecord: true, qualityTests: { orderBy: { dateTested: "desc" }, take: 1 } },
        orderBy: { harvestDate: "desc" },
      },
      productionRecords: {
        orderBy: { createdAt: "desc" },
      },
      certifications: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!farmer) {
    return notFound();
  }

  // 2. Fetch associated user account (for temporary password)
  const userAccount = farmer.externalRef 
    ? await prisma.user.findUnique({ where: { id: farmer.externalRef } })
    : null;

  // 3. Fetch specific audit logs for this farmer
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        ...(farmer.externalRef ? [
          { userId: farmer.externalRef }, // Actions by the farmer
          { details: { path: ["createdUserId"], equals: farmer.externalRef } } // User creation log
        ] : []),
        { details: { path: ["farmerId"], equals: farmer.id } }, // Actions on the farmer
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const latestSubmission = farmer.submissions[0];
  const primaryProfile = farmer.farmProfiles[0];
  const primaryLocation = primaryProfile?.locations[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Breadcrumbs / Back */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="rounded-xl font-bold text-muted-foreground hover:text-primary">
          <Link href="/agronomist/farmers">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Farmers
          </Link>
        </Button>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary text-4xl font-black shadow-xl shadow-primary/5">
            {farmer.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-black tracking-tight text-slate-900">{farmer.fullName}</h1>
              <StatusBadge status={latestSubmission?.status || "PENDING_REVIEW"} />
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                Quality: {farmer.qualityScore}/100
              </Badge>
              {farmer.ghanaCardNumber ? (
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700">
                  ID Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-amber-50 border-amber-100 text-amber-700">
                  Missing ID
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-slate-500 font-medium">
              <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> {farmer.phone}</span>
              {farmer.ghanaCardNumber && (
                <span className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-slate-400" /> {farmer.ghanaCardNumber}</span>
              )}
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {primaryLocation?.region}, GH</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <EditFarmerButton farmer={JSON.parse(JSON.stringify(farmer))} />
          <Button className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-primary/20">
            <TrendingUp className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      <FarmerLiveActivity farmerId={farmer.id} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Core Data */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Farm Details Card */}
          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sprout className="w-5 h-5 text-primary" />
                Farm Characteristics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <DataField label="Farm Name" value={primaryProfile?.farmName} />
                <DataField label="Farm Type" value={primaryProfile?.farmType || "N/A"} />
                <DataField label="Primary Crop" value={farmer.primaryCrop ?? "N/A"} />
                <DataField label="Land Size" value={primaryProfile?.totalAreaHectare != null ? `${primaryProfile.totalAreaHectare.toString()} ha` : "N/A"} />
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block">Location & GPS</Label>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{primaryLocation?.community || "Village unknown"}</p>
                        <p className="text-xs text-slate-500 font-medium">{primaryLocation?.district}, {primaryLocation?.region}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono font-bold text-slate-400">LAT: {primaryLocation?.latitude?.toString() ?? "N/A"}</p>
                      <p className="text-[10px] font-mono font-bold text-slate-400">LNG: {primaryLocation?.longitude?.toString() ?? "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Farm Plots
                  </CardTitle>
                  <CardDescription className="font-medium">
                    Plot-level registration supports planting, harvest, quality testing, and movement traceability.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 font-bold h-12 px-6 shadow-sm">
                  <Link href="/agronomist/plots">
                    Manage plots
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                  {farmer.plots.length} plots registered
                </Badge>
              </div>
              {farmer.plots.length > 0 ? (
                <div className="space-y-3">
                  {farmer.plots.slice(0, 6).map((p) => (
                    <div key={p.id} className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 truncate">{p.plotName || "Unnamed plot"}</div>
                        <div className="text-xs text-slate-500 font-medium mt-1">
                          {p.plotSizeHectare !== null && p.plotSizeHectare !== undefined
                            ? `${Number(p.plotSizeHectare).toFixed(2)} ha`
                            : "Size not set"}
                          {p.currentCrop ? ` · Current crop: ${p.currentCrop}` : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {p.soilType ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700">
                            {p.soilType}
                          </Badge>
                        ) : null}
                        {p.irrigationSource ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-blue-50 border-blue-100 text-blue-700">
                            {p.irrigationSource}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {farmer.plots.length > 6 ? (
                    <div className="text-xs text-slate-400 font-medium">
                      Showing 6 of {farmer.plots.length} plots.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 font-bold">
                  No plots registered yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Sprout className="w-5 h-5 text-primary" />
                    Planting Records
                  </CardTitle>
                  <CardDescription className="font-medium">
                    Planting data per plot: variety, seed source, spacing, germination rate.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 font-bold h-12 px-6 shadow-sm">
                  <Link href="/agronomist/planting">
                    Manage planting
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                  {farmer.plantingActivities.length} planting records
                </Badge>
              </div>
              {farmer.plantingActivities.length > 0 ? (
                <div className="space-y-3">
                  {farmer.plantingActivities.slice(0, 6).map((a) => (
                    <div key={a.id} className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 truncate">
                          {a.cropType}
                          {a.varietyName ? <span className="text-slate-400"> · {a.varietyName}</span> : null}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1">
                          Plot: {a.plot.plotName || "Unnamed"} · Planted {format(new Date(a.plantingDate), "MMM d, yyyy")}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.seedSource ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700">
                            {a.seedSource}
                          </Badge>
                        ) : null}
                        {a.germinationRate !== null && a.germinationRate !== undefined ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-blue-50 border-blue-100 text-blue-700">
                            {Number(a.germinationRate).toFixed(0)}%
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {farmer.plantingActivities.length > 6 ? (
                    <div className="text-xs text-slate-400 font-medium">
                      Showing 6 of {farmer.plantingActivities.length} records.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 font-bold">
                  No planting records yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Field Activities
                  </CardTitle>
                  <CardDescription className="font-medium">
                    Field visit activity logs: labour, inputs, weather, supervisor verification, and geo-tag evidence.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 font-bold h-12 px-6 shadow-sm">
                  <Link href="/agronomist/field-activities">
                    Manage activities
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                  {farmer.fieldActivities.length} activities logged
                </Badge>
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700">
                  Verified: {farmer.fieldActivities.filter((a) => a.supervisorVerified).length}
                </Badge>
              </div>
              {farmer.fieldActivities.length > 0 ? (
                <div className="space-y-3">
                  {farmer.fieldActivities.slice(0, 6).map((a) => (
                    <div key={a.id} className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 truncate">
                          {a.activityType}
                          {a.supervisorVerified ? <span className="text-emerald-600"> · Verified</span> : null}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1">
                          Plot: {a.plot.plotName || "Unnamed"} · {format(new Date(a.activityDate), "MMM d, yyyy")}
                        </div>
                        {a.inputUsed ? (
                          <div className="text-xs text-slate-400 font-bold mt-1">
                            Input: {a.inputUsed}
                            {a.quantityApplied !== null && a.quantityApplied !== undefined
                              ? ` · ${Number(a.quantityApplied).toFixed(2)}${a.quantityUnit ? ` ${a.quantityUnit}` : ""}`
                              : ""}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {a.weatherCondition ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-blue-50 border-blue-100 text-blue-700">
                            {a.weatherCondition}
                          </Badge>
                        ) : null}
                        {a.productionRecord ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700">
                            {a.productionRecord.season}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {farmer.fieldActivities.length > 6 ? (
                    <div className="text-xs text-slate-400 font-medium">
                      Showing 6 of {farmer.fieldActivities.length} activities.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 font-bold">
                  No field activities yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Inputs Used (Traceability)
                  </CardTitle>
                  <CardDescription className="font-medium">
                    Input batch numbers, suppliers, purchase/expiry, and application dates tied to plots.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 font-bold h-12 px-6 shadow-sm">
                  <Link href="/agronomist/inputs">
                    Manage inputs
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                  {farmer.inputTraceabilities.length} input records
                </Badge>
              </div>
              {farmer.inputTraceabilities.length > 0 ? (
                <div className="space-y-3">
                  {farmer.inputTraceabilities.slice(0, 6).map((i) => (
                    <div key={i.id} className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 truncate">
                          {i.productName}
                          <span className="text-slate-400"> · {i.inputCategory}</span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1">
                          Plot: {i.plot.plotName || "Unnamed"}
                          {i.applicationDate ? ` · Applied ${format(new Date(i.applicationDate), "MMM d, yyyy")}` : ""}
                        </div>
                        {i.batchNumber ? (
                          <div className="text-xs text-slate-400 font-bold mt-1">Batch: {i.batchNumber}</div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {i.quantityUsed !== null && i.quantityUsed !== undefined ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700">
                            {Number(i.quantityUsed).toFixed(2)}{i.quantityUnit ? ` ${i.quantityUnit}` : ""}
                          </Badge>
                        ) : null}
                        {i.supplier ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700">
                            {i.supplier}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {farmer.inputTraceabilities.length > 6 ? (
                    <div className="text-xs text-slate-400 font-medium">
                      Showing 6 of {farmer.inputTraceabilities.length} records.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 font-bold">
                  No input records yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <Wheat className="w-5 h-5 text-primary" />
                    Harvest Records
                  </CardTitle>
                  <CardDescription className="font-medium">
                    Harvest details per plot (quantity, moisture, grade) with optional quality testing outcomes.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" className="rounded-2xl border-slate-200 font-bold h-12 px-6 shadow-sm">
                  <Link href="/agronomist/harvest">
                    Manage harvest
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-white border-slate-200 text-slate-700">
                  {farmer.harvestRecords.length} harvest records
                </Badge>
                <Badge variant="outline" className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Tests: {farmer.harvestRecords.reduce((sum, h) => sum + (h.qualityTests?.length || 0), 0)}
                </Badge>
              </div>

              {farmer.harvestRecords.length > 0 ? (
                <div className="space-y-3">
                  {farmer.harvestRecords.slice(0, 6).map((h) => (
                    <div key={h.id} className="rounded-2xl border border-slate-100 bg-white p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 truncate">
                          {h.crop}
                          {h.variety ? <span className="text-slate-400"> · {h.variety}</span> : null}
                          {h.supervisorApproved ? <span className="text-emerald-600"> · Approved</span> : null}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1">
                          Plot: {h.plot.plotName || "Unnamed"} · Harvested {format(new Date(h.harvestDate), "MMM d, yyyy")}
                        </div>
                        {h.qualityTests?.[0] ? (
                          <div className="text-xs font-black mt-1">
                            QC:{" "}
                            <span className={h.qualityTests[0].passed ? "text-emerald-700" : "text-rose-700"}>
                              {h.qualityTests[0].passed ? "Passed" : "Failed"}
                            </span>{" "}
                            · Tested {format(new Date(h.qualityTests[0].dateTested), "MMM d, yyyy")}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {h.quantityHarvested !== null && h.quantityHarvested !== undefined ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700">
                            {Number(h.quantityHarvested).toFixed(2)}{h.unit ? ` ${h.unit}` : ""}
                          </Badge>
                        ) : null}
                        {h.moistureReading !== null && h.moistureReading !== undefined ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-blue-50 border-blue-100 text-blue-700">
                            Moisture {Number(h.moistureReading).toFixed(1)}
                          </Badge>
                        ) : null}
                        {h.initialQualityGrade ? (
                          <Badge variant="outline" className="rounded-full font-black text-[10px] bg-slate-50 border-slate-200 text-slate-700">
                            {h.initialQualityGrade}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {farmer.harvestRecords.length > 6 ? (
                    <div className="text-xs text-slate-400 font-medium">
                      Showing 6 of {farmer.harvestRecords.length} records.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 font-bold">
                  No harvest records yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Production History Timeline */}
          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Production History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {farmer.productionRecords.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {farmer.productionRecords.map((record) => (
                    <div key={record.id} className="p-6 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          {record.cropType.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{record.cropType} — {record.season}</p>
                          <p className="text-xs font-medium text-slate-400 uppercase tracking-tight">Recorded {format(new Date(record.createdAt), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900">{(record.quantityTon || 0).toString()} Tons</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 font-medium italic">
                  No production records found for this farmer.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Status, Docs & Audit */}
        <div className="space-y-8">
          
          {/* Security & Access Card */}
          {userAccount?.temporaryPassword && (
            <Card className="border-0 bg-amber-50 shadow-xl shadow-amber-100/20 rounded-[2rem] overflow-hidden border-2 border-amber-100/50 animate-pulse-subtle">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <Lock className="w-5 h-5" />
                  <h3 className="font-bold">Initial Access Details</h3>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">Login Email</p>
                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200/50 font-bold text-slate-700 text-sm">{userAccount.email}</div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">Temp Password</p>
                    <div className="bg-white/80 p-3 rounded-xl border border-amber-200/50 font-mono font-black text-blue-700 tracking-widest text-sm flex items-center justify-between">
                      {userAccount.temporaryPassword}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-400 hover:text-amber-600">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-amber-700/60 font-medium italic">
                  * This is only visible until the farmer completes their first password change.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Document Vault Card */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/30 border-b border-slate-100 p-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Document Vault
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <DocItem label="Ghana Card" status={farmer.ghanaCardNumber ? "UPLOADED" : "MISSING"} />
                <DocItem label="Land Title / Lease" status="MISSING" />
                <DocItem label="Agric Certification" status="MISSING" />
              </div>
            </CardContent>
          </Card>

          {/* Mini Activity Feed */}
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/30 border-b border-slate-100 p-6">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                {auditLogs.map((log, i) => (
                  <div key={log.id} className="relative pl-8">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center" />
                    <p className="text-xs font-bold text-slate-800">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{format(new Date(log.createdAt), "MMM d, HH:mm")}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

function DataField({ label, value }: { label: string, value?: string | null }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-base font-bold text-slate-800">{value || "Not provided"}</p>
    </div>
  );
}

function DocItem({ label, status }: { label: string, status: string }) {
  const isMissing = status === "MISSING";
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <Badge variant="outline" className={`rounded-lg font-black text-[9px] px-2 py-0.5 ${
        isMissing ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
      }`}>
        {status}
      </Badge>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-100",
    REJECTED: "bg-red-50 text-red-700 border-red-100",
    PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-100",
  };
  
  return (
    <Badge className={`rounded-xl font-black text-xs px-3 py-1 shadow-sm ${styles[status] || ""}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}
