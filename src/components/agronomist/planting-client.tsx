"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Sprout, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CROP_OPTIONS } from "@/lib/crops";

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

type ActivityRow = {
  id: string;
  plotId: string;
  farmerId: string;
  productionRecordId?: string | null;
  cropType: string;
  varietyName: string | null;
  seedSource: string | null;
  seedBatchNumber: string | null;
  seedQuantityUsed: string | number | null;
  plantingDate: string;
  spacingUsed: string | null;
  germinationRate: string | number | null;
  fieldOfficerName: string | null;
  photosUploaded: any;
  farmer: FarmerOption;
  plot: { id: string; plotName: string | null };
  productionRecord?: ProductionRecordOption | null;
};


type FormState = {
  farmerId: string;
  plotId: string;
  productionRecordId: string;
  cropType: string;
  varietyName: string;
  seedSource: string;
  seedBatchNumber: string;
  seedQuantityUsed: string;
  plantingDate: string;
  spacingUsed: string;
  germinationRate: string;
  fieldOfficerName: string;
  photosUploadedUrls: string[];
};

function normalizePhotoUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((x) => typeof x === "string") as string[];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (typeof value === "object") {
    const v = value as any;
    if (Array.isArray(v.urls)) return v.urls.filter((x: unknown) => typeof x === "string") as string[];
  }
  return [];
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
  const variety = pr.cropVariety ? ` (${pr.cropVariety})` : "";
  const plot = pr.plot?.plotName ? ` · ${pr.plot.plotName}` : "";
  return `${pr.season} · ${pr.cropType}${variety} · ${pr.status}${plot}`;
}

type PlantingContext = {
  farmerId: string;
  plotId?: string | null;
  productionRecordId?: string | null;
};

