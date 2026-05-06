"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  TrendingUp,
  Sprout,
  Calendar,
  Search,
  Filter,
  Leaf,
  Droplets,
  Sun,
  Activity,
  CheckCircle2,
  Clock,
  Target,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductionRecordForm } from "@/components/agronomist/production-record-form";
import { PlantingClient } from "@/components/agronomist/planting-client";
import { FieldActivitiesClient } from "@/components/agronomist/field-activities-client";
import { InputsClient } from "@/components/agronomist/inputs-client";
import { HarvestClient } from "@/components/agronomist/harvest-client";
import { apiFetch } from "@/lib/api-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** JSON-serialized production row from the server (Decimals → string, dates → string). */
export type SerializedProductionRecord = {
  id: string;
  farmerId: string;
  plotId?: string | null;
  season: string;
  cropType: string;
  cropVariety: string | null;
  status: string;
  plantingDate: string | null;
  expectedHarvestDate: string | null;
  actualHarvestDate: string | null;
  expectedYieldTon: string | number | null;
  quantityTon: string | number | null;
  actualYieldTon: string | number | null;
  farmSizeHectares: string | number | null;
  farmingMethod: string | null;
  irrigationType: string | null;
  inputsUsed?: unknown;
  notes: string | null;
  createdAt: string;
  farmer: { fullName: string; phone: string | null; ghanaCardNumber: string | null };
  farmProfile: { farmName: string; totalAreaHectare: unknown } | null;
  plot?: { id: string; plotName: string | null; plotSizeHectare: unknown } | null;
  batches?: { id: string }[];
};

type FarmerOption = {
  id: string;
  fullName: string;
  phone: string | null;
  community: { name: string; district: { name: string; region: { name: string } } } | null;
};

type PlotOption = {
  id: string;
  plotName: string | null;
  plotSizeHectare: string | number | null;
  farmerId: string;
  farmer: FarmerOption;
};

type ProductionRecordOption = {
  id: string;
  farmerId: string;
  plotId: string | null;
  season: string;
  cropType: string;
  cropVariety: string | null;
  status: string;
  plot: { id: string; plotName: string | null } | null;
};

function getStatusConfig(status: string): {
  icon: ReactNode;
  label: string;
  color: string;
} {
  switch (status) {
    case "PLANNED":
      return {
        icon: <Clock className="w-3 h-3" />,
        label: "Planned",
        color: "bg-slate-100 text-slate-600 border-slate-200",
      };
    case "ACTIVE":
      return {
        icon: <Activity className="w-3 h-3" />,
        label: "Active Growth",
        color: "bg-blue-100 text-blue-600 border-blue-200",
      };
    case "HARVESTED":
      return {
        icon: <Sprout className="w-3 h-3" />,
        label: "Harvested",
        color: "bg-amber-100 text-amber-600 border-amber-200",
      };
    case "COMPLETED":
      return {
        icon: <CheckCircle2 className="w-3 h-3" />,
        label: "Completed",
        color: "bg-emerald-100 text-emerald-600 border-emerald-200",
      };
    default:
      return {
        icon: <Clock className="w-3 h-3" />,
        label: status,
        color: "bg-slate-100 text-slate-600 border-slate-200",
      };
  }
}

