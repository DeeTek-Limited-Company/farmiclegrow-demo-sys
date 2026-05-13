"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sprout, Activity, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CROP_OPTIONS } from "@/lib/crops";
import { getNorthernGhanaSeasonOptions } from "@/lib/seasons";

interface ProductionRecordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editRecord?: any;
  initialFarmers?: any[];
}

const SEASONS = getNorthernGhanaSeasonOptions();

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned", icon: <Clock className="w-3 h-3 mr-1" />, color: "bg-slate-100 text-slate-600" },
  { value: "ACTIVE", label: "Active Growth", icon: <Activity className="w-3 h-3 mr-1" />, color: "bg-blue-100 text-blue-600" },
  { value: "HARVESTED", label: "Harvested", icon: <Sprout className="w-3 h-3 mr-1" />, color: "bg-amber-100 text-amber-600" },
  { value: "COMPLETED", label: "Completed", icon: <CheckCircle2 className="w-3 h-3 mr-1" />, color: "bg-emerald-100 text-emerald-600" },
];

const FARMING_METHODS = ["Conventional", "Organic Farming", "Conservation Agriculture", "Agroforestry"];
const IRRIGATION_TYPES = ["Rainfed", "Drip Irrigation", "Sprinkler", "Canal/Surface"];

export function ProductionRecordForm({
  open,
  onOpenChange,
  onSuccess,
  editRecord,
  initialFarmers,
}: ProductionRecordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [farmersLoading, setFarmersLoading] = useState(false);
  const [farmers, setFarmers] = useState<any[]>(() => initialFarmers ?? []);
  const [plots, setPlots] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    farmerId: "",
    plotId: "",
    season: "",
    cropType: "",
    cropVariety: "",
    status: "PLANNED",
    plantingDate: "",
    expectedHarvestDate: "",
    actualHarvestDate: "",
    expectedYieldTon: "",
    quantityTon: "",
    actualYieldTon: "",
    farmSizeHectares: "",
    farmingMethod: "",
    irrigationType: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      if (!initialFarmers?.length) {
        fetchFarmers();
      } else {
        setFarmers(initialFarmers);
      }
      if (editRecord) {
        setFormData({
          farmerId: editRecord.farmerId || "",
          plotId: editRecord.plotId || "",
          season: editRecord.season || "",
          cropType: editRecord.cropType || "",
          cropVariety: editRecord.cropVariety || "",
          status: editRecord.status || "PLANNED",
          plantingDate: editRecord.plantingDate?.split("T")[0] || "",
          expectedHarvestDate: editRecord.expectedHarvestDate?.split("T")[0] || "",
          actualHarvestDate: editRecord.actualHarvestDate?.split("T")[0] || "",
          expectedYieldTon: editRecord.expectedYieldTon?.toString() || "",
          quantityTon: editRecord.quantityTon?.toString() || "",
          actualYieldTon: editRecord.actualYieldTon?.toString() || "",
          farmSizeHectares: editRecord.farmSizeHectares?.toString() || "",
          farmingMethod: editRecord.farmingMethod || "",
          irrigationType: editRecord.irrigationType || "",
          notes: editRecord.notes || "",
        });
      } else {
        resetForm();
      }
    }
  }, [open, editRecord, initialFarmers]);

  const fetchPlots = async (farmerId: string) => {
    try {
      const res = await apiFetch(`/api/plots?farmerId=${encodeURIComponent(farmerId)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPlots(data.plots || []);
      } else {
        setPlots([]);
      }
    } catch {
      setPlots([]);
    }
  };

  const fetchFarmers = async () => {
    setFarmersLoading(true);
    try {
      const res = await apiFetch("/api/farmers?minimal=1&take=500");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFarmers([]);
        toast.error(data?.message || "Failed to load farmers");
        return;
      }

      setFarmers(data.farmers || []);
    } catch (error) {
      setFarmers([]);
      toast.error("Failed to load farmers");
    }
    finally {
      setFarmersLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    if (!formData.farmerId) {
      setPlots([]);
      return;
    }
    void fetchPlots(formData.farmerId);
  }, [open, formData.farmerId]);

  const resetForm = () => {
    setFormData({
      farmerId: "",
      plotId: "",
      season: "",
      cropType: "",
      cropVariety: "",
      status: "PLANNED",
      plantingDate: "",
      expectedHarvestDate: "",
      actualHarvestDate: "",
      expectedYieldTon: "",
      quantityTon: "",
      actualYieldTon: "",
      farmSizeHectares: "",
      farmingMethod: "",
      irrigationType: "",
      notes: "",
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        plotId: formData.plotId ? formData.plotId : null,
        cropVariety: formData.cropVariety.trim() || null,
        expectedYieldTon: formData.expectedYieldTon ? parseFloat(formData.expectedYieldTon) : null,
        quantityTon: formData.quantityTon ? parseFloat(formData.quantityTon) : null,
        actualYieldTon: formData.actualYieldTon ? parseFloat(formData.actualYieldTon) : null,
        farmSizeHectares: formData.farmSizeHectares ? parseFloat(formData.farmSizeHectares) : null,
        plantingDate: formData.plantingDate ? new Date(formData.plantingDate).toISOString() : null,
        expectedHarvestDate: formData.expectedHarvestDate ? new Date(formData.expectedHarvestDate).toISOString() : null,
        actualHarvestDate: formData.actualHarvestDate ? new Date(formData.actualHarvestDate).toISOString() : null,
      };

      const url = editRecord
        ? `/api/production/${editRecord.id}`
        : "/api/production";
      const method = editRecord ? "PATCH" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errors = data?.errors ? JSON.stringify(data.errors) : "";
        throw new Error(data?.message ? `${data.message}${errors ? `: ${errors}` : ""}` : "Failed to save record");
      }

      toast.success(
        editRecord
          ? "Production record updated successfully!"
          : "Production record created successfully!"
      );
      onOpenChange(false);
      onSuccess();
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const isHarvestPhase = formData.status === "HARVESTED" || formData.status === "COMPLETED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-emerald-600 to-green-700 p-6 sm:p-8 text-white relative">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <Sprout className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl sm:text-3xl font-black tracking-tight">
                {editRecord ? "Update Lifecycle" : "Start Farming Cycle"}
              </DialogTitle>
              <p className="text-[10px] sm:text-sm text-emerald-50 font-medium opacity-90 mt-0.5 sm:mt-1">
                {editRecord ? "Updating record for the current season" : "Create a new production record at planting"}
              </p>
            </div>
          </div>
          
          {/* Status Badge in Header */}
          <div className="absolute top-8 right-8">
            <Badge variant="outline" className="bg-white/10 border-white/20 text-white font-black px-4 py-1 rounded-full uppercase tracking-widest text-[10px]">
              {formData.status}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto bg-white">
          {/* Section: Core Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-1 bg-emerald-500 rounded-full" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Core Information</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Farmer *
                </Label>
                <Select
                  value={formData.farmerId}
                  onValueChange={(value) => {
                    const selected = farmers.find((f) => f.id === value);
                    setFormData((prev) => ({
                      ...prev,
                      farmerId: value,
                      plotId: "",
                      cropType: selected?.primaryCrop ? String(selected.primaryCrop) : prev.cropType,
                    }));
                    void fetchPlots(value);
                  }}
                  disabled={!!editRecord}
                  required
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold focus:ring-emerald-500/20 transition-all">
                    <SelectValue placeholder={farmersLoading ? "Loading farmers..." : "Select a farmer..."} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                    {!farmersLoading && farmers.length === 0 ? (
                      <SelectItem value="__none__" disabled className="rounded-xl my-1 font-medium">
                        No farmers found
                      </SelectItem>
                    ) : null}
                    {farmers.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="rounded-xl my-1 font-medium">
                        {f.fullName} {f.phone ? `(${f.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Plot *
                </Label>
                <Select
                  value={formData.plotId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, plotId: value }))}
                  required
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold focus:ring-emerald-500/20 transition-all">
                    <SelectValue placeholder={formData.farmerId ? "Select a plot..." : "Select a farmer first"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                    {plots.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="rounded-xl my-1 font-medium">
                        {p.plotName || "Unnamed plot"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Cycle Status *
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  required
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold focus:ring-emerald-500/20 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="rounded-xl my-1">
                        <div className="flex items-center gap-2 font-bold">
                          {opt.icon}
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Season *
                </Label>
                <Select
                  value={formData.season}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, season: v }))}
                  required
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                    <SelectValue placeholder="Season" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    {SEASONS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="rounded-xl font-medium">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Crop *
                </Label>
                <Select
                  value={formData.cropType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, cropType: v }))}
                  required
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                    <SelectValue placeholder="Crop" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    {CROP_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c} className="rounded-xl font-medium">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Variety{" "}
                  <span className="text-slate-400 font-semibold normal-case tracking-normal">(optional)</span>
                </Label>
                <Input
                  name="cropVariety"
                  value={formData.cropVariety}
                  onChange={handleChange}
                  placeholder="e.g., Local yellow, hybrids…"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section: Timeline & Yield Planning */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-1 bg-blue-500 rounded-full" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Timeline & Planning</h4>
            </div>
            <p className="text-xs font-medium text-slate-500 -mt-2 mb-2">
              Set planting and expected harvest early; finalize harvest dates and tonnage when the crop comes in (status
              HARVESTED / COMPLETED).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Planting Date
                </Label>
                <Input
                  type="date"
                  name="plantingDate"
                  value={formData.plantingDate}
                  onChange={handleChange}
                  className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Expected Harvest
                </Label>
                <Input
                  type="date"
                  name="expectedHarvestDate"
                  value={formData.expectedHarvestDate}
                  onChange={handleChange}
                  className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 text-blue-600">
                  Expected Yield (T)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  name="expectedYieldTon"
                  value={formData.expectedYieldTon}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="h-14 rounded-2xl bg-blue-50/30 border-blue-100 font-bold text-blue-700"
                />
              </div>
            </div>
          </div>

          {/* Section: Actual Harvest Data (Conditional) */}
          {isHarvestPhase && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500 p-6 bg-emerald-50/30 rounded-[2rem] border border-emerald-100/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-4 w-1 bg-amber-500 rounded-full" />
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Harvest Results</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                    Actual Harvest Date
                  </Label>
                  <Input
                    type="date"
                    name="actualHarvestDate"
                    value={formData.actualHarvestDate}
                    onChange={handleChange}
                    className="h-14 rounded-2xl bg-white border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 text-amber-600">
                    Harvested qty (total collected, T)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="quantityTon"
                    value={formData.quantityTon}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="h-14 rounded-2xl bg-white border-amber-100 font-bold text-amber-700 shadow-sm shadow-amber-200/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1 text-emerald-600">
                    Usable yield (clean / marketable, T)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    name="actualYieldTon"
                    value={formData.actualYieldTon}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="h-14 rounded-2xl bg-white border-emerald-100 font-bold text-emerald-700 shadow-sm shadow-emerald-200/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Farming Practices */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-1 bg-slate-400 rounded-full" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Practices & Methods</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Method
                </Label>
                <Select
                  value={formData.farmingMethod}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, farmingMethod: v }))}
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    {FARMING_METHODS.map((m) => (
                      <SelectItem key={m} value={m} className="rounded-xl font-medium">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Irrigation
                </Label>
                <Select
                  value={formData.irrigationType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, irrigationType: v }))}
                >
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                    <SelectValue placeholder="Irrigation" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100">
                    {IRRIGATION_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="rounded-xl font-medium">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                  Farm area used (ha)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  name="farmSizeHectares"
                  value={formData.farmSizeHectares}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-200 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                Notes / Observations
              </Label>
              <Textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Weather conditions, pest challenges, general observations..."
                rows={3}
                className="rounded-[1.5rem] bg-slate-50 border-slate-200 font-bold p-4 resize-none focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <DialogFooter className="p-4 sm:pt-8 border-t border-slate-100 sticky bottom-0 bg-white flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl font-black h-12 sm:h-14 px-6 sm:px-10 border-slate-200 hover:bg-slate-50 text-slate-500 w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-2xl font-black h-12 sm:h-14 px-6 sm:px-10 bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/40 transition-all border-0 w-full sm:w-auto order-1 sm:order-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Processing...
                </>
              ) : editRecord ? (
                "Update Cycle"
              ) : (
                "Start Cycle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
