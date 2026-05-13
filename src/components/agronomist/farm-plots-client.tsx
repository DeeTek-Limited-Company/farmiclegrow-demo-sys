"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Plus, Map, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type FarmerOption = {
  id: string;
  fullName: string;
  phone: string | null;
  community: { name: string; district: { name: string; region: { name: string } } } | null;
};

type PlotRow = {
  id: string;
  farmerId: string;
  plotName: string | null;
  plotSizeHectare: string | number | null;
  soilType: string | null;
  irrigationSource: string | null;
  previousCrop: string | null;
  currentCrop: string | null;
  plantingSeason: string | null;
  ownershipType: string | null;
  landDocumentAvailable: boolean | null;
  environmentalRiskLevel: string | null;
  createdAt: string;
  farmer: {
    fullName: string;
    phone: string | null;
    community: { name: string; district: { name: string; region: { name: string } } } | null;
  };
};

const SOIL_TYPES = ["Sandy", "Loamy", "Clay", "Sandy loam", "Clay loam", "Silt", "Other"];
const IRRIGATION_SOURCES = ["Rainfed", "Borehole", "River/Stream", "Dam/Reservoir", "Canal", "Drip", "Sprinkler", "Other"];
const OWNERSHIP_TYPES = ["Owned", "Family land", "Lease", "Tenant", "Sharecropping", "Other"];
const RISK_LEVELS = ["Low", "Medium", "High", "Very High"];

type FormState = {
  farmerId: string;
  plotName: string;
  plotSizeHectare: string;
  soilType: string;
  irrigationSource: string;
  previousCrop: string;
  currentCrop: string;
  plantingSeason: string;
  ownershipType: string;
  landDocumentAvailable: boolean;
  environmentalRiskLevel: string;
};

function formatLocation(f: FarmerOption) {
  const c = f.community;
  if (!c) return "No community";
  return `${c.name} · ${c.district.name} · ${c.district.region.name}`;
}

