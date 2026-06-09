"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Handshake, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
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
import { buildInternalOrgTracePath } from "@/lib/trace/urls";

type BatchOption = {
  id: string;
  batchId: string;
  crop: string;
  quantity: string | number;
  harvestDate: string;
  farmer: { id: string; fullName: string; phone: string | null };
};

type SaleRow = {
  id: string;
  batchId: string;
  buyerName: string;
  buyerType: string | null;
  quantitySold: string | number | null;
  pricePerUnit: string | number | null;
  totalValue: string | number | null;
  dateSold: string;
  destination: string | null;
  paymentStatus: string | null;
  batch: BatchOption;
};

type FormState = {
  batchId: string;
  buyerName: string;
  buyerType: string;
  quantitySold: string;
  pricePerUnit: string;
  totalValue: string;
  dateSold: string;
  destination: string;
  paymentStatus: string;
};

const BUYER_TYPES = ["Aggregator", "Exporter", "Processor", "Retailer", "Individual", "Other"];
const PAYMENT_STATUSES = ["Pending", "Paid", "Part-payment", "Overdue", "Refunded", "Other"];

function batchLabel(b: BatchOption) {
  const date = b.harvestDate ? format(new Date(b.harvestDate), "MMM d, yyyy") : "Date?";
  return `${b.batchId} · ${b.crop} · ${Number(b.quantity).toFixed(2)} · Harvest ${date} · ${b.farmer.fullName}`;
}