export function PlantingClient({
  initialActivities,
  initialFarmers,
  initialPlots,
  initialProductionRecords,
  variant = "page",
  context,
  currentUserName: initialUserName,
}: {
  initialActivities: ActivityRow[];
  initialFarmers: FarmerOption[];
  initialPlots: PlotOption[];
  initialProductionRecords: ProductionRecordOption[];
  variant?: "page" | "embedded";
  context?: PlantingContext;
  currentUserName?: string;
}) {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityRow[]>(initialActivities);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [edit, setEdit] = useState<ActivityRow | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>(initialUserName || "");

  const [form, setForm] = useState<FormState>({
    farmerId: "",
    plotId: "",
    productionRecordId: "",
    cropType: "",
    varietyName: "",
    seedSource: "",
    seedBatchNumber: "",
    seedQuantityUsed: "",
    plantingDate: "",
    spacingUsed: "",
    germinationRate: "",
    fieldOfficerName: "",
    photosUploadedUrls: [],
  });

  useEffect(() => {
    if (initialUserName) {
      setCurrentUserName(initialUserName);
    }
  }, [initialUserName]);

  useEffect(() => {
    if (initialUserName) return;
    let cancelled = false;
    async function loadMe() {
      const res = await apiFetch("/api/auth/me");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const name = data?.user?.name ? String(data.user.name) : "";
      if (!cancelled) setCurrentUserName(name);
    }

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, [initialUserName]);

  useEffect(() => {
    if (!currentUserName) return;
    if (!open) return;
    setForm((prev) => ({ ...prev, fieldOfficerName: prev.fieldOfficerName || currentUserName }));
  }, [currentUserName, open]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    if (variant === "embedded") setQ("");
  }, [variant, context?.farmerId, context?.plotId, context?.productionRecordId]);

  const farmerOptions = useMemo(() => [...initialFarmers].sort((a, b) => a.fullName.localeCompare(b.fullName)), [initialFarmers]);
  const plotsForFarmer = useMemo(() => {
    if (!form.farmerId) return [];
    return initialPlots.filter((p) => p.farmerId === form.farmerId);
  }, [initialPlots, form.farmerId]);

  const prsForContext = useMemo(() => {
    if (!form.farmerId) return [];
    if (!form.plotId) return initialProductionRecords.filter((pr) => pr.farmerId === form.farmerId);
    return initialProductionRecords.filter((pr) => pr.farmerId === form.farmerId && pr.plotId === form.plotId);
  }, [initialProductionRecords, form.farmerId, form.plotId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return activities;
    return activities.filter((a) => {
      const farmer = a.farmer.fullName.toLowerCase();
      const crop = a.cropType.toLowerCase();
      const plot = (a.plot.plotName || "").toLowerCase();
      return farmer.includes(s) || crop.includes(s) || plot.includes(s);
    });
  }, [activities, q]);

  const resetForm = () => {
    setForm({
      farmerId: "",
      plotId: "",
      productionRecordId: "",
      cropType: "",
      varietyName: "",
      seedSource: "",
      seedBatchNumber: "",
      seedQuantityUsed: "",
      plantingDate: "",
      spacingUsed: "",
      germinationRate: "",
      fieldOfficerName: currentUserName,
      photosUploadedUrls: [],
    });
    setEdit(null);
  };

  const uploadPhotoFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploadingPhotos(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("kind", "photos");
        const res = await apiFetch("/api/uploads/image", { method: "POST", body: formData });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.message || "Upload failed");
        if (!json?.url) throw new Error("Upload failed");
        uploaded.push(String(json.url));
      }
      setForm((prev) => ({ ...prev, photosUploadedUrls: [...prev.photosUploadedUrls, ...uploaded].map(toProxyUrlIfSupabasePublic) }));
      toast.success(`Uploaded ${uploaded.length} photo${uploaded.length === 1 ? "" : "s"}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const openCreate = () => {
    resetForm();
    if (context) {
      const pr = context.productionRecordId
        ? initialProductionRecords.find((x) => x.id === context.productionRecordId)
        : null;
      setForm((prev) => ({
        ...prev,
        farmerId: context.farmerId,
        plotId: context.plotId ? String(context.plotId) : "",
        productionRecordId: context.productionRecordId ? String(context.productionRecordId) : "",
        cropType: pr?.cropType || prev.cropType,
        varietyName: pr?.cropVariety || prev.varietyName,
      }));
    }
    setOpen(true);
  };

  const openEdit = (a: ActivityRow) => {
    setEdit(a);
    setForm({
      farmerId: a.farmerId,
      plotId: a.plotId,
      productionRecordId: a.productionRecordId || "",
      cropType: a.cropType,
      varietyName: a.varietyName || "",
      seedSource: a.seedSource || "",
      seedBatchNumber: a.seedBatchNumber || "",
      seedQuantityUsed: a.seedQuantityUsed !== null && a.seedQuantityUsed !== undefined ? String(a.seedQuantityUsed) : "",
      plantingDate: a.plantingDate ? a.plantingDate.slice(0, 10) : "",
      spacingUsed: a.spacingUsed || "",
      germinationRate: a.germinationRate !== null && a.germinationRate !== undefined ? String(a.germinationRate) : "",
      fieldOfficerName: a.fieldOfficerName || currentUserName,
      photosUploadedUrls: normalizePhotoUrls(a.photosUploaded).map(toProxyUrlIfSupabasePublic),
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
      return `/api/planting?${qs.toString()}`;
    }
    if (context?.farmerId) qs.set("farmerId", context.farmerId);
    if (context?.plotId) qs.set("plotId", String(context.plotId));
    if (!context?.farmerId && form.farmerId) qs.set("farmerId", form.farmerId);
    if (!context?.plotId && form.plotId) qs.set("plotId", form.plotId);
    return qs.size ? `/api/planting?${qs.toString()}` : "/api/planting";
  };

  const submit = async () => {
    if (!form.farmerId) {
      toast.error("Select a farmer.");
      return;
    }
    if (!form.plotId) {
      toast.error("Select a plot.");
      return;
    }
    if (!form.cropType) {
      toast.error("Select a crop type.");
      return;
    }
    if (!form.plantingDate) {
      toast.error("Select planting date.");
      return;
    }

    setSaving(true);
    try {
      const photosUploaded = form.photosUploadedUrls.length ? form.photosUploadedUrls : null;

      const payload: any = {
        plotId: form.plotId,
        farmerId: form.farmerId,
        productionRecordId: form.productionRecordId.trim() ? form.productionRecordId.trim() : null,
        cropType: form.cropType,
        varietyName: form.varietyName.trim() || null,
        seedSource: form.seedSource.trim() || null,
        seedBatchNumber: form.seedBatchNumber.trim() || null,
        seedQuantityUsed: form.seedQuantityUsed ? Number(form.seedQuantityUsed) : null,
        plantingDate: new Date(form.plantingDate).toISOString(),
        spacingUsed: form.spacingUsed.trim() || null,
        germinationRate: form.germinationRate ? Number(form.germinationRate) : null,
        fieldOfficerName: form.fieldOfficerName.trim() || currentUserName || null,
        photosUploaded,
      };

      const res = await apiFetch(edit ? `/api/planting/${edit.id}` : "/api/planting", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save planting record.");

      toast.success(edit ? "Planting record updated" : "Planting record created");
      close();
      router.refresh();

      const reload = await apiFetch(getReloadUrl());
      const reloadJson = await reload.json().catch(() => ({}));
      if (reload.ok) setActivities(reloadJson.activities || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save planting record.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: ActivityRow) => {
    const ok = confirm("Delete this planting record? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await apiFetch(`/api/planting/${a.id}`, { method: "DELETE" });
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
                <Sprout className="w-8 h-8 text-primary" />
                Planting Data
              </h1>
              <p className="text-slate-500 mt-2 font-medium max-w-2xl">
                Record planting details per plot (variety, seed source, spacing, germination) to support full traceability.
              </p>
            </div>
            <Button onClick={openCreate} className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              New planting record
            </Button>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black tracking-tight">Search</CardTitle>
              <CardDescription className="font-medium">Search by farmer, crop, or plot.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search planting records..."
                  className="pl-12 h-11 rounded-xl bg-white border-slate-200 font-medium"
                />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary" />
            <div className="font-black tracking-tight text-slate-900">Planting</div>
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
                    {a.cropType}
                    {a.varietyName ? <span className="text-slate-400"> · {a.varietyName}</span> : null}
                  </CardTitle>
                  <p className="text-slate-500 mt-1 font-medium">
                    {a.farmer.fullName} {a.farmer.phone ? `(${a.farmer.phone})` : ""}
                  </p>
                  <p className="text-xs text-slate-400 font-bold mt-2">
                    Plot: {a.plot.plotName || "Unnamed"} · Planted {format(new Date(a.plantingDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => openEdit(a)}
                    aria-label="Edit planting record"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => void remove(a)}
                    aria-label="Delete planting record"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {a.seedSource ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-white border-slate-200">
                    Seed: {a.seedSource}
                  </Badge>
                ) : null}
                {a.seedBatchNumber ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-slate-50 border-slate-200 text-slate-700">
                    Batch: {a.seedBatchNumber}
                  </Badge>
                ) : null}
                {a.seedQuantityUsed !== null && a.seedQuantityUsed !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-emerald-50 border-emerald-100 text-emerald-700">
                    Seed qty: {Number(a.seedQuantityUsed).toFixed(2)}
                  </Badge>
                ) : null}
                {a.germinationRate !== null && a.germinationRate !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-blue-50 border-blue-100 text-blue-700">
                    Germination: {Number(a.germinationRate).toFixed(0)}%
                  </Badge>
                ) : null}
              </div>
              <div className="text-xs text-slate-500 font-bold space-y-1">
                {a.spacingUsed ? <div>Spacing: {a.spacingUsed}</div> : null}
                {a.fieldOfficerName ? <div>Field officer: {a.fieldOfficerName}</div> : null}
              </div>

              {(() => {
                const urls = normalizePhotoUrls(a.photosUploaded).map(toProxyUrlIfSupabasePublic);
                if (!urls.length) return null;
                return (
                  <div className="pt-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Photos
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {urls.slice(0, 6).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <img src={url} alt="Planting" className="h-20 w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden lg:col-span-2">
            <CardContent className="p-12 text-center text-slate-500 font-medium">
              No planting records found.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[820px] rounded-[2rem] p-0 border-0 shadow-2xl">
          <div className="flex max-h-[85vh] flex-col">
            <div className="p-6 pb-4">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {edit ? "Edit Planting Record" : "Create Planting Record"}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground">
                  Link planting data to a specific plot for full traceability across harvest, quality, and movement.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Farmer *</Label>
              <Select
                value={form.farmerId}
                onValueChange={(v) => {
                  setForm((prev) => ({ ...prev, farmerId: v, plotId: "", productionRecordId: "" }));
                }}
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
                onValueChange={(v) => setForm((prev) => ({ ...prev, plotId: v, productionRecordId: "" }))}
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
                onValueChange={(v) => {
                  const next = v === "__none__" ? "" : v;
                  const pr = initialProductionRecords.find((x) => x.id === next);
                  setForm((prev) => ({
                    ...prev,
                    productionRecordId: next,
                    cropType: pr?.cropType || prev.cropType,
                    varietyName: pr?.cropVariety || prev.varietyName,
                  }));
                }}
                disabled={!!context?.productionRecordId}
              >
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                  <SelectValue placeholder={form.farmerId ? "Select a cycle (optional)..." : "Select a farmer first"} />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                  <SelectItem value="__none__" className="rounded-xl font-medium">
                    None
                  </SelectItem>
                  {prsForContext.map((pr) => (
                    <SelectItem key={pr.id} value={pr.id} className="rounded-xl font-medium">
                      {prLabel(pr)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Crop *</Label>
              <Select value={form.cropType} onValueChange={(v) => setForm((prev) => ({ ...prev, cropType: v }))}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                  <SelectValue placeholder="Crop type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                  {CROP_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c} className="rounded-xl font-medium">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Variety name</Label>
              <Input
                value={form.varietyName}
                onChange={(e) => setForm((prev) => ({ ...prev, varietyName: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                placeholder="e.g., Obatanpa"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seed source</Label>
              <Input
                value={form.seedSource}
                onChange={(e) => setForm((prev) => ({ ...prev, seedSource: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                placeholder="e.g., dealer / MOFA / own"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seed batch number</Label>
              <Input
                value={form.seedBatchNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, seedBatchNumber: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                placeholder="Batch/lot number"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seed quantity used</Label>
              <Input
                type="number"
                step="0.01"
                value={form.seedQuantityUsed}
                onChange={(e) => setForm((prev) => ({ ...prev, seedQuantityUsed: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Planting date *</Label>
              <Input
                type="date"
                value={form.plantingDate}
                onChange={(e) => setForm((prev) => ({ ...prev, plantingDate: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Spacing used</Label>
              <Input
                value={form.spacingUsed}
                onChange={(e) => setForm((prev) => ({ ...prev, spacingUsed: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                placeholder="e.g., 75cm x 25cm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Germination rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.germinationRate}
                onChange={(e) => setForm((prev) => ({ ...prev, germinationRate: e.target.value }))}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                placeholder="0"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Field officer name</Label>
              <Input
                value={form.fieldOfficerName}
                readOnly
                className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                placeholder="Field officer name"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Planting photos (optional)</Label>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  disabled={uploadingPhotos}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                  onChange={async (e) => {
                    const input = e.currentTarget;
                    const files = Array.from(input.files || []);
                    if (!files.length) return;
                    await uploadPhotoFiles(files);
                    if (input && input.isConnected) input.value = "";
                  }}
                />
                {form.photosUploadedUrls.length ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {form.photosUploadedUrls.map((url, idx) => (
                        <Badge
                          key={url}
                          variant="secondary"
                          className="rounded-full cursor-pointer"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              photosUploadedUrls: prev.photosUploadedUrls.filter((x) => x !== url),
                            }))
                          }
                          title="Click to remove"
                        >
                          {`Photo ${idx + 1}`}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {form.photosUploadedUrls.slice(0, 6).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <img src={url} alt="Planting" className="h-20 w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
              </div>
            </div>

            <div className="p-6 pt-4">
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={close}
                  className="h-11 rounded-xl font-bold border-slate-200"
                  disabled={saving}
                >
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
                    "Create record"
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
