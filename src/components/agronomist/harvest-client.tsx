"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wheat, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
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
  cropVariety: string | null;
  status: string;
  expectedHarvestDate?: string | null;
  actualHarvestDate?: string | null;
};

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

type HarvestRow = {
  id: string;
  plotId: string;
  farmerId: string;
  productionRecordId: string | null;
  harvestDate: string;
  crop: string;
  variety: string | null;
  quantityHarvested: string | number | null;
  unit: string | null;
  harvestMethod: string | null;
  harvestTeam: string | null;
  initialQualityGrade: string | null;
  moistureReading: string | number | null;
  photos: any;
  supervisorApproved: boolean;
  supervisorName: string | null;
  notes: string | null;
  farmer: FarmerOption;
  plot: { id: string; plotName: string | null };
  productionRecord: ProductionRecordOption | null;
  qualityTests: { id: string; passed: boolean; dateTested: string }[];
};

const UNITS = ["kg", "bag (50kg)", "bag (25kg)", "ton", "crate", "sack", "other"];
const QUALITY_GRADES = ["Grade A", "Grade B", "Grade C", "Premium", "Standard", "Reject", "Other"];
const HARVEST_METHODS = ["Manual", "Mechanical", "Mixed", "Other"];

type FormState = {
  farmerId: string;
  plotId: string;
  productionRecordId: string;
  harvestDate: string;
  crop: string;
  variety: string;
  quantityHarvested: string;
  unit: string;
  harvestMethod: string;
  harvestTeam: string;
  initialQualityGrade: string;
  moistureReading: string;
  supervisorApproved: boolean;
  supervisorName: string;
  photoUrls: string[];
  notes: string;
};

function normalizePhotoUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    const strings = value.filter((x) => typeof x === "string") as string[];
    if (strings.length) return strings;
    const urls = value
      .map((x) => (typeof x === "object" && x && typeof (x as any).url === "string" ? String((x as any).url) : null))
      .filter(Boolean) as string[];
    return urls;
  }
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
  return `${pr.season} · ${pr.cropType}${pr.cropVariety ? ` (${pr.cropVariety})` : ""} · ${pr.status}`;
}

type HarvestContext = {
  farmerId: string;
  plotId?: string | null;
  productionRecordId?: string | null;
};

