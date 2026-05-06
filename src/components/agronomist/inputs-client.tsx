"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Package, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
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

type InputRow = {
  id: string;
  farmerId: string;
  plotId: string;
  inputCategory: string;
  productName: string;
  manufacturer: string | null;
  batchNumber: string | null;
  supplier: string | null;
  purchaseDate: string | null;
  expiryDate: string | null;
  quantityUsed: string | number | null;
  quantityUnit: string | null;
  applicationDate: string | null;
  createdAt: string;
  farmer: FarmerOption;
  plot: { id: string; plotName: string | null };
};

const INPUT_CATEGORIES = [
  "Seed",
  "Fertilizer",
  "Herbicide",
  "Insecticide",
  "Fungicide",
  "Soil amendment",
  "Other",
];

const QUANTITY_UNITS = ["kg", "g", "litre (L)", "ml", "bag (50kg)", "bag (25kg)", "sachet", "bottle", "gallon", "piece", "other"];

type FormState = {
  farmerId: string;
  plotId: string;
  inputCategory: string;
  productName: string;
  manufacturer: string;
  batchNumber: string;
  supplier: string;
  purchaseDate: string;
  expiryDate: string;
  quantityUsed: string;
  quantityUnit: string;
  applicationDate: string;
};

function farmerLabel(f: FarmerOption) {
  const c = f.community;
  const loc = c ? `${c.name} · ${c.district.name} · ${c.district.region.name}` : "No community";
  return `${f.fullName}${f.phone ? ` (${f.phone})` : ""} · ${loc}`;
}

function plotLabel(p: PlotOption) {
  const size = p.plotSizeHectare !== null && p.plotSizeHectare !== undefined ? `${Number(p.plotSizeHectare).toFixed(2)} ha` : "size N/A";
  return `${p.plotName || "Unnamed plot"} · ${size}`;
}

type InputsContext = {
  farmerId: string;
  plotId?: string | null;
};