export function SalesClient({
  initialBatches,
  initialSales,
}: {
  initialBatches: BatchOption[];
  initialSales: SaleRow[];
}) {
  const params = useParams<{ orgSlug: string }>();
  const orgSlug = String(params.orgSlug || "");
  const router = useRouter();
  const [sales, setSales] = useState<SaleRow[]>(initialSales);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<SaleRow | null>(null);

  const [form, setForm] = useState<FormState>({
    batchId: "",
    buyerName: "",
    buyerType: "",
    quantitySold: "",
    pricePerUnit: "",
    totalValue: "",
    dateSold: "",
    destination: "",
    paymentStatus: "",
  });

  const batchOptions = useMemo(() => {
    return [...initialBatches].sort((a, b) => b.batchId.localeCompare(a.batchId));
  }, [initialBatches]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return sales;
    return sales.filter((x) => {
      const batch = x.batch.batchId.toLowerCase();
      const farmer = x.batch.farmer.fullName.toLowerCase();
      const buyer = x.buyerName.toLowerCase();
      const dest = (x.destination || "").toLowerCase();
      return batch.includes(s) || farmer.includes(s) || buyer.includes(s) || dest.includes(s);
    });
  }, [sales, q]);

  const resetForm = () => {
    setForm({
      batchId: "",
      buyerName: "",
      buyerType: "",
      quantitySold: "",
      pricePerUnit: "",
      totalValue: "",
      dateSold: "",
      destination: "",
      paymentStatus: "",
    });
    setEdit(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (s: SaleRow) => {
    setEdit(s);
    setForm({
      batchId: s.batchId,
      buyerName: s.buyerName,
      buyerType: s.buyerType || "",
      quantitySold: s.quantitySold !== null && s.quantitySold !== undefined ? String(s.quantitySold) : "",
      pricePerUnit: s.pricePerUnit !== null && s.pricePerUnit !== undefined ? String(s.pricePerUnit) : "",
      totalValue: s.totalValue !== null && s.totalValue !== undefined ? String(s.totalValue) : "",
      dateSold: s.dateSold ? s.dateSold.slice(0, 10) : "",
      destination: s.destination || "",
      paymentStatus: s.paymentStatus || "",
    });
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    resetForm();
  };

  const submit = async () => {
    if (!form.batchId) return toast.error("Select a batch.");
    if (!form.buyerName.trim()) return toast.error("Enter buyer name.");
    if (!form.dateSold) return toast.error("Select date sold.");

    setSaving(true);
    try {
      const payload: any = {
        batchId: form.batchId,
        buyerName: form.buyerName.trim(),
        buyerType: form.buyerType.trim() || null,
        quantitySold: form.quantitySold ? Number(form.quantitySold) : null,
        pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : null,
        totalValue: form.totalValue ? Number(form.totalValue) : null,
        dateSold: new Date(form.dateSold).toISOString(),
        destination: form.destination.trim() || null,
        paymentStatus: form.paymentStatus.trim() || null,
      };

      if (edit) delete payload.batchId;

      const res = await apiFetch(edit ? `/api/sales/${edit.id}` : "/api/sales", {
        method: edit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save sale record.");

      toast.success(edit ? "Sale updated" : "Sale recorded");
      close();
      router.refresh();

      const reload = await apiFetch("/api/sales");
      const reloadJson = await reload.json().catch(() => ({}));
      if (reload.ok) setSales(reloadJson.sales || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save sale record.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: SaleRow) => {
    const ok = confirm("Delete this sale record? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await apiFetch(`/api/sales/${s.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete.");
      toast.success("Deleted");
      setSales((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete.");
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <Handshake className="w-8 h-8 text-primary" />
            Sales Buyer Record
          </h1>
          <p className="text-slate-500 mt-2 font-medium max-w-2xl">
            Record buyer details, quantities sold, destination, and payment status per batch.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl font-bold h-12 px-6 shadow-xl shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          New sale
        </Button>
      </div>

      <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-black tracking-tight">Search</CardTitle>
          <CardDescription className="font-medium">Search by batch ID, farmer, buyer, or destination.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sales..." className="pl-12 h-11 rounded-xl bg-white border-slate-200 font-medium" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((s) => (
          <Card key={s.id} className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-xl font-black tracking-tight truncate">
                    <Link href={buildInternalOrgTracePath(orgSlug, s.batch.batchId)} className="hover:underline">
                      {s.batch.batchId}
                    </Link>
                    <span className="text-slate-400"> · {s.buyerName}</span>
                  </CardTitle>
                  <p className="text-slate-500 mt-1 font-medium">{s.batch.farmer.fullName}</p>
                  <p className="text-xs text-slate-400 font-bold mt-2">
                    Sold {format(new Date(s.dateSold), "MMM d, yyyy")}
                    {s.destination ? ` · ${s.destination}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="outline" className="rounded-xl border-slate-200" onClick={() => openEdit(s)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" className="rounded-xl border-slate-200" onClick={() => void remove(s)}>
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {s.buyerType ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-slate-50 border-slate-200 text-slate-700">
                    {s.buyerType}
                  </Badge>
                ) : null}
                {s.quantitySold !== null && s.quantitySold !== undefined ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-emerald-50 border-emerald-100 text-emerald-700">
                    Qty: {Number(s.quantitySold).toFixed(2)}
                  </Badge>
                ) : null}
                {s.paymentStatus ? (
                  <Badge variant="outline" className="rounded-full text-[10px] font-black bg-blue-50 border-blue-100 text-blue-700">
                    {s.paymentStatus}
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[920px] rounded-[2.5rem] p-0 border-0 shadow-2xl overflow-hidden">
          <div className="flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-4 sm:p-8 sm:pb-6 bg-slate-50/50 border-b border-slate-100">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight">
                {edit ? "Edit Sale" : "Create Sale"}
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-sm font-medium text-muted-foreground">
                Record a buyer transaction tied to a traceable batch.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Batch *</Label>
                  <Select value={form.batchId} onValueChange={(v) => setForm((p) => ({ ...p, batchId: v }))} disabled={!!edit}>
                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Select a batch..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {batchOptions.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="rounded-xl font-medium">
                          {batchLabel(b)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Buyer name *</Label>
                  <Input value={form.buyerName} onChange={(e) => setForm((p) => ({ ...p, buyerName: e.target.value }))} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Buyer type</Label>
                  <Select value={form.buyerType} onValueChange={(v) => setForm((p) => ({ ...p, buyerType: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Buyer type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                      {BUYER_TYPES.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-xl font-medium">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Date sold *</Label>
                  <Input type="date" value={form.dateSold} onChange={(e) => setForm((p) => ({ ...p, dateSold: e.target.value }))} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Quantity sold</Label>
                  <Input type="number" step="0.01" value={form.quantitySold} onChange={(e) => setForm((p) => ({ ...p, quantitySold: e.target.value }))} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Price per unit</Label>
                  <Input type="number" step="0.01" value={form.pricePerUnit} onChange={(e) => setForm((p) => ({ ...p, pricePerUnit: e.target.value }))} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Total value</Label>
                  <Input type="number" step="0.01" value={form.totalValue} onChange={(e) => setForm((p) => ({ ...p, totalValue: e.target.value }))} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Destination</Label>
                  <Input value={form.destination} onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value }))} className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold" />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Payment status</Label>
                  <Select value={form.paymentStatus} onValueChange={(v) => setForm((p) => ({ ...p, paymentStatus: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold">
                      <SelectValue placeholder="Payment status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl">
                      {PAYMENT_STATUSES.map((t) => (
                        <SelectItem key={t} value={t} className="rounded-xl font-medium">
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  "Create Sale"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