export function HarvestClient({
  initialHarvests,
  initialFarmers,
  initialPlots,
  initialProductionRecords,
  variant = "page",
  context,
}: {
  initialHarvests: HarvestRow[];
  initialFarmers: FarmerOption[];
  initialPlots: PlotOption[];
  initialProductionRecords: ProductionRecordOption[];
  variant?: "page" | "embedded";
  context?: HarvestContext;
}) {
  const router = useRouter();
  const [harvests, setHarvests] = useState<HarvestRow[]>(initialHarvests);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [edit, setEdit] = useState<HarvestRow | null>(null);

  const [form, setForm] = useState<FormState>({
    farmerId: "",
    plotId: "",
    productionRecordId: "",
    harvestDate: "",
    crop: "",
    variety: "",
    quantityHarvested: "",
    unit: "",
    harvestMethod: "",
    harvestTeam: "",
    initialQualityGrade: "",
    moistureReading: "",
    supervisorApproved: false,
    supervisorName: "",
    photoUrls: [],
    notes: "",
  });

  useEffect(() => {
    setHarvests(initialHarvests);
  }, [initialHarvests]);

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
    if (!s) return harvests;
    return harvests.filter((h) => {
      const farmer = h.farmer.fullName.toLowerCase();
      const crop = h.crop.toLowerCase();
      const plot = (h.plot.plotName || "").toLowerCase();
      const grade = (h.initialQualityGrade || "").toLowerCase();
      return farmer.includes(s) || crop.includes(s) || plot.includes(s) || grade.includes(s);
    });
  }, [harvests, q]);

  const resetForm = () => {
    setForm({
      farmerId: "",
      plotId: "",
      productionRecordId: "",
      harvestDate: "",
      crop: "",
      variety: "",
      quantityHarvested: "",
      unit: "",
      harvestMethod: "",
      harvestTeam: "",
      initialQualityGrade: "",
      moistureReading: "",
      supervisorApproved: false,
      supervisorName: "",
      photoUrls: [],
      notes: "",
    });
    setEdit(null);
  };

  const uploadHarvestPhotos = async (files: File[]) => {
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
        const url = json?.url ? String(json.url) : "";
        if (!url) throw new Error("Upload failed");
        uploaded.push(url);
      }
      setForm((prev) => ({
        ...prev,
        photoUrls: [...prev.photoUrls, ...uploaded].map(toProxyUrlIfSupabasePublic),
      }));
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
      const prHarvest = pr?.actualHarvestDate || pr?.expectedHarvestDate;
      setForm((prev) => ({
        ...prev,
        farmerId: context.farmerId,
        plotId: context.plotId ? String(context.plotId) : "",
        productionRecordId: context.productionRecordId ? String(context.productionRecordId) : "",
        crop: pr?.cropType || prev.crop,
        variety: pr?.cropVariety || prev.variety,
        harvestDate: prHarvest ? toDateInputValue(prHarvest) : prev.harvestDate,
      }));
    }
    setOpen(true);
  };

  const openEdit = (h: HarvestRow) => {
    setEdit(h);
    setForm({
      farmerId: h.farmerId,
      plotId: h.plotId,
      productionRecordId: h.productionRecordId || "",
      harvestDate: h.harvestDate ? h.harvestDate.slice(0, 10) : "",
      crop: h.crop,
      variety: h.variety || "",
      quantityHarvested: h.quantityHarvested !== null && h.quantityHarvested !== undefined ? String(h.quantityHarvested) : "",
      unit: h.unit || "",
      harvestMethod: h.harvestMethod || "",
      harvestTeam: h.harvestTeam || "",
      initialQualityGrade: h.initialQualityGrade || "",
      moistureReading: h.moistureReading !== null && h.moistureReading !== undefined ? String(h.moistureReading) : "",
      supervisorApproved: !!h.supervisorApproved,
      supervisorName: h.supervisorName || "",
      photoUrls: normalizePhotoUrls(h.photos).map(toProxyUrlIfSupabasePublic),
      notes: h.notes || "",
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
      return `/api/harvest?${qs.toString()}`;
    }
    if (context?.farmerId) qs.set("farmerId", context.farmerId);
    if (context?.plotId) qs.set("plotId", String(context.plotId));
    if (!context?.farmerId && form.farmerId) qs.set("farmerId", form.farmerId);
    if (!context?.plotId && form.plotId) qs.set("plotId", form.plotId);
    if (!context?.productionRecordId && form.productionRecordId) qs.set("productionRecordId", form.productionRecordId);
    return qs.size ? `/api/harvest?${qs.toString()}` : "/api/harvest";
  };

  const submit = async () => {
    if (!form.farmerId) return toast.error("Select a farmer.");
    if (!form.plotId) return toast.error("Select a plot.");
    if (!form.harvestDate) return toast.error("Select harvest date.");
    if (!form.crop.trim()) return toast.error("Enter crop.");

    setSaving(true);
    try {
      const photos = form.photoUrls.length ? form.photoUrls : null;

      const payload: any = {
        farmerId: form.farmerId,
        plotId: form.plotId,
        productionRecordId: form.productionRecordId.trim() ? form.productionRecordId.trim() : null,
        harvestDate: new Date(form.harvestDate).toISOString(),
        crop: form.crop.trim(),
        variety: form.variety.trim() || null,
        quantityHarvested: form.quantityHarvested ? Number(form.quantityHarvested) : null,
        unit: form.unit.trim() || null,
        harvestMethod: form.harvestMethod.trim() || null,
        harvestTeam: form.harvestTeam.trim() || null,
        initialQualityGrade: form.initialQualityGrade.trim() || null,
        moistureReading: form.moistureReading ? Number(form.moistureReading) : null,
        photos,
        supervisorApproved: form.supervisorApproved,
        supervisorName: form.supervisorName.trim() || null,
        notes: form.notes.trim() || null,
      };


      if (edit) {
        delete payload.farmerId;
        delete payload.plotId;
      }

      const res = await apiFetch(edit ? `/api/harvest/${edit.id}` : "/api/harvest", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save harvest record.");

      toast.success(edit ? "Harvest updated" : "Harvest recorded");
      close();
      router.refresh();

      const reload = await apiFetch(getReloadUrl());
      const reloadJson = await reload.json().catch(() => ({}));
      if (reload.ok) setHarvests(reloadJson.harvests || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save harvest record.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (h: HarvestRow) => {
    const ok = confirm("Delete this harvest record? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await apiFetch(`/api/harvest/${h.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete.");
      toast.success("Deleted");
      setHarvests((prev) => prev.filter((x) => x.id !== h.id));
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
                <Wheat className="w-8 h-8 text-primary" />
                Harvest Data
              </h1>
              <p className="text-slate-500 mt-2 font-medium max-w-2xl">
                Record harvest details per plot (quantity, method, moisture, initial grade, supervisor approval).
              </p>
            </div>
            <Button onClick={openCreate} className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              New harvest record
            </Button>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black tracking-tight">Search</CardTitle>
              <CardDescription className="font-medium">Search by farmer, crop, plot, or grade.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search harvest records..."
                  className="pl-12 h-11 rounded-xl bg-white border-slate-200 font-medium"
                />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wheat className="w-5 h-5 text-primary" />
            <div className="font-black tracking-tight text-slate-900">Harvest</div>
          </div>
          <Button onClick={openCreate} className="rounded-xl font-bold h-10 px-4 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((h) => (
          <Card key={h.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-xl font-black tracking-tight truncate">
                    {h.crop}
                    {h.variety ? <span className="text-slate-400"> · {h.variety}</span> : null}
                    {h.supervisorApproved ? <span className="text-emerald-600"> · Approved</span> : null}
                  </CardTitle>
                  <p className="text-slate-500 mt-1 font-medium truncate">
                    <Link href={`/agronomist/farmers/${h.farmerId}`} className="hover:underline">
                      {h.farmer.fullName}
                    </Link>
                    {h.farmer.phone ? ` (${h.farmer.phone})` : ""}
                  </p>
                  <p className="text-xs text-slate-400 font-bold mt-2">
                    Plot: {h.plot.plotName || "Unnamed"} · {format(new Date(h.harvestDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Button type="button" size="icon" variant="outline" className="rounded-xl border-slate-200" onClick={() => openEdit(h)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="rounded-xl border-slate-200" onClick={() => void remove(h)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {h.quantityHarvested !== null && h.quantityHarvested !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-emerald-50 border-emerald-100 text-emerald-700">
                    Qty: {Number(h.quantityHarvested).toFixed(2)}{h.unit ? ` ${h.unit}` : ""}
                  </Badge>
                ) : null}
                {h.moistureReading !== null && h.moistureReading !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-blue-50 border-blue-100 text-blue-700">
                    Moisture: {Number(h.moistureReading).toFixed(1)}
                  </Badge>
                ) : null}
                {h.initialQualityGrade ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-slate-50 border-slate-200 text-slate-700">
                    {h.initialQualityGrade}
                  </Badge>
                ) : null}
                {h.qualityTests?.[0] ? (
                  <Badge
                    variant="outline"
                    className={`rounded-full text-[10px] font-black ${h.qualityTests[0].passed ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"}`}
                  >
                    QC: {h.qualityTests[0].passed ? "Passed" : "Failed"}
                  </Badge>
                ) : null}
              </div>
              <div className="text-xs text-slate-500 font-bold space-y-1">
                {h.harvestMethod ? <div>Method: {h.harvestMethod}</div> : null}
                {h.harvestTeam ? <div>Team: {h.harvestTeam}</div> : null}
                {h.supervisorName ? <div>Supervisor: {h.supervisorName}</div> : null}
                {h.notes ? <div>Notes: {h.notes}</div> : null}
              </div>

              {(() => {
                const urls = normalizePhotoUrls(h.photos).map(toProxyUrlIfSupabasePublic);
                if (!urls.length) return null;
                return (
                  <div className="pt-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Photos</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {urls.slice(0, 6).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <img src={url} alt="Harvest" className="h-20 w-full object-cover" />
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
            <CardContent className="p-12 text-center text-slate-500 font-medium">No harvest records found.</CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[980px] rounded-[2rem] p-0 border-0 shadow-2xl">
          <div className="flex max-h-[85vh] flex-col">
            <div className="p-6 pb-4">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {edit ? "Edit Harvest Record" : "Create Harvest Record"}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground">
                  Capture harvest details for traceability and downstream quality testing and batching.
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
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Production cycle (optional)</Label>
                  <Select
                    value={form.productionRecordId}
                    onValueChange={(v) => {
                      const next = v === "__none__" ? "" : v;
                      const pr = initialProductionRecords.find((x) => x.id === next);
                      const prHarvest = pr?.actualHarvestDate || pr?.expectedHarvestDate;
                      setForm((prev) => ({
                        ...prev,
                        productionRecordId: next,
                        crop: pr?.cropType || prev.crop,
                        variety: pr?.cropVariety || prev.variety,
                        harvestDate: prHarvest ? toDateInputValue(prHarvest) : prev.harvestDate,
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
                      {prsForFarmer.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id} className="rounded-xl font-medium">
                          {prLabel(pr)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Harvest date *</Label>
                  {(() => {
                    const pr = form.productionRecordId
                      ? initialProductionRecords.find((x) => x.id === form.productionRecordId)
                      : null;
                    const locked = Boolean(pr?.actualHarvestDate || pr?.expectedHarvestDate);
                    const hint = pr?.actualHarvestDate ? "From cycle harvest date" : pr?.expectedHarvestDate ? "From cycle expected harvest" : "";
                    return locked && hint ? <div className="text-[10px] font-bold text-slate-500">{hint}</div> : null;
                  })()}
                  <Input
                    type="date"
                    value={form.harvestDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, harvestDate: e.target.value }))}
                    readOnly={Boolean(
                      form.productionRecordId &&
                        (initialProductionRecords.find((x) => x.id === form.productionRecordId)?.actualHarvestDate ||
                          initialProductionRecords.find((x) => x.id === form.productionRecordId)?.expectedHarvestDate),
                    )}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Crop *</Label>
                  <Input
                    value={form.crop}
                    onChange={(e) => setForm((prev) => ({ ...prev, crop: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="e.g., Maize"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Variety</Label>
                  <Input
                    value={form.variety}
                    onChange={(e) => setForm((prev) => ({ ...prev, variety: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity harvested</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.quantityHarvested}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantityHarvested: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm((prev) => ({ ...prev, unit: v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u} className="rounded-xl font-medium">
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Harvest method</Label>
                  <Select value={form.harvestMethod} onValueChange={(v) => setForm((prev) => ({ ...prev, harvestMethod: v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {HARVEST_METHODS.map((m) => (
                        <SelectItem key={m} value={m} className="rounded-xl font-medium">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Harvest team</Label>
                  <Input
                    value={form.harvestTeam}
                    onChange={(e) => setForm((prev) => ({ ...prev, harvestTeam: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Initial quality grade</Label>
                  <Select value={form.initialQualityGrade} onValueChange={(v) => setForm((prev) => ({ ...prev, initialQualityGrade: v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {QUALITY_GRADES.map((g) => (
                        <SelectItem key={g} value={g} className="rounded-xl font-medium">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Moisture reading</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.moistureReading}
                    onChange={(e) => setForm((prev) => ({ ...prev, moistureReading: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supervisor approval</Label>
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Checkbox
                      checked={form.supervisorApproved}
                      onCheckedChange={(v) => setForm((prev) => ({ ...prev, supervisorApproved: v === true }))}
                    />
                    <span className="text-sm font-bold text-slate-800">Approved</span>
                  </label>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supervisor name</Label>
                  <Input
                    value={form.supervisorName}
                    onChange={(e) => setForm((prev) => ({ ...prev, supervisorName: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Harvest photos (optional)</Label>
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
                        await uploadHarvestPhotos(files);
                        if (input && input.isConnected) input.value = "";
                      }}
                    />

                    {form.photoUrls.length ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {form.photoUrls.map((url, idx) => (
                            <Badge
                              key={url}
                              variant="secondary"
                              className="rounded-full cursor-pointer"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  photoUrls: prev.photoUrls.filter((x) => x !== url),
                                }))
                              }
                              title="Click to remove"
                            >
                              {`Photo ${idx + 1}`}
                            </Badge>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {form.photoUrls.slice(0, 6).map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                            >
                              <img src={url} alt="Harvest" className="h-20 w-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
                <Button onClick={() => void submit()} className="h-11 rounded-xl font-bold shadow-lg shadow-primary/20" disabled={saving}>
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