export function InputsClient({
  initialInputs,
  initialFarmers,
  initialPlots,
  variant = "page",
  context,
}: {
  initialInputs: InputRow[];
  initialFarmers: FarmerOption[];
  initialPlots: PlotOption[];
  variant?: "page" | "embedded";
  context?: InputsContext;
}) {
  const router = useRouter();
  const [inputs, setInputs] = useState<InputRow[]>(initialInputs);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<InputRow | null>(null);

  const [form, setForm] = useState<FormState>({
    farmerId: "",
    plotId: "",
    inputCategory: "",
    productName: "",
    manufacturer: "",
    batchNumber: "",
    supplier: "",
    purchaseDate: "",
    expiryDate: "",
    quantityUsed: "",
    quantityUnit: "",
    applicationDate: "",
  });

  useEffect(() => {
    setInputs(initialInputs);
  }, [initialInputs]);

  useEffect(() => {
    if (variant === "embedded") setQ("");
  }, [variant, context?.farmerId, context?.plotId]);

  const farmerOptions = useMemo(
    () => [...initialFarmers].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [initialFarmers],
  );

  const plotsForFarmer = useMemo(() => {
    if (!form.farmerId) return [];
    return initialPlots.filter((p) => p.farmerId === form.farmerId);
  }, [initialPlots, form.farmerId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return inputs;
    return inputs.filter((i) => {
      const farmer = i.farmer.fullName.toLowerCase();
      const cat = i.inputCategory.toLowerCase();
      const product = i.productName.toLowerCase();
      const batch = (i.batchNumber || "").toLowerCase();
      return farmer.includes(s) || cat.includes(s) || product.includes(s) || batch.includes(s);
    });
  }, [inputs, q]);

  const resetForm = () => {
    setForm({
      farmerId: "",
      plotId: "",
      inputCategory: "",
      productName: "",
      manufacturer: "",
      batchNumber: "",
      supplier: "",
      purchaseDate: "",
      expiryDate: "",
      quantityUsed: "",
      quantityUnit: "",
      applicationDate: "",
    });
    setEdit(null);
  };

  const openCreate = () => {
    resetForm();
    if (context) {
      setForm((prev) => ({
        ...prev,
        farmerId: context.farmerId,
        plotId: context.plotId ? String(context.plotId) : "",
      }));
    }
    setOpen(true);
  };

  const openEdit = (i: InputRow) => {
    setEdit(i);
    setForm({
      farmerId: i.farmerId,
      plotId: i.plotId,
      inputCategory: i.inputCategory,
      productName: i.productName,
      manufacturer: i.manufacturer || "",
      batchNumber: i.batchNumber || "",
      supplier: i.supplier || "",
      purchaseDate: i.purchaseDate ? i.purchaseDate.slice(0, 10) : "",
      expiryDate: i.expiryDate ? i.expiryDate.slice(0, 10) : "",
      quantityUsed: i.quantityUsed !== null && i.quantityUsed !== undefined ? String(i.quantityUsed) : "",
      quantityUnit: i.quantityUnit || "",
      applicationDate: i.applicationDate ? i.applicationDate.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  const getReloadUrl = () => {
    const qs = new URLSearchParams();
    if (context?.farmerId) qs.set("farmerId", context.farmerId);
    if (context?.plotId) qs.set("plotId", String(context.plotId));
    if (!context?.farmerId && form.farmerId) qs.set("farmerId", form.farmerId);
    if (!context?.plotId && form.plotId) qs.set("plotId", form.plotId);
    return qs.size ? `/api/inputs?${qs.toString()}` : "/api/inputs";
  };

  const submit = async () => {
    if (!form.farmerId) return toast.error("Select a farmer.");
    if (!form.plotId) return toast.error("Select a plot.");
    if (!form.inputCategory) return toast.error("Select input category.");
    if (!form.productName.trim()) return toast.error("Enter product name.");

    setSaving(true);
    try {
      const payload: any = {
        farmerId: form.farmerId,
        plotId: form.plotId,
        inputCategory: form.inputCategory,
        productName: form.productName.trim(),
        manufacturer: form.manufacturer.trim() || null,
        batchNumber: form.batchNumber.trim() || null,
        supplier: form.supplier.trim() || null,
        purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : null,
        expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
        quantityUsed: form.quantityUsed ? Number(form.quantityUsed) : null,
        quantityUnit: form.quantityUnit.trim() || null,
        applicationDate: form.applicationDate ? new Date(form.applicationDate).toISOString() : null,
      };

      if (edit) {
        delete payload.farmerId;
        delete payload.plotId;
      }

      const res = await apiFetch(edit ? `/api/inputs/${edit.id}` : "/api/inputs", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save input record.");

      toast.success(edit ? "Input updated" : "Input recorded");
      close();
      router.refresh();

      const reload = await apiFetch(getReloadUrl());
      const reloadJson = await reload.json().catch(() => ({}));
      if (reload.ok) setInputs(reloadJson.inputs || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save input record.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (i: InputRow) => {
    const ok = confirm("Delete this input record? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await apiFetch(`/api/inputs/${i.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete.");
      toast.success("Deleted");
      setInputs((prev) => prev.filter((x) => x.id !== i.id));
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
                <Package className="w-8 h-8 text-primary" />
                Input Traceability
              </h1>
              <p className="text-slate-500 mt-2 font-medium max-w-2xl">
                Record inputs used per plot (manufacturer, batch number, supplier, purchase/expiry, usage and application date).
              </p>
            </div>
            <Button onClick={openCreate} className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              New input record
            </Button>
          </div>

          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="text-lg font-black tracking-tight">Search</CardTitle>
              <CardDescription className="font-medium">Search by farmer, category, product, or batch number.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search inputs..."
                  className="pl-12 h-11 rounded-xl bg-white border-slate-200 font-medium"
                />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <div className="font-black tracking-tight text-slate-900">Inputs</div>
          </div>
          <Button onClick={openCreate} className="rounded-xl font-bold h-10 px-4 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((i) => (
          <Card key={i.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-xl font-black tracking-tight truncate">
                    {i.productName}
                    <span className="text-slate-400"> · {i.inputCategory}</span>
                  </CardTitle>
                  <p className="text-slate-500 mt-1 font-medium">
                    <Link href={`/agronomist/farmers/${i.farmerId}`} className="hover:underline">
                      {i.farmer.fullName}
                    </Link>
                    {i.farmer.phone ? ` (${i.farmer.phone})` : ""}
                  </p>
                  <p className="text-xs text-slate-400 font-bold mt-2">
                    Plot: {i.plot.plotName || "Unnamed"}
                    {i.applicationDate ? ` · Applied ${format(new Date(i.applicationDate), "MMM d, yyyy")}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => openEdit(i)}
                    aria-label="Edit input"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="rounded-xl border-slate-200"
                    onClick={() => void remove(i)}
                    aria-label="Delete input"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {i.batchNumber ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-white border-slate-200">
                    Batch: {i.batchNumber}
                  </Badge>
                ) : null}
                {i.manufacturer ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-slate-50 border-slate-200 text-slate-700">
                    {i.manufacturer}
                  </Badge>
                ) : null}
                {i.quantityUsed !== null && i.quantityUsed !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-emerald-50 border-emerald-100 text-emerald-700">
                    Used: {Number(i.quantityUsed).toFixed(2)}{i.quantityUnit ? ` ${i.quantityUnit}` : ""}
                  </Badge>
                ) : null}
              </div>

              <div className="text-xs text-slate-500 font-bold space-y-1">
                {i.supplier ? <div>Supplier: {i.supplier}</div> : null}
                {i.purchaseDate ? <div>Purchased: {format(new Date(i.purchaseDate), "MMM d, yyyy")}</div> : null}
                {i.expiryDate ? <div>Expiry: {format(new Date(i.expiryDate), "MMM d, yyyy")}</div> : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden lg:col-span-2">
            <CardContent className="p-12 text-center text-slate-500 font-medium">No input records found.</CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[920px] rounded-[2rem] p-0 border-0 shadow-2xl">
          <div className="flex max-h-[85vh] flex-col">
            <div className="p-6 pb-4">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">
                  {edit ? "Edit Input Record" : "Create Input Record"}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground">
                  Record input details for traceability (manufacturer, batch number, supplier, dates, usage).
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Farmer *</Label>
                  <Select
                    value={form.farmerId}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, farmerId: v, plotId: "" }))}
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

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</Label>
                  <Select value={form.inputCategory} onValueChange={(v) => setForm((prev) => ({ ...prev, inputCategory: v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {INPUT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="rounded-xl font-medium">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product name *</Label>
                  <Input
                    value={form.productName}
                    onChange={(e) => setForm((prev) => ({ ...prev, productName: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="e.g., NPK 15-15-15"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manufacturer</Label>
                  <Input
                    value={form.manufacturer}
                    onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Batch number</Label>
                  <Input
                    value={form.batchNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, batchNumber: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supplier</Label>
                  <Input
                    value={form.supplier}
                    onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purchase date</Label>
                  <Input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expiry date</Label>
                  <Input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity used</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.quantityUsed}
                    onChange={(e) => setForm((prev) => ({ ...prev, quantityUsed: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit</Label>
                  <Select value={form.quantityUnit} onValueChange={(v) => setForm((prev) => ({ ...prev, quantityUnit: v }))}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {QUANTITY_UNITS.map((u) => (
                        <SelectItem key={u} value={u} className="rounded-xl font-medium">
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Application date</Label>
                  <Input
                    type="date"
                    value={form.applicationDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, applicationDate: e.target.value }))}
                    className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold"
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
