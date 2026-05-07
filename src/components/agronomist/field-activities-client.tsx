"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ClipboardList, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  status: string;
};

type ActivityRow = {
  id: string;
  plotId: string;
  farmerId: string;
  productionRecordId: string | null;
  activityType: string;
  activityDate: string;
  labourUsed: string | null;
  inputUsed: string | null;
  quantityApplied: string | number | null;
  quantityUnit: string | null;
  weatherCondition: string | null;
  performedBy: string | null;
  supervisorVerified: boolean;
  geoTaggedPhoto: any;
  notes: string | null;
  farmer: FarmerOption;
  plot: { id: string; plotName: string | null };
  productionRecord: ProductionRecordOption | null;
};

const ACTIVITY_TYPES = [
  "Land preparation",
  "Planting",
  "Weeding",
  "Fertilizer application",
  "Pesticide application",
  "Herbicide application",
  "Irrigation",
  "Harvesting",
  "Drying",
  "Transport",
  "Other",
];

const WEATHER_CONDITIONS = ["Sunny", "Cloudy", "Rainy", "Windy", "Hazy", "Harmattan", "Other"];

type FormState = {
  farmerId: string;
  plotId: string;
  productionRecordId: string;
  activityType: string;
  activityDate: string;
  labourUsed: string;
  weatherCondition: string;
  performedBy: string;
  supervisorVerified: boolean;
  geoPhotoUrl: string;
  geoLat: string;
  geoLng: string;
  geoAccuracyMeters: string;
  notes: string;
};

function normalizeGeoTaggedPhoto(value: unknown): {
  url: string;
  lat: number | null;
  lng: number | null;
  accuracyMeters: number | null;
} {
  if (!value) return { url: "", lat: null, lng: null, accuracyMeters: null };
  if (typeof value === "string") return { url: value, lat: null, lng: null, accuracyMeters: null };
  if (typeof value !== "object") return { url: "", lat: null, lng: null, accuracyMeters: null };

  const v = value as any;
  const url = typeof v.url === "string" ? v.url : "";
  const lat = typeof v.lat === "number" ? v.lat : typeof v.latitude === "number" ? v.latitude : null;
  const lng = typeof v.lng === "number" ? v.lng : typeof v.longitude === "number" ? v.longitude : null;
  const accuracyMeters =
    typeof v.accuracyMeters === "number" ? v.accuracyMeters : typeof v.accuracy === "number" ? v.accuracy : null;

  return { url, lat, lng, accuracyMeters };
}

function toProxyUrlIfSupabasePublic(url: string): string {
  const trimmed = url.trim();
  const match = trimmed.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return trimmed;
  const bucket = match[1];
  const key = decodeURIComponent(match[2]);
  return `/api/uploads/object?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`;
}

function farmerLabel(f: FarmerOption) {
  const c = f.community;
  const loc = c ? `${c.name} · ${c.district.name} · ${c.district.region.name}` : "No community";
  return `${f.fullName}${f.phone ? ` (${f.phone})` : ""} · ${loc}`;
}

function plotLabel(p: PlotOption) {
  const size = p.plotSizeHectare !== null && p.plotSizeHectare !== undefined ? `${Number(p.plotSizeHectare).toFixed(2)} ha` : "size N/A";
  return `${p.plotName || "Unnamed plot"} · ${size}`;
}

function prLabel(pr: ProductionRecordOption) {
  return `${pr.season} · ${pr.cropType} · ${pr.status}`;
}

type FieldActivitiesContext = {
  farmerId: string;
  plotId?: string | null;
  productionRecordId?: string | null;
};