export function FarmPlotsClient({
  initialPlots,
  initialFarmers,
}: {
  initialPlots: PlotRow[];
  initialFarmers: FarmerOption[];
}) {
  const router = useRouter();
  const [plots, setPlots] = useState<PlotRow[]>(initialPlots);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<PlotRow | null>(null);

  const [form, setForm] = useState<FormState>({
    farmerId: "",
    plotName: "",
    plotSizeHectare: "",
    soilType: "",
    irrigationSource: "",
    previousCrop: "",
    currentCrop: "",
    plantingSeason: "",
    ownershipType: "",
    landDocumentAvailable: false,
    environmentalRiskLevel: "",
  });

  const farmerOptions = useMemo(() => {
    return [...initialFarmers].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [initialFarmers]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return plots;
    return plots.filter((p) => {
      const farmerName = p.farmer.fullName.toLowerCase();
      const plotName = (p.plotName || "").toLowerCase();
      const district = p.farmer.community?.district.name.toLowerCase() || "";
      const community = p.farmer.community?.name.toLowerCase() || "";
      return (
        farmerName.includes(s) ||
        plotName.includes(s) ||
        district.includes(s) ||
        community.includes(s)
      );
    });
  }, [plots, q]);

  const resetForm = () => {
    setForm({
      farmerId: "",
      plotName: "",
      plotSizeHectare: "",
      soilType: "",
      irrigationSource: "",
      previousCrop: "",
      currentCrop: "",
      plantingSeason: "",
      ownershipType: "",
      landDocumentAvailable: false,
      environmentalRiskLevel: "",
    });
    setEdit(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (p: PlotRow) => {
    setEdit(p);
    setForm({
      farmerId: p.farmerId,
      plotName: p.plotName || "",
      plotSizeHectare: p.plotSizeHectare !== null && p.plotSizeHectare !== undefined ? String(p.plotSizeHectare) : "",
      soilType: p.soilType || "",
      irrigationSource: p.irrigationSource || "",
      previousCrop: p.previousCrop || "",
      currentCrop: p.currentCrop || "",
      plantingSeason: p.plantingSeason || "",
      ownershipType: p.ownershipType || "",
      landDocumentAvailable: !!p.landDocumentAvailable,
      environmentalRiskLevel: p.environmentalRiskLevel || "",
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  const submit = async () => {
    if (!form.farmerId) {
      toast.error("Select a farmer.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        farmerId: form.farmerId,
        plotName: form.plotName.trim() || null,
        plotSizeHectare: form.plotSizeHectare ? Number(form.plotSizeHectare) : null,
        soilType: form.soilType.trim() || null,
        irrigationSource: form.irrigationSource.trim() || null,
        previousCrop: form.previousCrop.trim() || null,
        currentCrop: form.currentCrop.trim() || null,
        plantingSeason: form.plantingSeason.trim() || null,
        ownershipType: form.ownershipType.trim() || null,
        landDocumentAvailable: form.landDocumentAvailable,
        environmentalRiskLevel: form.environmentalRiskLevel.trim() || null,
      };

      if (edit) {
        delete payload.farmerId;
      }

      const res = await apiFetch(edit ? `/api/plots/${edit.id}` : "/api/plots", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to save plot.");
      }

      toast.success(edit ? "Plot updated" : "Plot created");
      close();
      router.refresh();

      const reload = await apiFetch("/api/plots");
      const reloadJson = await reload.json().catch(() => ({}));
      if (reload.ok) setPlots(reloadJson.plots || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save plot.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: PlotRow) => {
    const ok = confirm("Delete this plot? This cannot be undone.");
    if (!ok) return;

    try {
      const res = await apiFetch(`/api/plots/${p.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete plot.");
      toast.success("Plot deleted");
      setPlots((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete plot.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Map className="w-8 h-8 text-primary" />
            Farm Plots
          </h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl">
            Register and manage farm plots (Plot ID) for accurate traceability and field activity logging.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openCreate} className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            New plot
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-black tracking-tight">Search</CardTitle>
          <CardDescription className="font-medium">Search by farmer, plot name, district, or community.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search plots..."
            className="h-11 rounded-xl bg-white border-slate-200 font-medium"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((p) => (
          <Card key={p.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-xl font-black tracking-tight truncate">
                    {p.plotName || "Unnamed plot"}
                  </CardTitle>
                  <p className="text-slate-500 mt-1 font-medium">
                    {p.farmer.fullName} {p.farmer.phone ? `(${p.farmer.phone})` : ""}
                  </p>
                  <p className="text-xs text-slate-400 font-bold mt-2">
                    {p.farmer.community
                      ? `${p.farmer.community.name} · ${p.farmer.community.district.name} · ${p.farmer.community.district.region.name}`
                      : "No community"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => openEdit(p)}
                    aria-label="Edit plot"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => void remove(p)}
                    aria-label="Delete plot"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {p.plotSizeHectare !== null && p.plotSizeHectare !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-white border-slate-200">
                    {Number(p.plotSizeHectare).toFixed(2)} ha
                  </Badge>
                ) : null}
                {p.soilType ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-slate-50 border-slate-200">
                    {p.soilType}
                  </Badge>
                ) : null}
                {p.irrigationSource ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-blue-50 border-blue-100 text-blue-700">
                    {p.irrigationSource}
                  </Badge>
                ) : null}
                {p.environmentalRiskLevel ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-amber-50 border-amber-100 text-amber-700">
                    Risk: {p.environmentalRiskLevel}
                  </Badge>
                ) : null}
              </div>

              <div className="text-xs text-slate-500 font-bold space-y-1">
                {p.currentCrop ? <div>Current crop: {p.currentCrop}</div> : null}
                {p.previousCrop ? <div>Previous crop: {p.previousCrop}</div> : null}
                {p.plantingSeason ? <div>Planting season: {p.plantingSeason}</div> : null}
                {p.ownershipType ? <div>Ownership: {p.ownershipType}</div> : null}
                <div>Land document: {p.landDocumentAvailable ? "Available" : "Not available"}</div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 ? (
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden lg:col-span-2">
            <CardContent className="p-12 text-center text-slate-500 font-medium">
              No plots found.
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[760px] rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-hidden">
          <div className="flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-4 sm:p-8 sm:pb-6 bg-slate-50/50 border-b border-slate-100">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">
                {edit ? "Edit Plot" : "Register Farm Plot"}
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                Capture plot-level data that will power planting, harvest, quality testing, and movement logs.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Farmer *
                  </Label>
                  <Select
                    value={form.farmerId}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, farmerId: v }))}
                    disabled={!!edit}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Select a farmer..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                      {farmerOptions.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="rounded-xl font-medium">
                          {f.fullName} {f.phone ? `(${f.phone})` : ""} · {formatLocation(f)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Plot name
                  </Label>
                  <Input
                    value={form.plotName}
                    onChange={(e) => setForm((prev) => ({ ...prev, plotName: e.target.value }))}
                    placeholder="e.g., North field"
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Plot size (hectares)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.plotSizeHectare}
                    onChange={(e) => setForm((prev) => ({ ...prev, plotSizeHectare: e.target.value }))}
                    placeholder="0.00"
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Soil type
                  </Label>
                  <Select value={form.soilType} onValueChange={(v) => setForm((prev) => ({ ...prev, soilType: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Soil type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                      {SOIL_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-xl font-medium">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Irrigation source
                  </Label>
                  <Select
                    value={form.irrigationSource}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, irrigationSource: v }))}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Irrigation" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                      {IRRIGATION_SOURCES.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-xl font-medium">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Previous crop
                  </Label>
                  <Input
                    value={form.previousCrop}
                    onChange={(e) => setForm((prev) => ({ ...prev, previousCrop: e.target.value }))}
                    placeholder="e.g., maize"
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Current crop
                  </Label>
                  <Input
                    value={form.currentCrop}
                    onChange={(e) => setForm((prev) => ({ ...prev, currentCrop: e.target.value }))}
                    placeholder="e.g., rice"
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Planting season
                  </Label>
                  <Input
                    value={form.plantingSeason}
                    onChange={(e) => setForm((prev) => ({ ...prev, plantingSeason: e.target.value }))}
                    placeholder="e.g., 2026 Main"
                    className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Ownership type
                  </Label>
                  <Select value={form.ownershipType} onValueChange={(v) => setForm((prev) => ({ ...prev, ownershipType: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Ownership" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                      {OWNERSHIP_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-xl font-medium">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Environmental risk level
                  </Label>
                  <Select
                    value={form.environmentalRiskLevel}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, environmentalRiskLevel: v }))}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Risk level" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                      {RISK_LEVELS.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-xl font-medium">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Land document available
                  </Label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Checkbox
                      checked={form.landDocumentAvailable}
                      onCheckedChange={(v) => setForm((prev) => ({ ...prev, landDocumentAvailable: v === true }))}
                    />
                    <span className="text-sm font-bold text-slate-800">Yes</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                onClick={close} 
                className="h-12 rounded-2xl font-black border-slate-200 w-full sm:w-auto order-2 sm:order-1" 
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void submit()}
                className="h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black shadow-xl shadow-primary/20 w-full sm:w-auto order-1 sm:order-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : edit ? (
                  "Save Changes"
                ) : (
                  "Create Plot"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