function StatsCard({
  title,
  value,
  icon,
  iconWrapperClassName,
  description,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconWrapperClassName: string;
  description: string;
}) {
  return (
    <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${iconWrapperClassName}`}
          >
            {icon}
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{value}</h3>
          </div>
        </div>
        <p className="text-xs font-bold text-slate-500 leading-relaxed italic border-t border-slate-50 pt-3 mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function AgronomistProductionView({
  initialRecords,
  initialFarmers,
  initialPlots,
  initialProductionRecords,
}: {
  initialRecords: SerializedProductionRecord[];
  initialFarmers: FarmerOption[];
  initialPlots: PlotOption[];
  initialProductionRecords: ProductionRecordOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<SerializedProductionRecord | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [plantingActivities, setPlantingActivities] = useState<any[]>([]);
  const [fieldActivities, setFieldActivities] = useState<any[]>([]);
  const [inputs, setInputs] = useState<any[]>([]);
  const [harvests, setHarvests] = useState<any[]>([]);

  const records = initialRecords;
  const selectedRecord = useMemo(() => records.find((r) => r.id === selectedRecordId) ?? null, [records, selectedRecordId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const hay = [
        r.farmer.fullName,
        r.cropType,
        r.season,
        r.cropVariety,
        r.farmProfile?.farmName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [records, query]);

  const totalRecords = records.length;
  const totalHarvested = records.reduce((sum, r) => sum + Number(r.quantityTon || 0), 0);
  const activeCycles = records.filter((r) => r.status === "ACTIVE").length;
  const plannedCycles = records.filter((r) => r.status === "PLANNED").length;

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditRecord(null);
  };

  const onSuccess = () => {
    router.refresh();
    handleDialogChange(false);
  };

  const openCreate = () => {
    setEditRecord(null);
    setDialogOpen(true);
  };

  const openEdit = (r: SerializedProductionRecord) => {
    setEditRecord(r);
    setDialogOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (!selectedRecord) {
        setPlantingActivities([]);
        setFieldActivities([]);
        setInputs([]);
        setHarvests([]);
        return;
      }

      setLoadingCycle(true);
      try {
        const plantingUrl = `/api/planting?productionRecordId=${encodeURIComponent(selectedRecord.id)}`;
        const fieldUrl = `/api/field-activities?productionRecordId=${encodeURIComponent(selectedRecord.id)}`;
        const harvestUrl = `/api/harvest?productionRecordId=${encodeURIComponent(selectedRecord.id)}`;

        const inputsQs = new URLSearchParams();
        inputsQs.set("farmerId", selectedRecord.farmerId);
        if (selectedRecord.plotId) inputsQs.set("plotId", selectedRecord.plotId);
        const inputsUrl = `/api/inputs?${inputsQs.toString()}`;

        const [plantingRes, fieldRes, inputsRes, harvestRes] = await Promise.all([
          apiFetch(plantingUrl),
          apiFetch(fieldUrl),
          apiFetch(inputsUrl),
          apiFetch(harvestUrl),
        ]);

        const [plantingJson, fieldJson, inputsJson, harvestJson] = await Promise.all([
          plantingRes.json().catch(() => ({})),
          fieldRes.json().catch(() => ({})),
          inputsRes.json().catch(() => ({})),
          harvestRes.json().catch(() => ({})),
        ]);

        if (cancelled) return;
        setPlantingActivities(plantingJson.activities || []);
        setFieldActivities(fieldJson.activities || []);
        setInputs(inputsJson.inputs || []);
        setHarvests(harvestJson.harvests || []);
      } finally {
        if (!cancelled) setLoadingCycle(false);
      }
    }

    void refresh();
    const interval = selectedRecord ? setInterval(() => void refresh(), 10000) : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [selectedRecord]);

  const cycleContext = useMemo(() => {
    if (!selectedRecord) return null;
    return {
      farmerId: selectedRecord.farmerId,
      plotId: selectedRecord.plotId ?? null,
      productionRecordId: selectedRecord.id,
    };
  }, [selectedRecord]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <ProductionRecordForm
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        onSuccess={onSuccess}
        editRecord={editRecord ?? undefined}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Production Lifecycle
          </h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl">
            Each record is a full farming cycle: created at or before planting (PLANNED / ACTIVE), updated through
            growth and harvest, then linked to batches for traceability — matching your platform spec for lifecycle
            data and QR-based trace.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-2xl border-slate-200 font-bold h-12 shadow-sm" type="button">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button
            type="button"
            onClick={openCreate}
            className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-emerald-500/20"
          >
            <Sprout className="w-4 h-4 mr-2" />
            New cycle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Cycles"
          value={totalRecords}
          icon={<Leaf className="w-6 h-6 text-emerald-600" />}
          iconWrapperClassName="bg-emerald-50"
          description="Production records (living timeline)"
        />
        <StatsCard
          title="Planned / Early"
          value={plannedCycles}
          icon={<Clock className="w-6 h-6 text-slate-600" />}
          iconWrapperClassName="bg-slate-100"
          description="Cycles not yet in active growth"
        />
        <StatsCard
          title="Active Growth"
          value={activeCycles}
          icon={<Activity className="w-6 h-6 text-blue-600" />}
          iconWrapperClassName="bg-blue-50"
          description="Cycles currently in season"
        />
        <StatsCard
          title="Total Harvested Qty"
          value={`${totalHarvested.toFixed(1)}T`}
          icon={<Target className="w-6 h-6 text-amber-600" />}
          iconWrapperClassName="bg-amber-50"
          description="Sum of field quantity (tons)"
        />
      </div>

      <div className="relative max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by farmer name, crop, variety, farm, or season..."
          className="pl-12 h-14 rounded-2xl bg-white border-slate-200 shadow-xl shadow-slate-200/20 text-base font-medium"
        />
      </div>

      <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Lifecycle Timeline
          </CardTitle>
          <CardDescription className="font-medium">
            Update records as the season progresses — they are the source of truth when creating traceability batches after
            harvest.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-slate-50/30">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-slate-400 font-bold text-lg uppercase tracking-widest">
                {records.length === 0 ? "No production cycles yet" : "No matches"}
              </p>
              <p className="text-slate-400 font-medium italic text-sm">
                {records.length === 0
                  ? "Start a cycle at planting — you can add harvest numbers when the crop comes in."
                  : "Try a different search term."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((record) => {
                const config = getStatusConfig(record.status);
                return (
                  <div
                    key={record.id}
                    className={`p-6 hover:bg-slate-50/30 transition-all group ${selectedRecordId === record.id ? "bg-slate-50/40" : ""}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center text-emerald-600 font-black text-2xl shadow-sm border border-emerald-100/50">
                          {record.cropType.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-bold text-slate-800 text-xl">{record.cropType}</h3>
                            {record.cropVariety ? (
                              <Badge
                                variant="outline"
                                className="rounded-lg font-black text-[10px] bg-white border-slate-200 text-slate-600"
                              >
                                {record.cropVariety}
                              </Badge>
                            ) : null}
                            <Badge
                              variant="outline"
                              className={`rounded-full font-black text-[10px] px-3 py-0.5 flex items-center gap-1 ${config.color}`}
                            >
                              {config.icon}
                              {config.label.toUpperCase()}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="rounded-lg font-black text-[10px] bg-white border-slate-200 text-slate-500"
                            >
                              {record.season}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Leaf className="w-4 h-4 text-emerald-500" />
                              {record.farmer.fullName}
                            </span>
                            {record.farmProfile && (
                              <span className="flex items-center gap-1.5">
                                <Sprout className="w-4 h-4 text-amber-500" />
                                {record.farmProfile.farmName}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              Started {format(new Date(record.createdAt), "MMM d")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest text-[10px]">
                            Expected
                          </p>
                          <p className="text-lg font-black text-slate-600">
                            {record.expectedYieldTon ? `${record.expectedYieldTon}T` : "—"}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-right">
                          <p className="text-sm font-black text-amber-500 uppercase tracking-widest text-[10px]">
                            Harvested
                          </p>
                          <p className="text-lg font-black text-slate-900">
                            {record.quantityTon ? `${record.quantityTon}T` : "—"}
                          </p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-500 uppercase tracking-widest text-[10px]">
                            Usable yield
                          </p>
                          <p className="text-lg font-black text-slate-900">
                            {record.actualYieldTon ? `${record.actualYieldTon}T` : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right hidden xl:block mr-2 space-y-1">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Planting</p>
                            <p className="text-sm font-bold text-slate-700">
                              {record.plantingDate ? format(new Date(record.plantingDate), "MMM d, yyyy") : "Not set"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Expected harvest
                            </p>
                            <p className="text-sm font-bold text-slate-700">
                              {record.expectedHarvestDate
                                ? format(new Date(record.expectedHarvestDate), "MMM d, yyyy")
                                : "Not set"}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant={selectedRecordId === record.id ? "default" : "outline"}
                          className="h-12 rounded-2xl font-bold shadow-sm"
                          onClick={() => setSelectedRecordId((prev) => (prev === record.id ? null : record.id))}
                        >
                          {selectedRecordId === record.id ? "Close" : "Open"}
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-500 group-hover:bg-primary group-hover:text-white transition-all shrink-0"
                          onClick={() => openEdit(record)}
                          aria-label={`Update cycle for ${record.cropType}`}
                        >
                          <Pencil className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {record.farmingMethod && (
                        <Badge
                          variant="outline"
                          className="rounded-lg font-bold text-[10px] bg-emerald-50 border-emerald-100 text-emerald-700 py-1"
                        >
                          <Sun className="w-3 h-3 mr-1.5" />
                          {record.farmingMethod}
                        </Badge>
                      )}
                      {record.irrigationType && (
                        <Badge
                          variant="outline"
                          className="rounded-lg font-bold text-[10px] bg-blue-50 border-blue-100 text-blue-700 py-1"
                        >
                          <Droplets className="w-3 h-3 mr-1.5" />
                          {record.irrigationType}
                        </Badge>
                      )}
                      {record.farmSizeHectares ? (
                        <Badge
                          variant="outline"
                          className="rounded-lg font-bold text-[10px] bg-slate-50 border-slate-200 text-slate-600 py-1"
                        >
                          {Number(record.farmSizeHectares).toFixed(2)} ha used
                        </Badge>
                      ) : null}
                      {record.batches && record.batches.length > 0 ? (
                        <Badge variant="outline" className="rounded-lg font-black text-[10px] border-primary/30 text-primary">
                          {record.batches.length} batch link{record.batches.length === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRecord && cycleContext ? (
        <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-black tracking-tight">
                  Cycle workspace · {selectedRecord.farmer.fullName} · {selectedRecord.cropType} · {selectedRecord.season}
                </CardTitle>
                <CardDescription className="font-medium">
                  Update the cycle step-by-step. Status controls which forms are visible.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl border-slate-200 font-bold h-11"
                  onClick={() => openEdit(selectedRecord)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit cycle
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <Tabs defaultValue="planned">
              <TabsList className="grid grid-cols-4 w-full rounded-2xl">
                <TabsTrigger value="planned">Planned</TabsTrigger>
                <TabsTrigger value="active" disabled={selectedRecord.status === "PLANNED"}>
                  Active growth
                </TabsTrigger>
                <TabsTrigger value="harvest" disabled={selectedRecord.status === "PLANNED" || selectedRecord.status === "ACTIVE"}>
                  Harvest
                </TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="planned" className="mt-6 space-y-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className={`rounded-full font-black text-[10px] px-3 py-1 ${getStatusConfig(selectedRecord.status).color}`}>
                      {getStatusConfig(selectedRecord.status).label.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="rounded-full font-black text-[10px] px-3 py-1 border-slate-200 text-slate-600">
                      Farmer: {selectedRecord.farmer.fullName}
                    </Badge>
                    {selectedRecord.plot?.plotName ? (
                      <Badge variant="outline" className="rounded-full font-black text-[10px] px-3 py-1 border-slate-200 text-slate-600">
                        Plot: {selectedRecord.plot.plotName}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium text-slate-600">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Planting date</div>
                      <div>{selectedRecord.plantingDate ? format(new Date(selectedRecord.plantingDate), "MMM d, yyyy") : "Not set"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected harvest</div>
                      <div>
                        {selectedRecord.expectedHarvestDate ? format(new Date(selectedRecord.expectedHarvestDate), "MMM d, yyyy") : "Not set"}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="active" className="mt-6 space-y-10">
                <div className="space-y-6">
                  <PlantingClient
                    initialActivities={plantingActivities as any}
                    initialFarmers={initialFarmers as any}
                    initialPlots={initialPlots as any}
                    initialProductionRecords={initialProductionRecords as any}
                    variant="embedded"
                    context={cycleContext as any}
                  />
                </div>
                <div className="space-y-6">
                  <InputsClient
                    initialInputs={inputs as any}
                    initialFarmers={initialFarmers as any}
                    initialPlots={initialPlots as any}
                    variant="embedded"
                    context={{ farmerId: selectedRecord.farmerId, plotId: selectedRecord.plotId ?? null } as any}
                  />
                </div>
                <div className="space-y-6">
                  <FieldActivitiesClient
                    initialActivities={fieldActivities as any}
                    initialFarmers={initialFarmers as any}
                    initialPlots={initialPlots as any}
                    initialProductionRecords={initialProductionRecords as any}
                    variant="embedded"
                    context={cycleContext as any}
                  />
                </div>
              </TabsContent>

              <TabsContent value="harvest" className="mt-6 space-y-10">
                <HarvestClient
                  initialHarvests={harvests as any}
                  initialFarmers={initialFarmers as any}
                  initialPlots={initialPlots as any}
                  initialProductionRecords={initialProductionRecords as any}
                  variant="embedded"
                  context={cycleContext as any}
                />
              </TabsContent>

              <TabsContent value="timeline" className="mt-6 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-black tracking-tight text-slate-900">Recent activity</div>
                    <div className="text-xs font-bold text-slate-500">{loadingCycle ? "Syncing..." : "Synced"}</div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {(() => {
                      const items: Array<{ id: string; at: string; label: string }> = [];
                      for (const a of plantingActivities as any[]) {
                        items.push({ id: `p:${a.id}`, at: a.plantingDate, label: `Planting · ${a.cropType}` });
                      }
                      for (const a of fieldActivities as any[]) {
                        items.push({ id: `f:${a.id}`, at: a.activityDate, label: `Field · ${a.activityType}` });
                      }
                      for (const i of inputs as any[]) {
                        const at = i.applicationDate || i.createdAt;
                        items.push({ id: `i:${i.id}`, at, label: `Input · ${i.inputCategory} · ${i.productName}` });
                      }
                      for (const h of harvests as any[]) {
                        items.push({ id: `h:${h.id}`, at: h.harvestDate, label: `Harvest · ${h.crop}` });
                      }
                      items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
                      const top = items.slice(0, 20);
                      if (top.length === 0) {
                        return <div className="text-sm font-medium text-slate-500">No activity recorded for this cycle yet.</div>;
                      }
                      return top.map((x) => (
                        <div key={x.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-3">
                          <div className="text-sm font-bold text-slate-800">{x.label}</div>
                          <div className="text-xs font-bold text-slate-500">{format(new Date(x.at), "MMM d, yyyy")}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