export function FieldActivitiesClient({
  initialActivities,
  initialFarmers,
  initialPlots,
  initialProductionRecords,
  variant = "page",
  context,
}: {
  initialActivities: ActivityRow[];
  initialFarmers: FarmerOption[];
  initialPlots: PlotOption[];
  initialProductionRecords: ProductionRecordOption[];
  variant?: "page" | "embedded";
  context?: FieldActivitiesContext;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityRow[]>(initialActivities);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<ActivityRow | null>(null);
  const [uploadingGeoPhoto, setUploadingGeoPhoto] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsBestAccuracy, setGpsBestAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("");
  const [geoWatchId, setGeoWatchId] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({
    farmerId: "",
    plotId: "",
    productionRecordId: "",
    activityType: "",
    activityDate: "",
    labourUsed: "",
    weatherCondition: "",
    performedBy: "",
    supervisorVerified: false,
    geoPhotoUrl: "",
    geoLat: "",
    geoLng: "",
    geoAccuracyMeters: "",
    notes: "",
  });

  useEffect(() => {
    return () => {
      if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
    };
  }, [geoWatchId]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    if (variant === "embedded") setQ("");
  }, [variant, context?.farmerId, context?.plotId, context?.productionRecordId]);

  const farmerOptions = useMemo(
    () => [...initialFarmers].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [initialFarmers],
  );

  const plotsForFarmer = useMemo(() => {
    if (!form.farmerId) return [];
    return initialPlots.filter((p) => p.farmerId === form.farmerId);
  }, [initialPlots, form.farmerId]);

  const prsForFarmer = useMemo(() => {
    if (!form.farmerId) return [];
    return initialProductionRecords.filter((pr) => pr.farmerId === form.farmerId);
  }, [initialProductionRecords, form.farmerId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return activities;
    return activities.filter((a) => {
      const farmer = a.farmer.fullName.toLowerCase();
      const type = a.activityType.toLowerCase();
      const plot = (a.plot.plotName || "").toLowerCase();
      return farmer.includes(s) || type.includes(s) || plot.includes(s);
    });
  }, [activities, q]);

  const resetForm = () => {
    setForm({
      farmerId: "",
      plotId: "",
      productionRecordId: "",
      activityType: "",
      activityDate: "",
      labourUsed: "",
      weatherCondition: "",
      performedBy: "",
      supervisorVerified: false,
      geoPhotoUrl: "",
      geoLat: "",
      geoLng: "",
      geoAccuracyMeters: "",
      notes: "",
    });
    setGpsAccuracy(null);
    setGpsBestAccuracy(null);
    setGpsStatus("");
    setEdit(null);
  };

  const uploadGeoPhoto = async (file: File) => {
    setUploadingGeoPhoto(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", "photos");
      const res = await apiFetch("/api/uploads/image", { method: "POST", body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Upload failed");
      const url = json?.url ? String(json.url) : "";
      if (!url) throw new Error("Upload failed");
      setForm((prev) => ({ ...prev, geoPhotoUrl: toProxyUrlIfSupabasePublic(url) }));
      toast.success("Geo photo uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload photo");
    } finally {
      setUploadingGeoPhoto(false);
    }
  };

  const captureGpsOnce = () => {
    if (!navigator.geolocation) return toast.error("Geolocation is not supported by your browser");
    setIsLocating(true);
    setGpsStatus("Getting GPS fix...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setForm((prev) => ({
          ...prev,
          geoLat: String(latitude),
          geoLng: String(longitude),
          geoAccuracyMeters: Number.isFinite(accuracy) ? String(Math.round(accuracy)) : prev.geoAccuracyMeters,
        }));
        setGpsAccuracy(Number.isFinite(accuracy) ? accuracy : null);
        setGpsBestAccuracy(Number.isFinite(accuracy) ? accuracy : null);
        setGpsStatus("");
        setIsLocating(false);
        toast.success("GPS captured");
      },
      (err) => {
        setGpsStatus("");
        setIsLocating(false);
        toast.error("Failed to capture GPS: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const refineGps = () => {
    if (!navigator.geolocation) return toast.error("Geolocation is not supported by your browser");
    if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);

    setIsLocating(true);
    setGpsStatus("Refining GPS accuracy...");
    setGpsBestAccuracy(null);

    const startedAt = Date.now();
    const maxMs = 25000;
    const goodEnoughMeters = 25;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const meters = Number.isFinite(accuracy) ? accuracy : null;
        if (meters !== null) setGpsAccuracy(meters);

        const best = gpsBestAccuracy;
        const isBetter = meters !== null && (best === null || meters < best);
        if (isBetter) {
          setGpsBestAccuracy(meters);
          setForm((prev) => ({
            ...prev,
            geoLat: String(latitude),
            geoLng: String(longitude),
            geoAccuracyMeters: String(Math.round(meters)),
          }));
        }

        const elapsed = Date.now() - startedAt;
        if ((meters !== null && meters <= goodEnoughMeters) || elapsed >= maxMs) {
          navigator.geolocation.clearWatch(id);
          setGeoWatchId(null);
          setGpsStatus("");
          setIsLocating(false);
          toast.success("GPS refined");
        }
      },
      (err) => {
        navigator.geolocation.clearWatch(id);
        setGeoWatchId(null);
        setGpsStatus("");
        setIsLocating(false);
        toast.error("Failed to refine GPS: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );

    setGeoWatchId(id);
  };

  const openCreate = () => {
    resetForm();
    if (context) {
      setForm((prev) => ({
        ...prev,
        farmerId: context.farmerId,
        plotId: context.plotId ? String(context.plotId) : "",
        productionRecordId: context.productionRecordId ? String(context.productionRecordId) : "",
      }));
    }
    setOpen(true);
  };

  const openEdit = (a: ActivityRow) => {
    setEdit(a);
    const geo = normalizeGeoTaggedPhoto(a.geoTaggedPhoto);
    setForm({
      farmerId: a.farmerId,
      plotId: a.plotId,
      productionRecordId: a.productionRecordId || "",
      activityType: a.activityType,
      activityDate: a.activityDate ? a.activityDate.slice(0, 10) : "",
      labourUsed: a.labourUsed || "",
      weatherCondition: a.weatherCondition || "",
      performedBy: a.performedBy || "",
      supervisorVerified: !!a.supervisorVerified,
      geoPhotoUrl: geo.url ? toProxyUrlIfSupabasePublic(geo.url) : "",
      geoLat: geo.lat !== null ? String(geo.lat) : "",
      geoLng: geo.lng !== null ? String(geo.lng) : "",
      geoAccuracyMeters: geo.accuracyMeters !== null ? String(Math.round(geo.accuracyMeters)) : "",
      notes: a.notes || "",
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  const getReloadUrl = () => {
    const qs = new URLSearchParams();
    if (context?.productionRecordId) {
      qs.set("productionRecordId", context.productionRecordId);
      return `/api/field-activities?${qs.toString()}`;
    }
    if (context?.farmerId) qs.set("farmerId", context.farmerId);
    if (context?.plotId) qs.set("plotId", String(context.plotId));
    if (!context?.farmerId && form.farmerId) qs.set("farmerId", form.farmerId);
    if (!context?.plotId && form.plotId) qs.set("plotId", form.plotId);
    if (!context?.productionRecordId && form.productionRecordId) qs.set("productionRecordId", form.productionRecordId);
    return qs.size ? `/api/field-activities?${qs.toString()}` : "/api/field-activities";
  };

  const submit = async () => {
    if (!form.farmerId) return toast.error("Select a farmer.");
    if (!form.plotId) return toast.error("Select a plot.");
    if (!form.activityType) return toast.error("Select activity type.");
    if (!form.activityDate) return toast.error("Select activity date.");

    setSaving(true);
    try {
      const lat = form.geoLat.trim() ? Number(form.geoLat) : null;
      const lng = form.geoLng.trim() ? Number(form.geoLng) : null;
      const accuracyMeters = form.geoAccuracyMeters.trim() ? Number(form.geoAccuracyMeters) : null;
      const geoTaggedPhoto =
        (form.geoPhotoUrl.trim() || (lat !== null && lng !== null))
          ? {
              url: form.geoPhotoUrl.trim() || null,
              lat,
              lng,
              accuracyMeters,
              capturedAt: new Date().toISOString(),
            }
          : null;

      const payload: any = {
        farmerId: form.farmerId,
        plotId: form.plotId,
        productionRecordId: form.productionRecordId.trim() ? form.productionRecordId.trim() : null,
        activityType: form.activityType,
        activityDate: new Date(form.activityDate).toISOString(),
        labourUsed: form.labourUsed.trim() || null,
        inputUsed: null,
        quantityApplied: null,
        quantityUnit: null,
        weatherCondition: form.weatherCondition.trim() || null,
        performedBy: form.performedBy.trim() || null,
        supervisorVerified: form.supervisorVerified,
        geoTaggedPhoto,
        notes: form.notes.trim() || null,
      };

      if (edit) delete payload.farmerId;
      if (edit) delete payload.plotId;

      const res = await apiFetch(edit ? `/api/field-activities/${edit.id}` : "/api/field-activities", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save field activity.");

      toast.success(edit ? "Field activity updated" : "Field activity created");
      close();
      router.refresh();

      const reload = await apiFetch(getReloadUrl());
      const reloadJson = await reload.json().catch(() => ({}));
      if (reload.ok) setActivities(reloadJson.activities || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save field activity.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: ActivityRow) => {
    const ok = confirm("Delete this activity? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await apiFetch(`/api/field-activities/${a.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete.");
      toast.success("Deleted");
      setActivities((prev) => prev.filter((x) => x.id !== a.id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete.");
    }
  };

  return (
    <div className={variant === "embedded" ? "space-y-6" : "space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12"}>
      {variant === "page" ? (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-primary" />
                Field Activities
              </h1>
              <p className="text-slate-500 mt-2 font-medium max-w-2xl">
                Log field visit activities per plot: labour, inputs used, quantities, weather, and supervisor verification.
              </p>
            </div>
            <Button onClick={openCreate} className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              New activity
            </Button>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black tracking-tight">Search</CardTitle>
              <CardDescription className="font-medium">Search by farmer, activity type, plot, or input used.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search field activities..."
                  className="pl-12 h-11 rounded-xl bg-white border-slate-200 font-medium"
                />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <div className="font-black tracking-tight text-slate-900">Field activities</div>
          </div>
          <Button onClick={openCreate} className="rounded-xl font-bold h-10 px-4 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((a) => (
          <Card key={a.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-xl font-black tracking-tight truncate">
                    {a.activityType}
                    {a.supervisorVerified ? <span className="text-emerald-600"> · Verified</span> : null}
                  </CardTitle>
                  <p className="text-slate-500 mt-1 font-medium">
                    <Link href={`/agronomist/farmers/${a.farmerId}`} className="hover:underline">
                      {a.farmer.fullName}
                    </Link>
                    {a.farmer.phone ? ` (${a.farmer.phone})` : ""}
                  </p>
                  <p className="text-xs text-slate-400 font-bold mt-2">
                    Plot: {a.plot.plotName || "Unnamed"} · {format(new Date(a.activityDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => openEdit(a)}
                    aria-label="Edit activity"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => void remove(a)}
                    aria-label="Delete activity"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {a.inputUsed ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-white border-slate-200">
                    Input: {a.inputUsed}
                  </Badge>
                ) : null}
                {a.quantityApplied !== null && a.quantityApplied !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-emerald-50 border-emerald-100 text-emerald-700">
                    Qty: {Number(a.quantityApplied).toFixed(2)}{a.quantityUnit ? ` ${a.quantityUnit}` : ""}
                  </Badge>
                ) : null}
                {a.weatherCondition ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-blue-50 border-blue-100 text-blue-700">
                    Weather: {a.weatherCondition}
                  </Badge>
                ) : null}
                {a.productionRecord ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-slate-50 border-slate-200 text-slate-700">
                    Cycle: {a.productionRecord.season}
                  </Badge>
                ) : null}
              </div>

              <div className="text-xs text-slate-500 font-bold space-y-1">
                {a.performedBy ? <div>Performed by: {a.performedBy}</div> : null}
                {a.labourUsed ? <div>Labour: {a.labourUsed}</div> : null}
                {a.notes ? <div>Notes: {a.notes}</div> : null}
              </div>

              {(() => {
                const geo = normalizeGeoTaggedPhoto(a.geoTaggedPhoto);
                const url = geo.url ? toProxyUrlIfSupabasePublic(geo.url) : "";
                const hasCoords = geo.lat !== null && geo.lng !== null;
                if (!url && !hasCoords) return null;
                const mapsUrl = hasCoords
                  ? `https://www.google.com/maps?q=${encodeURIComponent(`${geo.lat},${geo.lng}`)}`
                  : null;

                return (
                  <div className="pt-2 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Geo tagged</div>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                      >
                        <img src={url} alt="Geo" className="h-32 w-full object-cover" />
                      </a>
                    ) : null}
                    {hasCoords ? (
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                        <span>
                          {geo.lat?.toFixed(6)}, {geo.lng?.toFixed(6)}
                          {geo.accuracyMeters !== null ? ` · ~${Math.round(geo.accuracyMeters)}m` : ""}
                        </span>
                        {mapsUrl ? (
                          <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                            Open in Maps
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 ? (
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden lg:col-span-2">
            <CardContent className="p-12 text-center text-slate-500 font-medium">
              No activities found.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[920px] rounded-[2rem] p-0 border-0 shadow-2xl">
          <div className="flex max-h-[85vh] flex-col">
            <div className="p-6 pb-4">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {edit ? "Edit Field Activity" : "Create Field Activity"}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground">
                  Log a field visit activity. Link to a production cycle if this activity belongs to a specific season.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Farmer *</Label>
                  <Select
                    value={form.farmerId}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, farmerId: v, plotId: "", productionRecordId: "" }))}
                    disabled={!!edit || !!context}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Select a farmer..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {farmerOptions.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="rounded-xl font-medium">
                          {farmerLabel(f)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plot *</Label>
                  <Select
                    value={form.plotId}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, plotId: v }))}
                    disabled={!!edit || !!context?.plotId}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder={form.farmerId ? "Select a plot..." : "Select a farmer first"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {plotsForFarmer.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="rounded-xl font-medium">
                          {plotLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Production cycle (optional)
                  </Label>
                  <Select
                    value={form.productionRecordId}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, productionRecordId: v === "__none__" ? "" : v }))}
                    disabled={!!context?.productionRecordId}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder={form.farmerId ? "Select a cycle (optional)..." : "Select a farmer first"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      <SelectItem value="__none__" className="rounded-xl font-medium">
                        None
                      </SelectItem>
                      {prsForFarmer.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id} className="rounded-xl font-medium">
                          {prLabel(pr)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Activity type *</Label>
                  <Select value={form.activityType} onValueChange={(v) => setForm((prev) => ({ ...prev, activityType: v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {ACTIVITY_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-xl font-medium">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Activity date *</Label>
                  <Input
                    type="date"
                    value={form.activityDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, activityDate: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Weather</Label>
                  <Select value={form.weatherCondition} onValueChange={(v) => setForm((prev) => ({ ...prev, weatherCondition: v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Weather condition" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {WEATHER_CONDITIONS.map((w) => (
                        <SelectItem key={w} value={w} className="rounded-xl font-medium">
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Performed by</Label>
                  <Input
                    value={form.performedBy}
                    onChange={(e) => setForm((prev) => ({ ...prev, performedBy: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="e.g., farmer / field officer"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Labour used</Label>
                  <Input
                    value={form.labourUsed}
                    onChange={(e) => setForm((prev) => ({ ...prev, labourUsed: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="e.g., 4 persons, 1 day"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supervisor verification</Label>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Checkbox
                      checked={form.supervisorVerified}
                      onCheckedChange={(v) => setForm((prev) => ({ ...prev, supervisorVerified: v === true }))}
                    />
                    <span className="text-sm font-bold text-slate-800">Verified</span>
                  </label>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Geo-tagged photo</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={captureGpsOnce}
                        disabled={isLocating}
                        className="h-8 rounded-lg bg-primary/5 border-primary/20 text-primary font-bold"
                      >
                        Capture GPS
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={refineGps}
                        disabled={isLocating}
                        className="h-8 rounded-lg border-slate-200 font-bold"
                      >
                        Refine
                      </Button>
                    </div>
                  </div>

                  {gpsStatus ? <div className="text-xs font-bold text-slate-500">{gpsStatus}</div> : null}
                  {gpsAccuracy !== null ? (
                    <div className="text-xs font-bold text-slate-500">
                      Accuracy: ~{Math.round(gpsAccuracy)}m{gpsBestAccuracy !== null ? ` · Best: ~${Math.round(gpsBestAccuracy)}m` : ""}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png"
                      disabled={uploadingGeoPhoto}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                      onChange={async (e) => {
                        const input = e.currentTarget;
                        const file = input.files?.[0] ?? null;
                        if (!file) return;
                        await uploadGeoPhoto(file);
                        if (input && input.isConnected) input.value = "";
                      }}
                    />

                    {form.geoPhotoUrl ? (
                      <a
                        href={form.geoPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                      >
                        <img src={form.geoPhotoUrl} alt="Geo photo" className="h-40 w-full object-cover" />
                      </a>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={form.geoLat}
                        onChange={(e) => setForm((prev) => ({ ...prev, geoLat: e.target.value }))}
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                        placeholder="Latitude"
                      />
                      <Input
                        value={form.geoLng}
                        onChange={(e) => setForm((prev) => ({ ...prev, geoLng: e.target.value }))}
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                        placeholder="Longitude"
                      />
                    </div>

                    <Input
                      value={form.geoAccuracyMeters}
                      onChange={(e) => setForm((prev) => ({ ...prev, geoAccuracyMeters: e.target.value }))}
                      className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                      placeholder="Accuracy (meters, optional)"
                    />

                    {(() => {
                      const latNum = form.geoLat.trim() ? Number(form.geoLat) : NaN;
                      const lngNum = form.geoLng.trim() ? Number(form.geoLng) : NaN;
                      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
                      const delta = 0.01;
                      const left = lngNum - delta;
                      const right = lngNum + delta;
                      const bottom = latNum - delta;
                      const top = latNum + delta;
                      const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                        `${left},${bottom},${right},${top}`,
                      )}&layer=mapnik&marker=${encodeURIComponent(`${latNum},${lngNum}`)}`;
                      const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${latNum},${lngNum}`)}`;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Map preview</span>
                            <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary underline">
                              Open in Maps
                            </a>
                          </div>
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <iframe title="Geo photo location" src={src} className="h-56 w-full" loading="lazy" />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="rounded-xl bg-slate-50 border-slate-200 font-bold p-3"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 pt-4">
              <DialogFooter>
                <Button variant="outline" onClick={close} className="h-11 rounded-xl font-bold border-slate-200" disabled={saving}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void submit()}
                  className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : edit ? (
                    "Save changes"
                  ) : (
                    "Create activity"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
